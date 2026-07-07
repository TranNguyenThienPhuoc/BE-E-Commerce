import {
  PaymentEntity,
  DomainValidationError,
} from "@/domain/entities/Payment";
import { OrderEntity } from "@/domain/entities/Order";
import { IPaymentRepository } from "@/domain/repositories/IPaymentRepository";
import { IOrderRepository } from "@/domain/repositories/IOrderRepository";
import { IPaymentUseCase } from "@/domain/usecases/IPaymentUseCase";
import { StatusBuilder, ApiResponse } from "@/utils";
import {
  Payment,
  CreatePaymentInput,
  UpdatePaymentInput,
} from "@/utils/schemas/payment";
import { eventBus, EVENTS } from "@/infrastructure/events/eventBus";
import { config } from "@/config";
import { PayOS } from "@payos/node";

export class PaymentUseCase implements IPaymentUseCase {
  private get payos() {
    return new PayOS({
      clientId: config.payosClientId,
      apiKey: config.payosApiKey,
      checksumKey: config.payosChecksumKey
    });
  }
  constructor(
    private paymentRepository: IPaymentRepository,
    private orderRepository: IOrderRepository,
  ) { }

  async createPayment(input: CreatePaymentInput): Promise<ApiResponse<Payment>> {
    try {
      try {
        PaymentEntity.validateCreation(input);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return StatusBuilder.fail("Validation failed", error.details);
        }
        throw error;
      }

      const payment = new PaymentEntity(
        crypto.randomUUID(),
        input.orderId,
        input.amount,
        input.method,
        input.currency || "VND",
        "pending",
        undefined,
        undefined,
        input.notes,
        new Date(),
        new Date(),
      );

      const savedPayment = await this.paymentRepository.save(payment.toJSON());
      return StatusBuilder.ok(savedPayment);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async getPayment(id: string): Promise<ApiResponse<Payment>> {
    try {
      const paymentData = await this.paymentRepository.findById(id);

      if (!paymentData) {
        return StatusBuilder.fail("Payment not found", [
          { field: "id", message: "No payment exists with the provided ID" },
        ]);
      }

      return StatusBuilder.ok(paymentData);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async getPaymentsByOrder(orderId: string): Promise<ApiResponse<Payment[]>> {
    try {
      const payments = await this.paymentRepository.findByOrderId(orderId);
      return StatusBuilder.ok(payments);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async updatePayment(id: string, input: UpdatePaymentInput): Promise<ApiResponse<Payment>> {
    try {
      const paymentData = await this.paymentRepository.findById(id);

      if (!paymentData) {
        return StatusBuilder.fail("Payment not found");
      }

      try {
        PaymentEntity.validateUpdate(input);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return StatusBuilder.fail("Validation failed", error.details);
        }
        throw error;
      }

      const payment = PaymentEntity.fromValidatedData(paymentData);
      const oldStatus = payment.status;

      if (input.status) payment.status = input.status;
      if (input.transactionId) payment.transactionId = input.transactionId;
      if (input.notes) payment.notes = input.notes;

      const savedPayment = await this.paymentRepository.save(payment.toJSON());

      if (oldStatus !== "completed" && payment.status === "completed") {
        await this.updateOrderPaymentStatus(payment.orderId);
      }

      return StatusBuilder.ok(savedPayment);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  private async updateOrderPaymentStatus(orderId: string): Promise<void> {
    const orderData = await this.orderRepository.findById(orderId);
    if (orderData) {
      const order = OrderEntity.fromValidatedData(orderData);
      order.paymentStatus = "paid";
      order.paidAt = new Date().toISOString();
      if (order.status === "pending") {
        order.status = "confirmed";
      }
      await this.orderRepository.save(order.toJSON());
      eventBus.emit(EVENTS.ORDER_PAID, order.id);
    }
  }

  async processPayment(id: string): Promise<ApiResponse<Payment>> {
    try {
      const paymentData = await this.paymentRepository.findById(id);

      if (!paymentData) {
        return StatusBuilder.fail("Payment not found");
      }

      const payment = PaymentEntity.fromValidatedData(paymentData);

      payment.status = "completed";
      payment.transactionId = `TXN-${crypto.randomUUID().substring(0, 8).toUpperCase()}`;

      const savedPayment = await this.paymentRepository.save(payment.toJSON());

      await this.updateOrderPaymentStatus(payment.orderId);

      return StatusBuilder.ok(savedPayment);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async listAllPayments(): Promise<ApiResponse<Payment[]>> {
    try {
      const payments = await this.paymentRepository.findAll();
      return StatusBuilder.ok(payments);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }



  async createPayosPaymentUrl(orderId: string, userId: string): Promise<ApiResponse<{ checkoutUrl: string }>> {
    try {
      const orderData = await this.orderRepository.findById(orderId);
      if (!orderData) {
        return StatusBuilder.fail("Order not found");
      }

      if (orderData.customerId !== userId) {
        return StatusBuilder.fail("Unauthorized: Order does not belong to user");
      }

      if (orderData.paymentStatus === "paid") {
        return StatusBuilder.fail("Order is already paid");
      }

      // Generate a numeric orderCode (timestamp last 6 digits + 3 random digits)
      const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));

      const paymentData = {
        orderCode: orderCode,
        amount: orderData.totalAmount,
        description: `Thanh toan don ${orderCode}`,
        cancelUrl: `${config.frontendUrl}/payment/cancel`,
        returnUrl: `${config.frontendUrl}/payment/success?order_id=${orderId}`,
      };

      const paymentLink = await this.payos.paymentRequests.create(paymentData);

      if (!paymentLink.checkoutUrl) {
        return StatusBuilder.fail("Failed to create PayOS session URL");
      }

      // We need to save the orderCode to DynamoDB so we can find it when the webhook fires
      // We will store it as a string in paymentIntentId
      const order = OrderEntity.fromValidatedData(orderData);
      order.paymentIntentId = String(orderCode);
      order.paymentProvider = "payos";
      await this.orderRepository.save(order.toJSON());

      return StatusBuilder.ok({ checkoutUrl: paymentLink.checkoutUrl });
    } catch (error) {
      console.error("PayOS session creation error:", error);
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async payosWebhook(body: any): Promise<ApiResponse<any>> {
    try {
      // Verify webhook data
      let webhookData;
      try {
        webhookData = await this.payos.webhooks.verify(body);
      } catch (err) {
        return StatusBuilder.fail("Invalid webhook signature or data");
      }

      if (webhookData.code === "00" || webhookData.code === "success") {
        // Payment successful
        const orderCode = webhookData.orderCode;

        // Find order by paymentIntentId (which stores the orderCode)
        const orderData = await this.orderRepository.findByPaymentIntentId?.(String(orderCode));

        if (orderData && orderData.paymentStatus !== "paid") {
          const order = OrderEntity.fromValidatedData(orderData);
          order.paymentStatus = "paid";
          order.paidAt = new Date().toISOString();

          if (order.status === "pending") {
            order.status = "confirmed";
          }
          await this.orderRepository.save(order.toJSON());
          eventBus.emit(EVENTS.ORDER_PAID, order.id);
        }
      }

      return StatusBuilder.ok({ success: true });
    } catch (error) {
      console.error("Webhook processing error:", error);
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }
}