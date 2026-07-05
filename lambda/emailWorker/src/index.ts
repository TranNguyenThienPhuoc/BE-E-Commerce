import { DynamoDBStreamHandler } from "aws-lambda";
import { unmarshall } from "@aws-sdk/util-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { getOrderConfirmationHtml, EmailOrderItem } from "./template";

const ses = new SESClient({ region: process.env.AWS_REGION || "ap-southeast-1" });

export const handler: DynamoDBStreamHandler = async (event, context) => {
  const requestId = context.awsRequestId;
  console.info(`[LambdaRequestId: ${requestId}] Starting processing of ${event.Records.length} records.`);

  try {
    for (const record of event.Records) {
      // We only care about new orders being created (INSERT events)
      if (record.eventName !== "INSERT") {
        console.info(`[LambdaRequestId: ${requestId}] Skipping record with eventName: ${record.eventName}`);
        continue;
      }

      const dynamodbImage = record.dynamodb?.NewImage;
      if (!dynamodbImage) {
        console.warn(`[LambdaRequestId: ${requestId}] Record has no NewImage data. Skipping.`);
        continue;
      }

      // Convert DynamoDB AttributeMap to normal Javascript Object
      const order = unmarshall(dynamodbImage as any);
      const orderId = order.id || order.Id;
      const customerEmail = order.customerEmail;
      const items = (order.items || []) as EmailOrderItem[];
      const totalAmount = Number(order.totalAmount || 0);

      console.info(`[LambdaRequestId: ${requestId}] Processing order: ${orderId} for customer email: ${customerEmail}`);

      if (!customerEmail) {
        console.warn(`[LambdaRequestId: ${requestId}] Order ${orderId} is missing customerEmail. Cannot send confirmation email.`);
        continue;
      }

      const sourceEmail = process.env.SOURCE_EMAIL;
      if (!sourceEmail) {
        throw new Error("SOURCE_EMAIL environment variable is not set.");
      }

      // Generate HTML Template
      const htmlBody = getOrderConfirmationHtml(orderId, items, totalAmount);

      // Construct SendEmailCommand
      const sendEmailCmd = new SendEmailCommand({
        Source: sourceEmail,
        Destination: {
          ToAddresses: [customerEmail],
        },
        Message: {
          Subject: {
            Charset: "UTF-8",
            Data: `[Zopee] Xác nhận đơn hàng thành công #${orderId}`,
          },
          Body: {
            Html: {
              Charset: "UTF-8",
              Data: htmlBody,
            },
          },
        },
      });

      console.info(`[LambdaRequestId: ${requestId}] Sending email via SES to: ${customerEmail} from: ${sourceEmail}`);
      const sesResponse = await ses.send(sendEmailCmd);
      console.info(`[LambdaRequestId: ${requestId}] Email sent successfully for Order: ${orderId}. SES MessageId: ${sesResponse.MessageId}`);
    }

    console.info(`[LambdaRequestId: ${requestId}] Finished processing all records.`);
  } catch (error: any) {
    console.error(`[LambdaRequestId: ${requestId}] Error processing database stream records:`, error);
    // Throw error so AWS Lambda registers this invocation as failed and triggers retry logic
    throw error;
  }
};
