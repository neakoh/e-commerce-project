const db = require('../config/db');
const stripeService = require('./stripeService');

class OrderService {
    async calculateTotal(items) {
        let originalTotalPrice = 0;
        let validatedItems = [];
        try {
            const regularItems = items.filter(item => !item.isOption);
            const optionItems = items.filter(item => item.isOption);
            if (regularItems.length > 0) {
                const regularItemIds = regularItems.map(item => item.id);
                const regularItemsQuery = `
                    SELECT i.id, i.name, i.price, i.quantity AS stock, b.name AS brand_name
                    FROM items i
                    LEFT JOIN brands b ON i.brandID = b.id
                    WHERE i.id = ANY($1)
                `;
                const regularItemsResult = await db.query(regularItemsQuery, [regularItemIds]);
                const regularItemDetails = regularItemsResult.rows;

                // Validate regular items
                for (const item of regularItems) {
                    const itemDetail = regularItemDetails.find(detail => detail.id === item.id);
                    if (!itemDetail) {
                        throw new Error(`Item not found: ${item.id}`);
                    }
                    if (itemDetail.stock < item.quantity) {
                        throw new Error(`Insufficient stock for item: ${itemDetail.name}`);
                    }
                    originalTotalPrice += parseFloat(itemDetail.price) * item.quantity;
                    validatedItems.push({
                        ...itemDetail,
                        quantity: item.quantity,
                        image: item.image
                    });
                }
            }

            // Handle items with options
            if (optionItems.length > 0) {
                const optionItemIds = optionItems.map(item => item.id);
                const optionsQuery = `
                    SELECT i.id, i.name, i.options, i.quantity AS stock, b.name AS brand_name
                    FROM items i
                    LEFT JOIN brands b ON i.brandID = b.id
                    WHERE i.id = ANY($1)
                `;
                const optionsResult = await db.query(optionsQuery, [optionItemIds]);
                const optionItemDetails = optionsResult.rows;
                
                // Validate items with options
                for (const item of optionItems) {
                    const itemDetail = optionItemDetails.find(detail => detail.id === item.id);
                    if (!itemDetail) {
                        throw new Error(`Item not found: ${item.id}`);
                    }
                    // Find the specific option
                    const option = itemDetail.options.find(opt => 
                        parseInt(opt.id) === parseInt(item.optionId)
                    );
                    
                    if (!option) {
                        throw new Error(`Option not found for item: ${itemDetail.name}`);
                    }

                    if (option.quantity < item.quantity) {
                        throw new Error(`Insufficient stock for option: ${option.name} of ${itemDetail.name}`);
                    }

                    originalTotalPrice += parseFloat(option.price) * item.quantity;
                    validatedItems.push({
                        id: item.id,
                        name: option.name,
                        price: option.price,
                        quantity: item.quantity,
                        brand_name: itemDetail.brand_name,
                        image: item.image,
                        isOption: true,
                        optionId: option.id,
                        originalName: itemDetail.name
                    });
                }
            }

            let finalTotalPrice = 0
            let discountValue = 0
            let promotions = {
                freeMagnet: false,
                freeMug: false,
                discountCode: null
            }
            // Calculate promotions based on total price
            if (originalTotalPrice >= 10) {
                promotions.freeMagnet = true;
                finalTotalPrice = originalTotalPrice
            }
            if (originalTotalPrice >= 20) {
                promotions.freeMug = true;
                finalTotalPrice = originalTotalPrice
            }
            if (originalTotalPrice >= 80) {
                promotions.discountCode = '8asWnAja';
                discountValue = originalTotalPrice * 0.3
                finalTotalPrice = originalTotalPrice - discountValue
            } else if (originalTotalPrice >= 40) {
                promotions.discountCode = '3iicksWB';
                discountValue = originalTotalPrice * 0.2
                finalTotalPrice = originalTotalPrice - discountValue
            }
            else{
                finalTotalPrice = originalTotalPrice
            }
            return {
                originalTotalPrice,
                finalTotalPrice,
                discountValue,
                validatedItems,
                promotions
            };
        } catch (error) {
            console.error('Error in calculateTotal:', error);
            throw error;
        }
    }

    async createOrder({ userID, items, original_total, final_total, discount_value, delivery_option, status = 'unpaid', promotions }) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Create the order
            const orderQuery = `
                INSERT INTO orders (
                    user_id, 
                    original_total,
                    final_total,
                    discount_value, 
                    delivery_option, 
                    status,
                    free_mug,
                    free_magnet
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8) 
                RETURNING order_id
            `;
            const orderValues = [
                userID, 
                original_total, 
                final_total, 
                discount_value,
                delivery_option, 
                status,
                promotions.freeMug,
                promotions.freeMagnet
            ];
            const orderResult = await client.query(orderQuery, orderValues);
            const orderId = orderResult.rows[0].order_id;

            // Create order items
            const orderItemsQuery = `
                INSERT INTO order_items (
                    order_id, 
                    item_id, 
                    quantity, 
                    price,
                    option_id,
                    image_url
                ) 
                VALUES ($1, $2, $3, $4, $5, $6)
            `;

            for (const item of items) {
                const orderItemValues = [
                    orderId,
                    item.id,
                    item.quantity,
                    item.price,
                    item.optionId || null,
                    item.image_url
                ];
                await client.query(orderItemsQuery, orderItemValues);
            }

            await client.query('COMMIT');

            return {
                orderId,
                original_total,
                final_total,
                discount_value,
                promotions,
                items: items
            };
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in createOrder:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async updateStockQuantity(orderID) {
        const client = await db.connect();

        try {
            // Get items for this order with their options
            const itemsResult = await client.query(
                'SELECT oi.*, i.options FROM order_items oi JOIN items i ON oi.item_id = i.id WHERE oi.order_id = $1',
                [orderID]
            );
            

            for (const item of itemsResult.rows) {
                if (item.options) {
                    
                    // Find the specific option
                    const optionsArray = Array.isArray(item.options) ? item.options : JSON.parse(item.options);
                    const option = optionsArray.find(opt => 
                        parseInt(opt.id) === parseInt(item.option_id)
                    );

                    if (!option) {
                        console.error(`No matching option found for item ${item.item_id} with option_id ${item.option_id}`);
                        continue;
                    }

                    
                    // Update the specific option's quantity using jsonb_agg
                    const updateOptionQuery = `
                        UPDATE items
                        SET options = (
                            SELECT jsonb_agg(
                                CASE 
                                    WHEN (opt->>'id')::int = $2
                                    THEN jsonb_set(opt, '{quantity}', ($3::text)::jsonb)
                                    ELSE opt 
                                END
                            )
                            FROM jsonb_array_elements(options) opt
                        )
                        WHERE id = $1
                        RETURNING options;
                    `;
                    
                    const newQuantity = parseInt(option.quantity) - parseInt(item.quantity);

                    try {
                        const result = await client.query(updateOptionQuery, [
                            item.item_id,
                            item.option_id,
                            newQuantity.toString()
                        ]);
                        
                        if (!result.rows[0]) {
                            console.error(`Failed to update options for item ${item.item_id}`);
                            continue;
                        }
                        
                    } catch (err) {
                        console.error(`Error updating options for item ${item.item_id}:`, err);
                        throw err;
                    }
                } else {
                    // Update regular item quantity
                    const updateItemQuery = `
                        UPDATE items 
                        SET quantity = quantity - $1
                        WHERE id = $2
                        RETURNING quantity as new_stock
                    `;
                    
                    const stockResult = await client.query(updateItemQuery, [
                        item.quantity,
                        item.item_id
                    ]);
                }
            }
        } catch (error) {
            console.error('Error updating stock quantities:', error);
            throw error;
        } finally {
            client.release();
        }
    }


    async updateOrderStatus(orderID, status, paymentID = null, deliveryDate = null) {
        const client = await db.connect();
        try {
            const query = `
                UPDATE orders 
                SET status = $1,
                    stripe_payment_id = $2,
                    delivery_date = $3
                WHERE order_id = $4
                RETURNING order_id
            `;
            const result = await client.query(query, [status, paymentID, deliveryDate, orderID]);
            return result.rows[0]?.order_id;
        } catch (error) {
            console.error('Error updating order status:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async saveDeliveryAddress(addressData) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            const query = `
                INSERT INTO delivery_addresses (
                    order_id,
                    first_name,
                    last_name,
                    address_line1,
                    address_line2,
                    city,
                    county,
                    postal_code,
                    phone_number,
                    email
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                RETURNING id
            `;

            const values = [
                addressData.order_id,
                addressData.first_name,
                addressData.last_name,
                addressData.address_line1,
                addressData.address_line2,
                addressData.city,
                addressData.county,
                addressData.postal_code,
                addressData.phone_number,
                addressData.email
            ];

            const result = await client.query(query, values);
            await client.query('COMMIT');
            return result.rows[0].id;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error saving delivery address:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async getAll(id) {
        const query = `
            SELECT 
                o.order_id,
                o.status,
                o.order_date,
                o.delivery_option,
                o.original_total,
                o.final_total,
                o.discount_value,
                o.free_mug,
                o.free_magnet,
                o.user_id,
                oi.order_item_id,
                oi.item_id,
                oi.quantity,
                oi.price,
                oi.option_id,
                i.name AS item_name,
                i.options,
                b.name AS brand_name,
                c.name AS category_name,
                oi.image_url,
                u.firstname,
                u.lastname,
                u.email,
                u.address_line1,
                u.address_line2,
                u.city,
                u.county,
                u.postcode,
                u.phone_number
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN items i ON oi.item_id = i.id
            LEFT JOIN brands b ON i.brandID = b.id
            LEFT JOIN category c ON i.categoryID = c.id
            LEFT JOIN users u ON o.user_id = u.id
            WHERE o.user_id = $1
            ORDER BY o.order_date DESC;
        `;

        try {
            const result = await db.query(query, [id]);
            
            if (result.rows.length === 0) {
                return [];
            }

            // Group items by order_id
            const ordersMap = new Map();

            result.rows.forEach(row => {
                const orderId = row.order_id;
                
                if (!ordersMap.has(orderId)) {
                    // Create new order entry
                    ordersMap.set(orderId, {
                        order_id: row.order_id,
                        status: row.status,
                        order_date: row.order_date,
                        delivery_option: row.delivery_option,
                        original_total: row.original_total,
                        final_total: row.final_total,
                        free_mug: row.free_mug,
                        free_magnet: row.free_magnet,
                        discount_value: row.discount_value,
                        user_id: row.user_id,
                        firstname: row.firstname,
                        lastname: row.lastname,
                        email: row.email,
                        address_line1: row.address_line1,
                        address_line2: row.address_line2,
                        city: row.city,
                        county: row.county,
                        postcode: row.postcode,
                        phone_number: row.phone_number,
                        items: []
                    });
                }

                // Add item to order if it exists
                if (row.item_id) {
                    let item = {
                        order_item_id: row.order_item_id,
                        item_id: row.item_id,
                        item_name: row.item_name,
                        quantity: row.quantity,
                        price: row.price,
                        brand_name: row.brand_name,
                        category_name: row.category_name,
                        image_url: row.image_url
                    };

                    // Add option details if present
                    if (row.option_id && row.options) {
                        const options = Array.isArray(row.options) ? row.options : JSON.parse(row.options);
                        const matchingOption = options.find(opt => parseInt(opt.id) === parseInt(row.option_id));
                        if (matchingOption) {
                            item.option_name = matchingOption.name;
                            item.display_name = `${row.item_name} - ${matchingOption.name}`;
                        }
                    } else {
                        item.display_name = row.item_name;
                    }

                    ordersMap.get(orderId).items.push(item);
                }
            });

            // Convert map to array
            return Array.from(ordersMap.values());

        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to fetch orders');
        }
    }

    async getAllAdmin() {
        const query = `
            SELECT 
                o.order_id,
                o.status,
                o.order_date,
                o.delivery_option,
                o.original_total,
                o.final_total,
                o.discount_value,
                o.free_mug,
                o.free_magnet,
                o.user_id,
                oi.order_item_id,
                oi.item_id,
                oi.quantity,
                oi.price,
                oi.option_id,
                i.name AS item_name,
                i.options,
                b.name AS brand_name,
                c.name AS category_name,
                oi.image_url,
                u.firstname,
                u.lastname,
                u.email,
                u.address_line1,
                u.address_line2,
                u.city,
                u.county,
                u.postcode,
                u.phone_number
            FROM orders o
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN items i ON oi.item_id = i.id
            LEFT JOIN brands b ON i.brandID = b.id
            LEFT JOIN category c ON i.categoryID = c.id
            LEFT JOIN users u ON o.user_id = u.id
            ORDER BY o.order_date DESC;
        `;

        try {
            const result = await db.query(query);
            
            if (result.rows.length === 0) {
                return [];
            }

            // Group items by order_id
            const ordersMap = new Map();

            result.rows.forEach(row => {
                const orderId = row.order_id;
                
                if (!ordersMap.has(orderId)) {
                    // Create new order entry
                    ordersMap.set(orderId, {
                        order_id: row.order_id,
                        status: row.status,
                        order_date: row.order_date,
                        delivery_option: row.delivery_option,
                        original_total: row.original_total,
                        final_total: row.final_total,
                        free_mug: row.free_mug,
                        free_magnet: row.free_magnet,
                        discount_value: row.discount_value,
                        user_id: row.user_id,
                        firstname: row.firstname,
                        lastname: row.lastname,
                        email: row.email,
                        address_line1: row.address_line1,
                        address_line2: row.address_line2,
                        city: row.city,
                        county: row.county,
                        postcode: row.postcode,
                        phone_number: row.phone_number,
                        items: []
                    });
                }

                // Add item to order if it exists
                if (row.item_id) {
                    let item = {
                        order_item_id: row.order_item_id,
                        item_id: row.item_id,
                        item_name: row.item_name,
                        quantity: row.quantity,
                        price: row.price,
                        brand_name: row.brand_name,
                        category_name: row.category_name,
                        image_url: row.image_url
                    };

                    // Add option details if present
                    if (row.option_id && row.options) {
                        const options = Array.isArray(row.options) ? row.options : JSON.parse(row.options);
                        const matchingOption = options.find(opt => parseInt(opt.id) === parseInt(row.option_id));
                        if (matchingOption) {
                            item.option_name = matchingOption.name;
                            item.display_name = `${row.item_name} - ${matchingOption.name}`;
                        }
                    } else {
                        item.display_name = row.item_name;
                    }

                    ordersMap.get(orderId).items.push(item);
                }
            });

            // Convert map to array
            return Array.from(ordersMap.values());

        } catch (error) {
            console.error('Error fetching orders:', error);
            throw new Error('Failed to fetch orders');
        }
    }

    async getOrderById(userID, orderID, isAdmin) {
        const client = await db.connect();
        try {
            // Get the order details
            const orderQuery = `
                SELECT 
                    o.*,
                    u.email,
                    u.firstname,
                    u.lastname,
                    u.address_line1,
                    u.address_line2,
                    u.city,
                    u.postcode,
                    u.phone_number
                FROM orders o
                JOIN users u ON o.user_id = u.id
                LEFT JOIN delivery_addresses da ON o.order_id = da.order_id
                WHERE o.order_id = $1
                ${!isAdmin ? 'AND o.user_id = $2' : ''}
            `;

            const queryParams = !isAdmin ? [orderID, userID] : [orderID];
            const orderResult = await client.query(orderQuery, queryParams);
            
            if (orderResult.rows.length === 0) {
                return null;
            }

            // Get the order items with their details
            const itemsQuery = `
                SELECT 
                    oi.*,
                    i.name AS item_name,
                    i.options,
                    i.quantity AS stock_quantity,
                    b.name AS brand_name,
                    c.name AS category_name
                FROM order_items oi
                JOIN items i ON oi.item_id = i.id
                LEFT JOIN brands b ON i.brandID = b.id
                LEFT JOIN category c ON i.categoryID = c.id
                WHERE oi.order_id = $1
            `;

            const itemsResult = await client.query(itemsQuery, [orderID]);
            
            // Process items to include option names
            const items = itemsResult.rows.map(item => {
                let processedItem = { ...item };
                
                if (item.option_id && item.options) {
                    const options = Array.isArray(item.options) ? item.options : JSON.parse(item.options);
                    const matchingOption = options.find(opt => parseInt(opt.id) === parseInt(item.option_id));
                    if (matchingOption) {
                        processedItem.option_name = matchingOption.name;
                        processedItem.display_name = `${item.item_name} - ${matchingOption.name}`;
                    }
                } else {
                    processedItem.display_name = item.item_name;
                }
                
                return processedItem;
            });

            // Get delivery address if it exists
            const deliveryQuery = `
                SELECT *
                FROM delivery_addresses
                WHERE order_id = $1
            `;

            const deliveryResult = await client.query(deliveryQuery, [orderID]);

            const order = {
                ...orderResult.rows[0],
                items: items,
                delivery_address: deliveryResult.rows[0] || null
            };

            return order;

        } catch (error) {
            console.error('Error fetching order:', error);
            throw error;
        } finally {
            client.release();
        }
    }

    async cancelOrder(userID, orderID) {
        const client = await db.connect();
        try {
            await client.query('BEGIN');

            // Check if order exists and belongs to user
            const orderQuery = `
                SELECT o.*, oi.item_id, oi.quantity
                FROM orders o
                LEFT JOIN order_items oi ON o.order_id = oi.order_id
                WHERE o.order_id = $1 AND o.user_id = $2
            `;
            const orderResult = await client.query(orderQuery, [orderID, userID]);
            
            if (orderResult.rows.length === 0) {
                throw new Error('Order not found or does not belong to user');
            }

            const order = orderResult.rows[0];
            
            // Check if order can be cancelled (not processed)
            if (order.order_status === 'processed') {
                throw new Error('Cannot cancel processed orders');
            }

            if (order.order_status === 'cancelled') {
                throw new Error('Order is already cancelled');
            }

            // Process refund through Stripe
            if (order.stripe_payment_id) {
                try {
                    const refund = await stripeService.createRefund(
                        order.stripe_payment_id,
                        { orderId: orderID }
                    );
                    
                    // Store refund ID in database
                    const updateRefundQuery = `
                        UPDATE orders 
                        SET stripe_refund_id = $1
                        WHERE order_id = $2
                    `;
                    await client.query(updateRefundQuery, [refund.id, orderID]);

                    // Log the refund event
                    await stripeService.logPaymentEvent({
                        paymentIntentId: order.stripe_payment_id,
                        type: 'refund.created',
                        status: 'succeeded',
                        amount: order.total_price,
                        userId: userID,
                        metadata: { orderId: orderID, refundId: refund.id }
                    });
                } catch (stripeError) {
                    console.error('Stripe refund error:', stripeError);
                    throw new Error('Failed to process refund. Please contact support.');
                }
            }

            // Update order status to cancelled
            const updateOrderQuery = `
                UPDATE orders 
                SET status = 'cancelled'
                WHERE order_id = $1
                RETURNING *
            `;
            await client.query(updateOrderQuery, [orderID]);

            // Restore stock quantities
            const updateStockQuery = `
                UPDATE items 
                SET quantity = quantity + $1
                WHERE id = $2
            `;

            // Group items by item_id and sum quantities
            const itemQuantities = orderResult.rows.reduce((acc, row) => {
                if (row.item_id) {
                    acc.push({
                        item_id: row.item_id,
                        quantity: row.quantity
                    });
                }
                return acc;
            }, []);

            // Update stock for each item
            for (const item of itemQuantities) {
                await client.query(updateStockQuery, [
                    item.quantity,
                    item.item_id
                ]);
            }

            await client.query('COMMIT');
            return { 
                message: 'Order cancelled successfully',
                refundProcessed: !!order.stripe_payment_id
            };

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error in OrderService.cancelOrder:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new OrderService();