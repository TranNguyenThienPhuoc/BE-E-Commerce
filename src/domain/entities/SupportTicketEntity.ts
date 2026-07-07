import {
  SupportTicket,
  SupportTicketStatus,
  SupportTicketPriority,
} from "@/utils/schemas/supportTicket";

export class SupportTicketEntity implements SupportTicket {
  private _id: string;
  private _customerName: string;
  private _customerEmail: string;
  private _subject: string;
  private _message: string;
  private _status: SupportTicketStatus;
  private _priority: SupportTicketPriority;
  private _category: string;
  private _customerId?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  private _isActive: boolean;

  constructor(
    id: string,
    customerName: string,
    customerEmail: string,
    subject: string,
    message: string,
    status: SupportTicketStatus = "open",
    priority: SupportTicketPriority = "medium",
    category: string = "General",
    customerId?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
    isActive: boolean = true,
  ) {
    this._id = id;
    this._customerName = customerName;
    this._customerEmail = customerEmail;
    this._subject = subject;
    this._message = message;
    this._status = status;
    this._priority = priority;
    this._category = category;
    this._customerId = customerId;
    this._createdAt = createdAt;
    this._updatedAt = updatedAt;
    this._isActive = isActive;
  }

  get id(): string {
    return this._id;
  }

  get customerName(): string {
    return this._customerName;
  }
  
  get customerEmail(): string {
    return this._customerEmail;
  }

  get subject(): string {
    return this._subject;
  }

  get message(): string {
    return this._message;
  }

  get status(): SupportTicketStatus {
    return this._status;
  }

  get priority(): SupportTicketPriority {
    return this._priority;
  }

  get category(): string {
    return this._category;
  }

  get customerId(): string | undefined {
    return this._customerId;
  }

  get createdAt(): Date {
    return this._createdAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  public updateStatus(status: SupportTicketStatus) {
    this._status = status;
    this._updatedAt = new Date();
  }

  public updatePriority(priority: SupportTicketPriority) {
    this._priority = priority;
    this._updatedAt = new Date();
  }

  public deactivate() {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  toJSON(): SupportTicket {
    return {
      id: this.id,
      customerName: this.customerName,
      customerEmail: this.customerEmail,
      subject: this.subject,
      message: this.message,
      status: this.status,
      priority: this.priority,
      category: this.category,
      customerId: this.customerId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      isActive: this.isActive,
    };
  }

  static fromJSON(data: SupportTicket): SupportTicketEntity {
    return new SupportTicketEntity(
      data.id,
      data.customerName,
      data.customerEmail,
      data.subject,
      data.message,
      data.status,
      data.priority,
      data.category,
      data.customerId,
      data.createdAt,
      data.updatedAt,
      data.isActive,
    );
  }
}
