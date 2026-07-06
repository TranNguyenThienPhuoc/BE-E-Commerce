import { sqsService } from "./aws/sqsClient";
import { IPaymentUseCase } from "@/domain/usecases/IPaymentUseCase";
import { CreatePaymentInput } from "@/utils/schemas/payment";

export function initializeSQSWorker(paymentUseCase: IPaymentUseCase) {
  // Run worker in a non-blocking loop
  const pollQueue = async () => {
    try {
      const messages = await sqsService.receiveMessages(10, 20);
      
      for (const message of messages) {
        if (message.Body && message.ReceiptHandle) {
          try {
            const body = JSON.parse(message.Body) as CreatePaymentInput;
            console.log(`[SQSWorker] Processing order: ${body.orderId}`);
            
            await paymentUseCase.createPayment({
              orderId: body.orderId,
              amount: body.amount,
              method: body.method,
              notes: body.notes,
            });

            // Delete message after successful processing
            await sqsService.deleteMessage(message.ReceiptHandle);
            console.log(`[SQSWorker] Successfully processed and deleted message for order: ${body.orderId}`);
          } catch (err) {
            console.error(`[SQSWorker] Failed to process message ${message.MessageId}:`, err);
            // Don't delete, let it go to Dead Letter Queue or be re-delivered
          }
        }
      }
    } catch (error) {
      console.error("[SQSWorker] Error polling SQS:", error);
    }

    // Schedule next poll
    setTimeout(pollQueue, 1000);
  };

  // Start polling
  pollQueue();
}
