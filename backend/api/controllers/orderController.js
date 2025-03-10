const orderService = require('../services/orderService');
const emailService = require('../services/emailService');

class OrderController {
    async createOrder(req, res, next) {
        const id = req.user.userID
        const { items } = req.body

        try {
            const response = await orderService.createOrder(id, items);
            res.status(201).json(response);

        } catch (error) {
            next(error);
        }
    }

    async getAll(req, res, next) {
        const id = req.user.userID
        try {
            const response = await orderService.getAll(id);
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }
    async getAllAdmin(req, res, next) {
        try {
            // Check admin access
            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Access denied: Admin privileges required' });
            }

            const response = await orderService.getAllAdmin();
            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    }

    async cancelOrder(req, res, next) {
        const userID = req.user.userID;
        const { orderID } = req.params;

        try {
            const response = await orderService.cancelOrder(userID, orderID);
            res.status(200).json(response);
        } catch (error) {
            if (error.message === 'Cannot cancel processed orders') {
                res.status(400).json({ error: error.message });
            } else if (error.message === 'Order not found or does not belong to user') {
                res.status(404).json({ error: error.message });
            } else {
                next(error);
            }
        }
    }

    async getOrderById(req, res) {
        try {
            const userID = req.user?.userID;
            const { id } = req.params;

            if (!userID) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            const order = await orderService.getOrderById(userID, id, req.user.isAdmin);
            
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.status(200).json(order);
        } catch (error) {
            console.error('Error getting order by ID:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    async updateOrderStatus(req, res) {
        try {
            // Check admin access
            if (!req.user.isAdmin) {
                return res.status(403).json({ message: 'Access denied: Admin privileges required' });
            }

            const { orderID } = req.params;

            const { status, delivery_date, items, contact_details } = req.body;

            // Validate status
            const validStatuses = ['pending', 'processed', 'cancelled'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            const order = await orderService.updateOrderStatus(orderID, status, null, delivery_date);
            
            if (!order) {
                return res.status(404).json({ error: 'Order not found' });
            }

            res.status(200).json({ message: 'Order status updated successfully' });

            let order_info = {
                orderID: orderID,
                delivery_date: req.body.delivery_date,
                delivery_option: req.body.delivery_option,
                delivery_address: req.body.delivery_address,
                contact_details: req.body.contact_details,
                original_total: req.body.original_total,
                final_total: req.body.final_total,
                free_mug: req.body.free_mug,
                free_magnet: req.body.free_magnet,
                discount_value: req.body.discount_value,
                items: items,
            }

            await emailService.sendOrderReady(order_info, contact_details.email);
        } catch (error) {
            console.error('Error updating order status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

module.exports = new OrderController();
