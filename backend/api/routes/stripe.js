const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/authenticateUser');
const { stripeLimiter } = require('../middleware/rateLimiters');

const { 
    createPaymentIntent,
    createCheckoutSession,
    verifyPayment,
    getSessionDetails
} = require('../controllers/stripeController');
 
router.post('/create-payment-intent', stripeLimiter, authenticateToken,  createPaymentIntent);
router.post('/create-checkout-session', stripeLimiter, authenticateToken,  createCheckoutSession);
router.post('/verify-payment', stripeLimiter, authenticateToken, verifyPayment);
router.get('/session/:sessionId', stripeLimiter, authenticateToken, getSessionDetails);

module.exports = router;