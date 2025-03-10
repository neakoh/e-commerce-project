const AWS = require('aws-sdk');
const secretsManager = new AWS.SecretsManager();

async function getJWTSecret() {
  const secretArn = process.env.JWT_SECRET_ARN;
  if (!secretArn) {
    throw new Error('JWT_SECRET_ARN environment variable is not set');
  }

  const secretResponse = await secretsManager.getSecretValue({ SecretId: secretArn }).promise();
  const JWT_SECRET = JSON.parse(secretResponse.SecretString).JWT_SECRET;
  if (JWT_SECRET) {
    return JWT_SECRET
  } else {
    throw new Error('Unable to retrieve secret from AWS Secrets Manager');
  }
}

exports.getJWTSecret = getJWTSecret;