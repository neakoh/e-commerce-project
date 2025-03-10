// controllers/stripeController.js
const stripeService = require('../services/stripeService');
const orderService = require('../services/orderService');
const accountService = require('../services/accountService');
const emailService = require('../services/emailService');
const { metrics } = require('../config/prometheus');

class StripeController {
    async createPaymentIntent(req, res) {
        const start = process.hrtime();
        try {
            const userID = req.user?.userID;
            const { items } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                metrics.stripeErrors.inc({ 
                    error_type: 'validation_error', 
                    status_code: 400,
                    endpoint: '/create-payment-intent'
                });
                return res.status(400).json({ 
                    error: 'Invalid items: must be a non-empty array'
                });
            }

            if (!userID) {
                metrics.stripeErrors.inc({ 
                    error_type: 'authentication_error', 
                    status_code: 401,
                    endpoint: '/create-payment-intent'
                });
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            const { totalPrice, validatedItems } = await orderService.calculateTotal(items);

            if (totalPrice <= 0) {
                metrics.stripeErrors.inc({ 
                    error_type: 'validation_error', 
                    status_code: 400,
                    endpoint: '/create-payment-intent'
                });
                return res.status(400).json({
                    error: 'Total price must be greater than 0'
                });
            }

            // Stripe metadata values must be strings
            const metadata = {
                userID: userID.toString(),
                items: JSON.stringify(validatedItems)
            };

            const paymentIntent = await stripeService.createPaymentIntent(
                totalPrice,
                metadata
            );

            // Record successful transaction
            metrics.stripeTransactionStatus.inc({ 
                status: 'created', 
                type: 'payment_intent',
                currency: paymentIntent.currency
            });

            // Record request duration
            const [seconds, nanoseconds] = process.hrtime(start);
            metrics.stripeLatency.observe(
                { endpoint: '/create-payment-intent', status: 'success' },
                seconds + nanoseconds / 1e9
            );

            res.status(200).json(paymentIntent);
        } catch (error) {
            console.error('Error creating payment intent:', error);
            
            // Record error metrics
            metrics.stripeErrors.inc({ 
                error_type: error.type || 'unknown_error',
                status_code: error.statusCode || 500,
                endpoint: '/create-payment-intent'
            });

            // Record request duration even for errors
            const [seconds, nanoseconds] = process.hrtime(start);
            metrics.stripeLatency.observe(
                { endpoint: '/create-payment-intent', status: 'error' },
                seconds + nanoseconds / 1e9
            );
            
            if (error.type === 'StripeCardError') {
                return res.status(402).json({ error: error.message });
            }
            
            if (error.type === 'StripeInvalidRequestError') {
                return res.status(400).json({ error: error.message });
            }

            res.status(500).json({ error: 'Internal server error' });
        }
    }
    
    async createCheckoutSession(req, res) {
        try {
            const userID = req.user?.userID;
            const { items, delivery } = req.body;

            if (!items || !Array.isArray(items) || items.length === 0) {
                return res.status(400).json({ 
                    error: 'Invalid items: must be a non-empty array'
                });
            }
            if (!userID) {
                return res.status(401).json({
                    error: 'Authentication required'
                });
            }

            const { originalTotalPrice, finalTotalPrice, discountValue, validatedItems, promotions } = await orderService.calculateTotal(items);
            if (finalTotalPrice <= 0) {
                return res.status(400).json({
                    error: 'Total price must be greater than 0'
                });
            }
            const lineItems = validatedItems.map(item => {
                const productName = item.isOption 
                    ? `${item.originalName} - ${item.name}`  // Show both parent and option name
                    : item.name;

                return {
                    price_data: {
                        currency: 'gbp',
                        product_data: {
                            name: productName,
                            images: [item.image],
                            metadata: {
                                itemId: item.id.toString(),
                                optionId: item.optionId?.toString(),
                                brand: item.brand_name
                            }
                        },
                        unit_amount: Math.round(parseFloat(item.price) * 100),
                    },
                    quantity: item.quantity,
                };
            });

            // Create shipping options based on delivery type
            const shipping_options = delivery === 'delivery' ? [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: {
                            amount: (3.50 * 100),
                            currency: 'gbp',
                        },
                        display_name: 'Standard UK Delivery',
                        delivery_estimate: {
                            minimum: {
                                unit: 'business_day',
                                value: 3,
                            },
                            maximum: {
                                unit: 'business_day',
                                value: 5,
                            },
                        },
                    },
                },
            ] : [
                {
                    shipping_rate_data: {
                        type: 'fixed_amount',
                        fixed_amount: {
                            amount: 0,
                            currency: 'gbp',
                        },
                        display_name: 'Collection in Store',
                        delivery_estimate: {
                            minimum: {
                                unit: 'business_day',
                                value: 1,
                            },
                            maximum: {
                                unit: 'business_day',
                                value: 2,
                            },
                        },
                    },
                },
            ];
            // Add metadata about delivery
            const metadata = {
                userID: userID.toString(),
                delivery_type: delivery,
                delivery_cost: delivery == 'delivery' ? "3.50" : "0.00"
            };
            // Create the order first with status 'pending'
            const orderData = {
                userID,
                items: validatedItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price,
                    image_url: item.image,
                    name: item.name,    
                    ...(item.isOption && {
                        isOption: true,
                        optionId: item.optionId,
                        originalName: item.originalName
                    })
                })),
                original_total: originalTotalPrice,
                final_total: finalTotalPrice + (delivery == 'delivery' ? 3.50 : 0),
                discount_value: discountValue,
                delivery_option: delivery,
                status: 'pending',
                promotions: promotions
            };
            const order = await orderService.createOrder(orderData);
            metadata.orderID = order.orderId.toString();
            // Create checkout session with shipping options
            const session = await stripeService.createCheckoutSession(
                lineItems,
                userID,
                req.headers.origin || 'http://localhost:3000',
                metadata,
                delivery,
                shipping_options,
                promotions,
                delivery
            );

            res.status(200).json(session);
        } catch (error) {
            console.error('Error creating checkout session:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
  
    async handleStripeWebhook(req, res) {
        try {
            const signature = req.headers['stripe-signature'];
            if (!signature) {
                return res.status(400).json({ error: 'Missing stripe-signature header' });
            }

            const payload = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
            
            const result = await stripeService.handleWebhookEvent(
                payload,
                signature,
            );
    
            if (result?.status === 'succeeded') {
                try {
                    const orderID = result.orderID;
                    const userID = result.userID;
                    const shipping = result.shipping
                    const payment_id = result.paymentID
                    const email = result.email
                    const name = result.name
                    const phone = result.phone

                    const items = await orderService.getOrderById(userID, orderID)
                    const item_info = items.items

                    if (!orderID) {
                        console.error('No order ID found in metadata');
                        return res.status(200).json({ received: true });
                    }

                    await orderService.updateOrderStatus(orderID, 'paid', payment_id);
                    await orderService.updateStockQuantity(orderID)

                    if(shipping || phone){
                        await accountService.updateUserInfo(userID, shipping, phone); 
                    }


                    let order = {
                        orderID: orderID,
                        shipping: shipping? shipping : null,
                        delivery_type: shipping? 'delivery' : 'collection',
                        item_info: item_info,
                        original_total: items.original_total,
                        final_total: items.final_total,
                        free_mug: items.free_mug,
                        free_magnet: items.free_magnet,
                        discount_value: items.discount_value,
                        name: name, 
                        phone: phone,
                        email: email
                    }
                    if(email) {
                        await emailService.sendOrderConfirmation(order, email);
                    }

                    return res.status(200).json({ received: true });
                } catch (orderError) {
                    console.error('Error updating order status:', orderError);
                }
            } else {
                //console.log('Skipping order update for event type:', result?.status);
            }

            res.status(200).json({ received: true });
        } catch (error) {
            console.error('Error processing webhook:', error);
            res.status(500).json({ error: 'Webhook processing failed' });
        }
    }

    async verifyPayment(req, res) {
        try {
            const { sessionId } = req.body;
            const userID = req.user?.userID;

            if (!sessionId) {
                return res.status(400).json({ error: 'Session ID is required' });
            }

            if (!userID) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const session = await stripeService.retrieveSession(sessionId);
            
            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }

            // Verify that this session belongs to the user
            if (session.metadata.userID !== userID.toString()) {
                return res.status(403).json({ error: 'Unauthorized' });
            }

            if (session.payment_status !== 'paid') {
                return res.status(400).json({ error: 'Payment not completed' });
            }

            res.status(200).json({ success: true });
        } catch (error) {
            console.error('Error verifying payment:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async getSessionDetails(req, res) {
        try {
            const { sessionId } = req.params;
            const session = await stripeService.retrieveSession(sessionId);

            if (!session) {
                return res.status(404).json({ error: 'Session not found' });
            }
            const orderID = session.metadata?.orderID;
            if (!orderID) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.status(200).json({ orderID });
        } catch (error) {
            console.error('Error retrieving session details:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new StripeController();