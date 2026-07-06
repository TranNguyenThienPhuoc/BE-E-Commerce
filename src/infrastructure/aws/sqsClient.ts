import { SQSClient, SendMessageCommand, ReceiveMessageCommand, DeleteMessageCommand } from "@aws-sdk/client-sqs";
import { config } from "@/config";

const REGION = process.env.AWS_REGION ?? "ap-southeast-1";

export const sqsClient = new SQSClient({
  region: REGION,
  credentials: process.env.AWS_ACCESS_KEY_ID ? {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  } : undefined,
});

export class SQSService {
  private queueUrl: string;

  constructor() {
    this.queueUrl = config.sqsQueueUrl;
  }

  async sendMessage(messageBody: any, messageGroupId?: string): Promise<void> {
    if (!this.queueUrl) {
      console.warn("[SQSService] No Queue URL configured. Skipping message sending.");
      return;
    }

    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(messageBody),
        ...(messageGroupId && { MessageGroupId: messageGroupId })
      });
      
      const response = await sqsClient.send(command);
      console.log(`[SQSService] Message sent successfully. MessageId: ${response.MessageId}`);
    } catch (error) {
      console.error("[SQSService] Failed to send message:", error);
      throw error;
    }
  }

  async receiveMessages(maxNumberOfMessages = 10, waitTimeSeconds = 20) {
    if (!this.queueUrl) {
      return [];
    }

    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: maxNumberOfMessages,
        WaitTimeSeconds: waitTimeSeconds,
      });

      const response = await sqsClient.send(command);
      return response.Messages || [];
    } catch (error) {
      console.error("[SQSService] Failed to receive messages:", error);
      return [];
    }
  }

  async deleteMessage(receiptHandle: string): Promise<void> {
    if (!this.queueUrl) return;

    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      });

      await sqsClient.send(command);
    } catch (error) {
      console.error("[SQSService] Failed to delete message:", error);
    }
  }
}

export const sqsService = new SQSService();
