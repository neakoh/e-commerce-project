const AWS = require('aws-sdk');
const db = require('../config/db');
const secretsManager = new AWS.SecretsManager();
let stripe;
let stripeSecrets;

class StripeService {
    constructor() {
        this.initializeStripe();
    }

    async initializeStripe() {
        try {
            // Get Stripe secrets from Secrets Manager
            const secretResponse = await secretsManager.getSecretValue({
                SecretId: process.env.STRIPE_SECRET_ARN
            }).promise();

            stripeSecrets = JSON.parse(secretResponse.SecretString);
            stripe = require('stripe')(stripeSecrets.STRIPE_SK);
        } catch (error) {
            console.error('Error initializing Stripe with secrets:', error);
            throw error;
        }
    }

    determineStatus(eventType) {
        const statusMap = {
            'payment_intent.created': 'pending',
            'payment_intent.succeeded': 'succeeded',
            'payment_intent.payment_failed': 'failed',
            'charge.failed': 'failed',
            'charge.succeeded': 'succeeded',
            'charge.updated': 'processing'
        };
        return statusMap[eventType] || 'processing';
    }

    async createPaymentIntent(amount, metadata = {}) {
        if (!amount || amount <= 0 || typeof amount !== 'number') {
            throw new Error('Invalid amount provided');
        }
        try {
            const paymentIntent = await stripe.paymentIntents.create({
                amount: Math.round(amount * 100),
                currency: 'gbp',
                metadata,
                description: `Order for amount: ${amount} GBP`,
                automatic_payment_methods: {
                    enabled: true,
                    allow_redirects: 'never'
                }
            });
            
            return {
                clientSecret: paymentIntent.client_secret,
                amount: paymentIntent.amount
            };
        } catch (error) {
            console.error('Error in stripeService.createPaymentIntent:', error);
            throw new Error('Failed to create payment intent');
        }
    }

    async createCheckoutSession(lineItems, userID, origin, metadata, delivery, shipping_options = [], promotions) {
        if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
            throw new Error('Invalid items array');
        }

        try {
            // Get user's email from database
            const client = await db.connect();
            try {
                const userResult = await client.query(
                    'SELECT email FROM users WHERE id = $1',
                    [userID]
                );
                
                if (userResult.rows.length === 0) {
                    throw new Error('User not found');
                }

                const userEmail = userResult.rows[0].email;

                const session = await stripe.checkout.sessions.create({
                    payment_method_types: ['card'],
                    line_items: lineItems,
                    mode: 'payment',
                    success_url: `${origin}/#/?clearCart=true&openSuccess=true&session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${origin}/#/cart`,
                    shipping_address_collection: delivery === 'collection' ? undefined : {
                        allowed_countries: ['GB']
                    },
                    shipping_options,
                    metadata: {
                        ...metadata,
                        delivery_type: delivery
                    },
                    customer_email: userEmail,
                    phone_number_collection: {
                        enabled: true
                    },
                    discounts:
                        promotions.discountCode !== null ? [{
                            coupon: promotions.discountCode // Use the discount code from promotions
                        }] : undefined
                });
                
                return session;
            } finally {
                client.release();
            }
        } catch (error) {
            console.error('Error creating checkout session:', error);
            throw error;
        }
    }

    async retrieveSession(sessionId) {
        try {
            await this.ensureStripeInitialized();
            return await stripe.checkout.sessions.retrieve(sessionId);
        } catch (error) {
            console.error('Error retrieving session:', error);
            throw new Error('Failed to retrieve session');
        }
    }

    async retrieveLineItems(sessionId) {
        try {
            await this.ensureStripeInitialized();
            return await stripe.checkout.sessions.listLineItems(sessionId);
        } catch (error) {
            console.error('Error retrieving line items:', error);
            throw error;
        }
    }

    async handleWebhookEvent(payload, signature) {
        try {
            await this.ensureStripeInitialized();
            const event = stripe.webhooks.constructEvent(
                payload, 
                signature, 
                stripeSecrets.STRIPE_WH_SECRET
            );
            if (event.type === 'checkout.session.completed') {
                const session = event.data.object
                const userID = session.metadata.userID;
                const orderID = session.metadata.orderID
                const delivery_type = session.metadata.delivery_type;

                const response = {
                    status: 'succeeded',
                    userID: userID,
                    name:session.customer_details.name,
                    phone: session.customer_details.phone,
                    email: session.customer_email,
                    orderID: orderID,
                    totalPrice: session.amount_total / 100,
                    paymentID: session.payment_intent,
                    delivery_type: delivery_type
                };

                if (session.shipping && delivery_type !== 'collection') {
                    const shipping = session.shipping;
                    const customer = session.customer_details;
                    const name = customer?.name?.split(' ') || ['', ''];
                    
                    response.shipping = {
                        first_name: name[0] || '',
                        last_name: name.slice(1).join(' ') || '',
                        address_line1: shipping.address.line1,
                        address_line2: shipping.address.line2 || null,
                        city: shipping.address.city,
                        county: shipping.address.state || null,
                        postal_code: shipping.address.postal_code,
                        phone_number: customer?.phone || null,
                        email: customer?.email
                    };
                }

                return response;
            }
            
            return {
                status: event.type
            };
        } catch (error) {
            console.error('Error constructing webhook event:', error);
            throw error;
        }
    }

    async handleCheckoutSessionCompleted(session) {
        try {
            const userID = session.metadata?.userID;
            const itemsStr = session.metadata?.items;

            if (!userID || !itemsStr) {
                return {
                    status: 'error',
                    warning: 'Missing metadata',
                    sessionId: session.id
                };
            }

            let items;
            try {
                items = JSON.parse(itemsStr);
                // Format items to match what orderService expects
                items = items.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: parseFloat(item.price)
                }));
            } catch (error) {
                console.error('Error parsing items from metadata:', error);
                return {
                    status: 'error',
                    error: 'Invalid items data',
                    sessionId: session.id
                };
            }

            // Return the data needed for order creation
            return {
                status: 'succeeded',
                userID: userID, // Keep as string, orderService will handle conversion
                items: items,
                totalPrice: session.amount_total / 100, // Convert from cents to pounds
                paymentIntentId: session.payment_intent
            };
        } catch (error) {
            console.error('Error handling checkout session completion:', error);
            return {
                status: 'error',
                error: 'Failed to process checkout session',
                sessionId: session.id
            };
        }
    }

    async handlePaymentIntentCreated(paymentIntent) {    
        try {
            await this.logPaymentEvent({
                type: 'payment_intent.created',
                paymentIntentId: paymentIntent.id,
                amount: paymentIntent.amount,
                metadata: paymentIntent.metadata || {},
                status: 'pending'
            });
    
            return {
                status: 'created',
                paymentIntentId: paymentIntent.id
            };
        } catch (error) {
            console.error('Error in handlePaymentIntentCreated:', error);
            return {
                status: 'created',
                paymentIntentId: paymentIntent.id,
                warning: 'Failed to log payment event'
            };
        }
    }

    async handleChargeSucceeded(charge) {
        try {
            const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
            await this.logPaymentEvent({
                type: 'charge.succeeded',
                chargeId: charge.id,
                paymentIntentId: charge.payment_intent,
                userId: paymentIntent.metadata?.userID,
                amount: charge.amount,
                metadata: paymentIntent.metadata || {},
                status: 'succeeded'
            });
            return { status: 'succeeded', chargeId: charge.id };
        } catch (error) {
            console.error('Error handling charge succeeded:', error);
            return { status: 'error', error: 'Failed to process successful charge' };
        }
    }

    async handleChargeUpdated(charge) {
        try {
            await this.logPaymentEvent({
                type: 'charge.updated',
                chargeId: charge.id,
                paymentIntentId: charge.payment_intent,
                amount: charge.amount,
                metadata: charge.metadata || {},
                status: 'processing'
            });
            return { status: 'updated', chargeId: charge.id };
        } catch (error) {
            console.error('Error handling charge update:', error);
            return { status: 'error', error: 'Failed to process charge update' };
        }
    }

    async handleChargeFailed(charge) {
        try {

            const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
            
            await this.logPaymentEvent({
                type: 'charge.failed',
                chargeId: charge.id,
                paymentIntentId: charge.payment_intent,
                userId: paymentIntent.metadata?.userID,
                amount: charge.amount,
                failureCode: charge.failure_code,
                failureMessage: charge.failure_message,
                metadata: paymentIntent.metadata || {},
                status: 'failed'
            });

            return {
                status: 'failed',
                error: this.getFailureMessage(charge.failure_code),
                paymentIntentId: charge.payment_intent
            };
        } catch (error) {
            console.error('Error handling charge failed:', error);
            return {
                status: 'failed',
                error: 'Payment processing failed'
            };
        }
    }

    async handlePaymentIntentSucceeded(paymentIntent) {
        try {
            // Extract userID from metadata
            const userID = paymentIntent.metadata?.userID;
            const itemsStr = paymentIntent.metadata?.items;
            
            if (!userID || !itemsStr) {
                return {
                    status: 'succeeded',
                    warning: 'Missing metadata',
                    paymentIntentId: paymentIntent.id
                };
            }

            let parsedItems;
            try {
                parsedItems = JSON.parse(itemsStr);
            } catch (error) {
                console.error('Error parsing items:', error);
                parsedItems = [];
            }

            const totalPrice = paymentIntent.amount / 100;
            
            // Log payment event
            await this.logPaymentEvent({
                type: 'payment_intent.succeeded',
                paymentIntentId: paymentIntent.id,
                userId: userID,
                amount: paymentIntent.amount,
                metadata: paymentIntent.metadata,
                status: 'succeeded'
            });

            // Return clean data for order creation
            return {
                status: 'succeeded',
                userID: userID,
                items: parsedItems,
                totalPrice,
                paymentIntentId: paymentIntent.id
            };
        } catch (error) {
            console.error('Error handling payment intent:', error);
            return {
                status: 'error',
                error: 'Failed to process payment'
            };
        }
    }

    async handlePaymentIntentFailed(paymentIntent) {
        try {
            await this.logPaymentEvent({
                paymentIntentId: paymentIntent.id,
                type: 'payment_intent.payment_failed',
                status: 'failed',
                amount: paymentIntent.amount,
                userId: paymentIntent.metadata.userId,
                failureCode: paymentIntent.last_payment_error?.code,
                failureMessage: this.getFailureMessage(paymentIntent.last_payment_error?.code)
            });
        } catch (error) {
            console.error('Error handling payment intent failed:', error);
            throw error;
        }
    }

    async createRefund(paymentIntentId, metadata = {}) {
        try {
            await this.ensureStripeInitialized();
            const refund = await stripe.refunds.create({
                payment_intent: paymentIntentId,
                reason: 'requested_by_customer',
                metadata
            });

            return refund;
        } catch (error) {
            console.error('Error creating refund:', error);
            throw new Error('Failed to process refund');
        }
    }

    async logPaymentEvent(eventData) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');
            
            const query = `
                INSERT INTO payment_logs (
                    payment_intent_id, charge_id, user_id, amount, 
                    status, event_type, failure_code, failure_message, metadata
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (payment_intent_id) 
                DO UPDATE SET
                    status = EXCLUDED.status,
                    event_type = EXCLUDED.event_type,
                    failure_code = EXCLUDED.failure_code,
                    failure_message = EXCLUDED.failure_message,
                    updated_at = NOW()
                RETURNING id;
            `;

            const values = [
                eventData.paymentIntentId || null,
                eventData.chargeId || null,
                eventData.userId || null,
                eventData.amount || 0,
                eventData.status || this.determineStatus(eventData.type),
                eventData.type,
                eventData.failureCode || null,
                eventData.failureMessage || null,
                eventData.metadata ? JSON.stringify(eventData.metadata) : '{}'
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error logging payment event:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    getFailureMessage(failureCode) {
        const errorMessages = {
            card_declined: 'Your card was declined.',
            expired_card: 'Your card has expired.',
            incorrect_cvc: 'The card\'s security code is incorrect.',
            insufficient_funds: 'Insufficient funds.',
            invalid_expiry_year: 'The card\'s expiration year is invalid.',
            invalid_expiry_month: 'The card\'s expiration month is invalid.',
            invalid_number: 'The card number is invalid.',
            processing_error: 'An error occurred while processing your card.',
            incorrect_number: 'The card number is incorrect.',
            invalid_cvc: 'The card\'s security code is invalid.',
            card_not_supported: 'This card is not supported.',
            currency_not_supported: 'This currency is not supported.',
            duplicate_transaction: 'A duplicate transaction has been detected.',
            authentication_required: 'Authentication is required for this transaction.'
        };

        return errorMessages[failureCode] || 'An unexpected error occurred with your payment.';
    }

    // Helper method to ensure Stripe is initialized
    async ensureStripeInitialized() {
        if (!stripe) {
            await this.initializeStripe();
        }
    }
}

module.exports = new StripeService();