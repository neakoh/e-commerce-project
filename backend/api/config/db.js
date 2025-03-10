const { Pool } = require('pg');
const AWS = require('aws-sdk');
const { metrics } = require('./prometheus');

const secretsManager = new AWS.SecretsManager();

async function createPool() {
  try {
    // Get credentials from Secrets Manager
    const secretResponse = await secretsManager.getSecretValue({
      SecretId: process.env.DB_SECRET_ARN
    }).promise();
    
    // Parse the secret string into JSON
    const dbCredentials = JSON.parse(secretResponse.SecretString);
    
    // Create and return the pool
    const pool = new Pool({
      user: dbCredentials.username,
      password: dbCredentials.password,
      host: process.env.DB_HOST.split(':')[0],
      database: process.env.DB_NAME,
      port: 5432,
      ssl: {
        rejectUnauthorized: true,
      }
    });

    // Monitor pool events
    pool.on('connect', () => {
      metrics.dbConnectionPoolSize.inc({ state: 'active' });
    });

    pool.on('remove', () => {
      metrics.dbConnectionPoolSize.dec({ state: 'active' });
    });

    pool.on('error', (err) => {
      metrics.dbErrors.inc({ 
        error_type: 'connection',
        query_type: 'connection',
        table: 'none'
      });
      console.error('Unexpected error on idle client', err);
    });

    // Initial pool metrics
    metrics.dbConnectionPoolSize.set({ state: 'total' }, pool.totalCount);
    metrics.dbConnectionPoolSize.set({ state: 'idle' }, pool.idleCount);
    metrics.dbConnectionPoolSize.set({ state: 'waiting' }, pool.waitingCount);

    return pool;
  } catch (error) {
    metrics.dbErrors.inc({ 
      error_type: 'initialization',
      query_type: 'connection',
      table: 'none'
    });
    console.error('Error retrieving database credentials:', error);
    throw error;
  }
}

// Export an async function that initializes the pool
let poolInstance = null;

// Update pool metrics every 5 seconds
setInterval(async () => {
  if (poolInstance) {
    const poolStatus = await poolInstance.totalCount;
    const idleCount = await poolInstance.idleCount;
    const waitingCount = await poolInstance.waitingCount;
    
    metrics.dbConnectionPoolSize.set({ state: 'total' }, poolStatus);
    metrics.dbConnectionPoolSize.set({ state: 'idle' }, idleCount);
    metrics.dbConnectionPoolSize.set({ state: 'waiting' }, waitingCount);
  }
}, 5000);

module.exports = {
  query: async (text, params, client) => {
    if (!poolInstance) {
      poolInstance = await createPool();
    }

    const start = process.hrtime();
    const queryType = text.trim().split(' ')[0].toLowerCase();
    const table = text.match(/FROM\s+([^\s]+)/i)?.[1]?.toLowerCase() || 'unknown';

    try {
      // Use provided client or get one from pool
      const queryClient = client || poolInstance;
      const result = await queryClient.query(text, params);

      // Calculate query duration
      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds + nanoseconds / 1e9;

      // Record success metrics
      metrics.dbQueryDurationSeconds.observe(
        { 
          query_type: queryType,
          table: table,
          operation: 'success'
        },
        duration
      );

      metrics.dbQueryCount.inc({
        query_type: queryType,
        table: table,
        status: 'success'
      });

      return result;
    } catch (error) {
      // Record error metrics
      metrics.dbErrors.inc({ 
        error_type: error.code || 'query_error',
        query_type: queryType,
        table: table
      });

      metrics.dbQueryCount.inc({
        query_type: queryType,
        table: table,
        status: 'error'
      });

      const [seconds, nanoseconds] = process.hrtime(start);
      const duration = seconds + nanoseconds / 1e9;

      metrics.dbQueryDurationSeconds.observe(
        { 
          query_type: queryType,
          table: table,
          operation: 'error'
        },
        duration
      );

      throw error;
    }
  },
  connect: async () => {
    if (!poolInstance) {
      poolInstance = await createPool();
    }
    return poolInstance.connect();
  }
};