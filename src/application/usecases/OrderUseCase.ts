import {
  OrderEntity,
  DomainValidationError,
} from "@/domain/entities/Order";
import { IOrderRepository } from "@/domain/repositories/IOrderRepository";
import { IOrderUseCase } from "@/domain/usecases/IOrderUseCase";
import { StatusBuilder } from "@/utils";
import {
  Order,
  OrderStatus,
  CreateOrderInput,
} from "@/utils/schemas/order";
import {
  CreateOrderResponse,
  GetOrderResponse,
  ListOrdersResponse,
  UpdateOrderStatusResponse,
  CheckoutRequest,
  CheckoutResponse,
} from "@/utils/schemas/endpoints/orders";
import { ICartRepository } from "@/domain/repositories/ICartRepository";
import { IProductRepository } from "@/domain/repositories/IProductRepository";
import { IProductVariantRepository } from "@/domain/repositories/IProductVariantRepository";
import { IPaymentUseCase } from "@/domain/usecases/IPaymentUseCase";
import { SalesReportQuery, SalesReportResponse } from "@/utils/schemas/endpoints/reports";

export class OrderUseCase implements IOrderUseCase {
  constructor(
    private orderRepository: IOrderRepository,
    private cartRepository: ICartRepository,
    private productRepository: IProductRepository,
    private variantRepository: IProductVariantRepository,
    private paymentUseCase: IPaymentUseCase,
  ) {}

  async checkout(userId: string, input: CheckoutRequest, customerEmail: string): Promise<CheckoutResponse> {
    try {
      const cart = await this.cartRepository.findById(input.cartId);
      if (!cart || cart.userId !== userId) {
        return StatusBuilder.fail("Cart not found", [
          { field: "cartId", message: "Cart does not exist or does not belong to user" },
        ]);
      }

      if (cart.items.length === 0) {
        return StatusBuilder.fail("Cart is empty", [
          { field: "cart", message: "No items in cart to checkout" },
        ]);
      }

      const orderItems = cart.items.map(item => ({
        productId: item.productId,
        variantId: item.variantId,
        name: item.name,
        price: item.price,
        quantity: item.quantity,
      }));

      const totalAmount = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

      const order = new OrderEntity(
        crypto.randomUUID(),
        userId,
        customerEmail,
        input.cartId,
        orderItems,
        totalAmount,
        input.shippingAddress,
        "pending",
        "pending",
        undefined,
        undefined,
        undefined,
        undefined,
        input.notes,
        new Date(),
        new Date(),
      );
      const ordersToCreate: Order[] = [order.toJSON()];

      const createdOrders = await this.orderRepository.createOrdersAndClearCart(
        ordersToCreate,
        cart.id,
      );

      const { sqsService } = require("@/infrastructure/aws/sqsClient");
      
      for (const order of createdOrders) {
        // Send order to SQS instead of processing payment directly
        await sqsService.sendMessage({
          orderId: order.id,
          amount: order.totalAmount,
          method: input.paymentMethod,
          notes: input.notes,
        }, order.id);
      }

      return StatusBuilder.ok(createdOrders[0]);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async createOrder(input: CreateOrderInput): Promise<CreateOrderResponse> {
    try {
      try {
        OrderEntity.validateCreation(input);
      } catch (error) {
        if (error instanceof DomainValidationError) {
          return StatusBuilder.fail("Validation failed", error.details);
        }
        throw error;
      }

      const order = new OrderEntity(
        crypto.randomUUID(),
        input.customerId,
        input.customerEmail,
        input.cartId,
        input.items,
        input.totalAmount,
        input.shippingAddress,
        "pending",
        "pending",
        undefined,
        undefined,
        undefined,
        undefined,
        input.notes,
        new Date(),
        new Date(),
      );

      const savedOrder = await this.orderRepository.save(order.toJSON());
      return StatusBuilder.ok(savedOrder);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async getOrder(id: string, userId: string, role: string): Promise<GetOrderResponse> {
    try {
      const orderData = await this.orderRepository.findById(id);

      if (!orderData) {
        return StatusBuilder.fail("Order not found", [
          { field: "id", message: "No order exists with the provided ID" },
        ]);
      }

      if (
        role !== "admin" &&
        orderData.customerId !== userId
      ) {
        return StatusBuilder.fail("Forbidden: Access denied", [
          { field: "id", message: "You do not have permission to view this order" },
        ]);
      }

      return StatusBuilder.ok(orderData);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }

  async listCustomerOrders(customerId: string): Promise<ListOrdersResponse> {
    try {
      const orders = await this.orderRepository.findByCustomerId(customerId);
      return StatusBuilder.ok(orders);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }


  async updateOrderStatus(
    id: string,
    status: OrderStatus,
  ): Promise<UpdateOrderStatusResponse> {
    try {
      const orderData = await this.orderRepository.findById(id);

      if (!orderData) {
        return StatusBuilder.fail("Order not found");
      }

      const order = OrderEntity.fromValidatedData(orderData);
      order.status = status;

      const savedOrder = await this.orderRepository.save(order.toJSON());
      
      if (status === "delivered") {
        const { eventBus, EVENTS } = require("@/infrastructure/events/eventBus");
        eventBus.emit(EVENTS.ORDER_DELIVERED, savedOrder.id);
      }
      
      return StatusBuilder.ok(savedOrder);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }
  async cancelOrder(id: string, userId: string, role?: string): Promise<UpdateOrderStatusResponse> {
    try {
      const orderData = await this.orderRepository.findById(id);

      if (!orderData) {
        return StatusBuilder.fail("Order not found");
      }

      const isCustomer = orderData.customerId === userId;

      if (!isCustomer && role !== "admin") {
        return StatusBuilder.fail("Forbidden: Access denied");
      }

      const order = OrderEntity.fromValidatedData(orderData);

      if (isCustomer && !order.canBeCancelled()) {
        return StatusBuilder.fail(
          "Order cannot be cancelled at this stage of fulfillment",
        );
      }

      order.status = "cancelled";
      const savedOrder = await this.orderRepository.save(order.toJSON());
      
      const { eventBus, EVENTS } = require("@/infrastructure/events/eventBus");
      eventBus.emit(EVENTS.ORDER_CANCELLED, savedOrder.id);
      
      return StatusBuilder.ok(savedOrder);
    } catch (error) {
      return StatusBuilder.fail(
        error instanceof Error ? error.message : "Unknown error occurred",
      );
    }
  }
}