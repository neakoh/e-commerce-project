const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const errorHandler = require('./middleware/error');
const { generalLimiter } = require('./middleware/rateLimiters');
const { handleStripeWebhook } = require('./controllers/stripeController');
const { metricsMiddleware, register } = require('./config/prometheus');

// Route imports
const accountRoutes = require('./routes/account');
const brandRoutes = require('./routes/brands');
const categoryRoutes = require('./routes/categories');
const orderRoutes = require('./routes/orders');
const locationRoutes = require('./routes/items');
const stripeRoutes = require('./routes/stripe');

const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    // Bearer Token Auth implementation
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).send('Bearer token required');
    }

    const token = authHeader.split(' ')[1];

    // Check if token matches
    if (token !== process.env.BEARER_TOKEN) {
        return res.status(403).send('Invalid token');
    }

    try {
    res.set('Content-Type', register.contentType);
        const metrics = await register.metrics();
        res.end(metrics);
    } catch (err) {
        res.status(500).end(err);
    }
});

// Configure security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'", 'js.stripe.com'],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'api.stripe.com', 'api.yourapiurl.com'],
            frameSrc: ["'self'", 'js.stripe.com'],
            objectSrc: ["'none'"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configure CORS
app.use(cors({
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.post('/stripe/webhook', express.raw({ type: 'application/json' }), handleStripeWebhook);

// Body parser middleware
app.use(express.json({ limit: '10kb' })); // Limit payload size

// Routes
app.use('/stripe', stripeRoutes);
app.use('/account', accountRoutes);
app.use('/orders', orderRoutes);
app.use('/items', generalLimiter, locationRoutes);
app.use('/brands', generalLimiter, brandRoutes);
app.use('/categories', generalLimiter, categoryRoutes);

// Error handling
app.use(errorHandler);

app.use(
    helmet({
        frameguard: { action: 'sameorigin' }, // Allow iframes from the same origin
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    })
);

// Enable HSTS for HTTPS
app.use(
    helmet.hsts({
        maxAge: 60 * 60 * 24 * 365, // 1 year
        includeSubDomains: true,
        preload: true,
    })
);

module.exports = app;