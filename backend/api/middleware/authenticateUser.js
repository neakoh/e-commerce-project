const jwt = require('jsonwebtoken');
const { getJWTSecret } = require('../config/jwt');
const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

let ADMIN_ID
async function getAdminId() {
    try {
        // Get Stripe secrets from Secrets Manager
        const secretResponse = await secretsManager.getSecretValue({
            SecretId: process.env.ADMIN_SECRET_ARN
        }).promise();
        stripeSecrets = JSON.parse(secretResponse.SecretString);
        ADMIN_ID = stripeSecrets.auid;
    } catch (error) {
        console.error('Error initializing Stripe with secrets:', error);
        throw error;
    }
}

getAdminId();

async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ 
            status: 'error',
            message: 'Access token is missing or invalid format' 
        });
    }

    const token = authHeader.split(' ')[1];

    try {
        const secret = await getJWTSecret();
        const decoded = jwt.verify(token, secret, {
            algorithms: ['HS256'],
            maxAge: '1h'
        });
        
        if (!decoded.userID || typeof decoded.userID !== 'string') {
            throw new Error('Invalid token payload');
        }

        req.user = {
            ...decoded,
            isAdmin: decoded.userID === ADMIN_ID
        };
        
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ 
                status: 'error',
                message: 'Token has expired' 
            });
        }
        return res.status(403).json({ 
            status: 'error',
            message: 'Invalid token' 
        });
    }
}

module.exports = authenticateToken;