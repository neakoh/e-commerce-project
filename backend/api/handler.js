const serverless = require('serverless-http');
const app = require('./index');
const { metrics } = require('./config/prometheus');

const ALLOWED_ORIGINS = [
    'https://wmsaddlers.com',
    'https://api.stripe.com'
];

let isWarm = false;

const handler = serverless(app, {
    request: (request, event, context) => {
        if (!isWarm) {
            metrics.lambdaColdStarts.inc();
            isWarm = true;
        }
        metrics.lambdaMemoryUsage.set(process.memoryUsage().heapUsed);
        request.context = context;
        request.event = event;
    },
    response: (response, event) => {
        const origin = event.headers?.origin || event.headers?.Origin;

        // For metrics endpoint
        if (event.rawPath === '/metrics') {
            response.headers = {
                ...response.headers,
                'Content-Type': 'text/plain',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type,Authorization'
            };
            return response;
        }

        // For webhook endpoint - no CORS needed
        if (event.rawPath === '/stripe/webhook') {
            return response;  // Return response as-is for webhooks
        }

        // For all other endpoints
        response.headers = {
            ...response.headers,
            'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
            'Access-Control-Allow-Credentials': true,
            'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type,Authorization'
        };
        return response;
    }
});

module.exports.handler = async (event, context) => {
    const sourceIp = event.headers['x-forwarded-for']?.split(',')[0].trim() || 
                    event.requestContext?.http?.sourceIp ||
                    event.requestContext?.identity?.sourceIp;
    
    const start = process.hrtime();
    const method = event.requestContext?.http?.method;
    const path = event.rawPath;

    try {
        // Handle OPTIONS requests
        if (method === 'OPTIONS') {
            if (path === '/metrics') {
                return {
                    statusCode: 204,
                    headers: {
                        'Access-Control-Allow-Origin': '*',
                        'Access-Control-Allow-Methods': 'GET,OPTIONS',
                        'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                        'Access-Control-Max-Age': '86400'
                    }
                };
            }
            return {
                statusCode: 204,
                headers: {
                    'Access-Control-Allow-Origin': ALLOWED_ORIGINS[0],
                    'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
                    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
                    'Access-Control-Max-Age': '86400'
                }
            };
        }

        // Handle metrics endpoint
        if (path === '/metrics') {
            if (!grafana_ips.includes(sourceIp)) {
                console.log(`Unauthorized IP attempting to access metrics: ${sourceIp}`);
                metrics.apiErrorsTotal.inc({ error_type: 'unauthorized_access', status_code: 403 });
                return {
                    statusCode: 403,
                    body: JSON.stringify({ message: 'Forbidden' })
                };
            }
        } 
        // For all endpoints except webhooks and metrics, check origin
        else if (path !== '/stripe/webhook') {
            const origin = event.headers?.origin || event.headers?.Origin;
            if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
                metrics.apiErrorsTotal.inc({ error_type: 'invalid_origin', status_code: 403 });
                return {
                    statusCode: 403,
                    body: JSON.stringify({ message: 'Forbidden' })
                };
            }
        }
        // Webhook endpoint doesn't need origin checking

        // Process the request
        const result = await handler(event, context);

        // Calculate response time
        const [seconds, nanoseconds] = process.hrtime(start);
        const duration = seconds + nanoseconds / 1e9;

        // Record metrics
        metrics.apiRequestsTotal.inc({ 
            method: method || 'unknown',
            route: path || 'unknown',
            status_code: result.statusCode
        });

        // Record response time with route information
        metrics.apiResponseTime.observe(
            {
                method: method || 'unknown',
                route: path || 'unknown',
                status_code: result.statusCode
            },
            duration
        );

        // Record overall Lambda duration
        metrics.lambdaExecutionDuration.observe(duration);

        return result;

    } catch (error) {
        console.error('Handler error:', error);
        
        metrics.apiErrorsTotal.inc({ 
            error_type: error.name || 'unknown',
            status_code: error.statusCode || 500
        });

        const [seconds, nanoseconds] = process.hrtime(start);
        metrics.lambdaExecutionDuration.observe(seconds + nanoseconds / 1e9);

        return {
            statusCode: error.statusCode || 500,
            body: JSON.stringify({
                message: 'Internal Server Error'
            })
        };
    }
};