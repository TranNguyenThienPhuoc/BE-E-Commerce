import { SSMClient, GetParametersByPathCommand } from "@aws-sdk/client-ssm";

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

const ssmClient = new SSMClient({ region: process.env.AWS_REGION || 'ap-southeast-1' });

export async function loadSecrets() {
  const ssmPathPrefix = process.env.SSM_PREFIX || '/app/env/';
  try {
    const response = await ssmClient.send(
      new GetParametersByPathCommand({
        Path: ssmPathPrefix,
        WithDecryption: true,
        Recursive: true,
      })
    );

    if (response.Parameters && response.Parameters.length > 0) {
      const secrets: Record<string, string> = {};
      for (const param of response.Parameters) {
        if (param.Name && param.Value) {
          // Lấy phần tên key sau prefix (VD: /app/env/PAYOS_CLIENT_ID -> PAYOS_CLIENT_ID)
          const key = param.Name.replace(ssmPathPrefix, '');
          secrets[key] = param.Value;
        }
      }
      
      // Override config with secrets if they exist
      if (secrets.PAYOS_CLIENT_ID) config.payosClientId = secrets.PAYOS_CLIENT_ID;
      if (secrets.PAYOS_API_KEY) config.payosApiKey = secrets.PAYOS_API_KEY;
      if (secrets.PAYOS_CHECKSUM_KEY) config.payosChecksumKey = secrets.PAYOS_CHECKSUM_KEY;
      if (secrets.FRONTEND_URL) config.frontendUrl = secrets.FRONTEND_URL;
      if (secrets.BACKEND_URL) config.backendUrl = secrets.BACKEND_URL;
      if (secrets.JWT_SECRET) config.jwtSecret = secrets.JWT_SECRET;
      if (secrets.SQS_ORDER_QUEUE_URL) config.sqsQueueUrl = secrets.SQS_ORDER_QUEUE_URL;
      if (secrets.REDIS_URL) config.redisUrl = secrets.REDIS_URL;
      
      console.log(`Successfully loaded ${Object.keys(secrets).length} parameters from AWS Systems Manager.`);
    }
  } catch (error) {
    console.warn(`Failed to fetch parameters from AWS Systems Manager: ${error}. Fallback to .env values.`);
  }
}
