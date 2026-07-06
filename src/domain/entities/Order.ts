import {
  Order,
  CreateOrderInput,
  UpdateOrderInput,
  CreateOrderSchema,
  UpdateOrderSchema,
  OrderStatus,
  PaymentStatus,
  OrderItem,
} from "@/utils/schemas/order";

export class OrderEntity implements Order {
  private idValue: string;
  private customerIdValue: string;
  private customerEmailValue: string;
  private cartIdValue: string;
  private itemsValue: OrderItem[];
  private totalAmountValue: number;
  private statusValue: OrderStatus;
  private paymentStatusValue: PaymentStatus;
  private paymentProviderValue?: string;
  private stripeSessionIdValue?: string;
  private paymentIntentIdValue?: string;
  private paidAtValue?: string;
  private shippingAddressValue: string;
  private notesValue?: string;
  private createdAtValue: Date;
  private updatedAtValue: Date;

  constructor(
    id: string,
    customerId: string,
    customerEmail: string,
    cartId: string,
    items: OrderItem[],
    totalAmount: number,
    shippingAddress: string,
    status: OrderStatus = "pending",
    paymentStatus: PaymentStatus = "pending",
    paymentProvider?: string,
    stripeSessionId?: string,
    paymentIntentId?: string,
    paidAt?: string,
    notes?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    this.idValue = id;
    this.customerIdValue = customerId;
    this.customerEmailValue = customerEmail;
    this.cartIdValue = cartId;
    this.itemsValue = items;
    this.totalAmountValue = totalAmount;
    this.shippingAddressValue = shippingAddress;
    this.statusValue = status;
    this.paymentStatusValue = paymentStatus;
    this.paymentProviderValue = paymentProvider;
    this.stripeSessionIdValue = stripeSessionId;
    this.paymentIntentIdValue = paymentIntentId;
    this.paidAtValue = paidAt;
    this.notesValue = notes;
    this.createdAtValue = createdAt ?? new Date();
    this.updatedAtValue = updatedAt ?? new Date();
  }

  get id(): string { return this.idValue; }
  get customerId(): string { return this.customerIdValue; }
  get customerEmail(): string { return this.customerEmailValue; }
  get cartId(): string { return this.cartIdValue; }
  get items(): OrderItem[] { return this.itemsValue; }
  get totalAmount(): number { return this.totalAmountValue; }
  get status(): OrderStatus { return this.statusValue; }
  get paymentStatus(): PaymentStatus { return this.paymentStatusValue; }
  get paymentProvider(): string | undefined { return this.paymentProviderValue; }
  get stripeSessionId(): string | undefined { return this.stripeSessionIdValue; }
  get paymentIntentId(): string | undefined { return this.paymentIntentIdValue; }
  get paidAt(): string | undefined { return this.paidAtValue; }
  get shippingAddress(): string { return this.shippingAddressValue; }
  get notes(): string | undefined { return this.notesValue; }
  get createdAt(): Date { return this.createdAtValue; }
  get updatedAt(): Date { return this.updatedAtValue; }

  set status(value: OrderStatus) {
    this.statusValue = value;
    this.updatedAtValue = new Date();
  }

  set paymentStatus(value: PaymentStatus) {
    this.paymentStatusValue = value;
    this.updatedAtValue = new Date();
  }

  set paymentProvider(value: string | undefined) {
    this.paymentProviderValue = value;
    this.updatedAtValue = new Date();
  }

  set stripeSessionId(value: string | undefined) {
    this.stripeSessionIdValue = value;
    this.updatedAtValue = new Date();
  }

  set paymentIntentId(value: string | undefined) {
    this.paymentIntentIdValue = value;
    this.updatedAtValue = new Date();
  }

  set paidAt(value: string | undefined) {
    this.paidAtValue = value;
    this.updatedAtValue = new Date();
  }

  set shippingAddress(value: string) {
    this.shippingAddressValue = value;
    this.updatedAtValue = new Date();
  }

  set notes(value: string | undefined) {
    this.notesValue = value;
    this.updatedAtValue = new Date();
  }

  canBeCancelled(): boolean {
    return this.statusValue === "pending" || this.statusValue === "confirmed";
  }

  isPaid(): boolean {
    return this.paymentStatusValue === "paid";
  }

  isShipped(): boolean {
    return this.statusValue === "shipped" || this.statusValue === "delivered";
  }

  isDelivered(): boolean {
    return this.statusValue === "delivered";
  }

  toJSON(): Order {
    return {
      id: this.idValue,
      customerId: this.customerIdValue,
      customerEmail: this.customerEmailValue,
      cartId: this.cartIdValue,
      items: this.itemsValue,
      totalAmount: this.totalAmountValue,
      status: this.statusValue,
      paymentStatus: this.paymentStatusValue,
      paymentProvider: this.paymentProviderValue,
      stripeSessionId: this.stripeSessionIdValue,
      paymentIntentId: this.paymentIntentIdValue,
      paidAt: this.paidAtValue,
      shippingAddress: this.shippingAddressValue,
      notes: this.notesValue,
      createdAt: this.createdAtValue,
      updatedAt: this.updatedAtValue,
    };
  }

  static fromObject(data: Order): OrderEntity {
    return new OrderEntity(
      data.id,
      data.customerId,
      data.customerEmail,
      data.cartId,
      data.items,
      data.totalAmount,
      data.shippingAddress,
      data.status,
      data.paymentStatus,
      data.paymentProvider,
      data.stripeSessionId,
      data.paymentIntentId,
      data.paidAt,
      data.notes,
      data.createdAt,
      data.updatedAt,
    );
  }

  static fromValidatedData(data: Order): OrderEntity {
    return OrderEntity.fromObject(data);
  }

  static validateCreation(data: CreateOrderInput): void {
    const result = CreateOrderSchema.safeParse(data);
    if (!result.success) {
      throw new DomainValidationError(
        "Invalid order creation data",
        result.error.issues.map((err) => ({
          field: Array.isArray(err.path) && err.path.length > 0 ? err.path.join(".") : "value",
          message: err.message,
        })),
      );
    }
  }

  static validateUpdate(data: UpdateOrderInput): void {
    const result = UpdateOrderSchema.safeParse(data);
    if (!result.success) {
      throw new DomainValidationError(
        "Invalid order update data",
        result.error.issues.map((err) => ({
          field: Array.isArray(err.path) && err.path.length > 0 ? err.path.join(".") : "value",
          message: err.message,
        })),
      );
    }
  }
}

export class DomainValidationError extends Error {
  constructor(message: string, public readonly details: Array<{ field: string; message: string }>) {
    super(message);
    this.name = "DomainValidationError";
  }
}