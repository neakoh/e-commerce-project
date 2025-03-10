const promBundle = require('express-prom-bundle');
const promClient = require('prom-client');

// Create a custom registry
const register = new promClient.Registry();

// Database Metrics
const dbQueryDurationSeconds = new promClient.Histogram({
    name: 'db_query_duration_seconds',
    help: 'Duration of database queries in seconds',
    labelNames: ['query_type', 'table', 'operation'],
    buckets: [0.01, 0.05, 0.1, 0.5, 1, 2]
});

const dbConnectionPoolSize = new promClient.Gauge({
    name: 'db_connection_pool_size',
    help: 'Current size of the database connection pool',
    labelNames: ['state'] // idle, active, total
});

const dbErrors = new promClient.Counter({
    name: 'db_errors_total',
    help: 'Total number of database errors',
    labelNames: ['error_type', 'query_type', 'table'] 
});

const dbQueryCount = new promClient.Counter({
    name: 'db_query_count_total',
    help: 'Total number of database queries',
    labelNames: ['query_type', 'table', 'status']
});

// API Metrics
const apiRequestsTotal = new promClient.Counter({
    name: 'api_requests_total',
    help: 'Total number of API requests',
    labelNames: ['method', 'route', 'status_code']
});

const apiErrorsTotal = new promClient.Counter({
    name: 'api_errors_total',
    help: 'Total number of API errors',
    labelNames: ['method', 'route', 'status_code', 'error_type']
});

// Response Time Metrics
const apiResponseTime = new promClient.Histogram({
    name: 'api_response_time_seconds',
    help: 'Response time in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.3, 0.5, 0.7, 1, 2, 5]
});

// Stripe-specific Metrics
const stripeTransactionStatus = new promClient.Counter({
    name: 'stripe_transaction_status',
    help: 'Status of Stripe transactions',
    labelNames: ['status', 'type', 'currency']
});

const stripeErrors = new promClient.Counter({
    name: 'stripe_errors_total',
    help: 'Total number of Stripe-related errors',
    labelNames: ['error_type', 'status_code', 'endpoint']
});

const stripeLatency = new promClient.Histogram({
    name: 'stripe_request_duration_seconds',
    help: 'Duration of Stripe API requests',
    labelNames: ['endpoint', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5]
});

// Business Logic Metrics
const orderProcessingDuration = new promClient.Histogram({
    name: 'order_processing_duration_seconds',
    help: 'Time taken to process orders',
    labelNames: ['status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10]
});

const activeUsers = new promClient.Gauge({
    name: 'active_users',
    help: 'Number of currently active users'
});

// Lambda Specific Metrics
const lambdaColdStarts = new promClient.Counter({
    name: 'lambda_cold_starts_total',
    help: 'Total number of Lambda cold starts'
});

const lambdaExecutionDuration = new promClient.Histogram({
    name: 'lambda_execution_duration_seconds',
    help: 'Duration of Lambda function execution',
    buckets: [0.1, 0.5, 1, 2, 3, 5, 10]
});

const lambdaMemoryUsage = new promClient.Gauge({
    name: 'lambda_memory_usage_bytes',
    help: 'Current Lambda function memory usage'
});

// Register all metrics
register.registerMetric(dbQueryDurationSeconds);
register.registerMetric(dbConnectionPoolSize);
register.registerMetric(dbErrors);
register.registerMetric(dbQueryCount);
register.registerMetric(apiRequestsTotal);
register.registerMetric(apiErrorsTotal);
register.registerMetric(apiResponseTime);
register.registerMetric(stripeTransactionStatus);
register.registerMetric(stripeErrors);
register.registerMetric(stripeLatency);
register.registerMetric(orderProcessingDuration);
register.registerMetric(activeUsers);
register.registerMetric(lambdaColdStarts);
register.registerMetric(lambdaExecutionDuration);
register.registerMetric(lambdaMemoryUsage);

// Configure the prometheus middleware
const metricsMiddleware = promBundle({
    includeMethod: true,
    includePath: true,
    includeStatusCode: true,
    includeUp: true,
    customLabels: { project: 'your-project' },
    promClient: {
        collectDefaultMetrics: false
    },
    promRegistry: register,
    formatStatusCode: (res) => res.status_code || res.statusCode
});

module.exports = {
    metricsMiddleware,
    register,
    metrics: {
        dbQueryDurationSeconds,
        dbConnectionPoolSize,
        dbErrors,
        dbQueryCount,
        apiRequestsTotal,
        apiErrorsTotal,
        apiResponseTime,
        stripeTransactionStatus,
        stripeErrors,
        stripeLatency,
        orderProcessingDuration,
        activeUsers,
        lambdaColdStarts,
        lambdaExecutionDuration,
        lambdaMemoryUsage
    }
};
