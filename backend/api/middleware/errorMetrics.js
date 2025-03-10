const { metrics } = require('../config/prometheus');

const errorMetrics = (err, req, res, next) => {
    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = err.status || err.statusCode || 500;
    const errorType = err.type || err.name || 'UnknownError';

    metrics.apiErrorsTotal.inc({ 
        method,
        route,
        status_code: statusCode,
        error_type: errorType
    });

    if (route.startsWith('/stripe')) {
        metrics.stripeErrors.inc({ 
            error_type: errorType,
            status_code: statusCode,
            endpoint: route
        });
    }

    next(err);
};

module.exports = errorMetrics;
