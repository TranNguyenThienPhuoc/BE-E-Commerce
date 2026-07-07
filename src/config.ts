import { SecretsManagerClient, GetSecretValueCommand } from "@aws-sdk/client-secrets-manager";

export const config = {
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000',
  payosClientId: process.env.PAYOS_CLIENT_ID || '',
  payosApiKey: process.env.PAYOS_API_KEY || '',
  payosChecksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
  backendUrl: process.env.BACKEND_URL || 'http://localhost:8787',
  sqsQueueUrl: process.env.SQS_ORDER_QUEUE_URL || '',
  s3MediaBucket: process.env.S3_MEDIA_BUCKET || 'my-app-uploads',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret',
  redisUrl: process.env.REDIS_URL || '',
};

const secretsManager = new SecretsManagerClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export async function loadSecrets() {
  const secretName = process.env.SECRET_NAME || 'ecommerce/production/secrets';
  try {
    const response = await secretsManager.send(
      new GetSecretValueCommand({
        SecretId: secretName,
      })
    );

    if (response.SecretString) {
      const secrets = JSON.parse(response.SecretString);
      
      // Override config with secrets if they exist
      if (secrets.PAYOS_CLIENT_ID) config.payosClientId = secrets.PAYOS_CLIENT_ID;
      if (secrets.PAYOS_API_KEY) config.payosApiKey = secrets.PAYOS_API_KEY;
      if (secrets.PAYOS_CHECKSUM_KEY) config.payosChecksumKey = secrets.PAYOS_CHECKSUM_KEY;
      if (secrets.FRONTEND_URL) config.frontendUrl = secrets.FRONTEND_URL;
      if (secrets.BACKEND_URL) config.backendUrl = secrets.BACKEND_URL;
      if (secrets.JWT_SECRET) config.jwtSecret = secrets.JWT_SECRET;
      if (secrets.SQS_ORDER_QUEUE_URL) config.sqsQueueUrl = secrets.SQS_ORDER_QUEUE_URL;
      if (secrets.REDIS_URL) config.redisUrl = secrets.REDIS_URL;
      
      console.log("Successfully loaded secrets from AWS Secrets Manager.");
    }
  } catch (error) {
    console.warn(`Failed to fetch secrets from AWS Secrets Manager: ${error}. Fallback to .env values.`);
  }
}
