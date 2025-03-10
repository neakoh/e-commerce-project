const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/orderController');
const authenticateToken = require('../middleware/authenticateUser');

const { 
    orderLimiter
} = require('../middleware/rateLimiters');

router.post('/', authenticateToken, orderLimiter, OrderController.createOrder);
router.get('/all', authenticateToken, orderLimiter, OrderController.getAllAdmin);
router.get('/', authenticateToken, orderLimiter, OrderController.getAll);
router.get('/:id', authenticateToken, orderLimiter, OrderController.getOrderById);
router.post('/:orderID/cancel', authenticateToken, orderLimiter, OrderController.cancelOrder);
router.post('/:orderID/status', authenticateToken, orderLimiter, OrderController.updateOrderStatus);

module.exports = router;