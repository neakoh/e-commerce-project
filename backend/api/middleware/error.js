const errorHandler = (err, req, res, next) => {
    // Log error for internal tracking but don't expose details
    console.error(`Error ${err.status || 500}: ${err.message}\n`, err.stack);
    
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'error',
            message: 'Invalid input data',
            details: isProd ? undefined : err.message
        });
    }
    
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'error',
            message: 'Invalid authentication token'
        });
    }
    
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'error',
            message: 'Authentication token expired'
        });
    }

    // Generic error response
    res.status(err.status || 500).json({
        status: 'error',
        message: isProd ? 'An unexpected error occurred' : err.message,
        ...((!isProd && err.stack) && { stack: err.stack })
    });
};

module.exports = errorHandler;