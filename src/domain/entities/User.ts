import { z } from "zod";
import {
  UserSchema,
  CreateUserSchema,
  CreateUserInput,
  UpdateUserSchema,
  UpdateUserInput,
  User,
} from "@/utils/schemas/user";
import { UserRole } from "@/utils/schemas/common";

/**
 * Domain entity representing a User.
 */
export class UserEntity implements User {
  private idValue: string;
  private emailValue: string;
  private nameValue: string;
  private passwordValue: string;
  private roleValue: UserRole;
  private sellerStatusValue: 'none' | 'pending' | 'approved' | 'rejected';
  private shopNameValue?: string;
  private shopAddressValue?: string;
  private shopDescriptionValue?: string;
  private createdAtValue: Date;
  private updatedAtValue: Date;

  constructor(
    id: string,
    email: string,
    name: string,
    password: string,
    role: UserRole = 'customer',
    sellerStatus: 'none' | 'pending' | 'approved' | 'rejected' = 'none',
    shopName?: string,
    shopAddress?: string,
    shopDescription?: string,
    createdAt: Date = new Date(),
    updatedAt: Date = new Date(),
  ) {
    this.idValue = id;
    this.emailValue = email;
    this.nameValue = name;
    this.passwordValue = password;
    this.roleValue = role;
    this.sellerStatusValue = sellerStatus;
    this.shopNameValue = shopName;
    this.shopAddressValue = shopAddress;
    this.shopDescriptionValue = shopDescription;
    this.createdAtValue = createdAt;
    this.updatedAtValue = updatedAt;

    const userData = this.toJSON();
    const result = UserSchema.safeParse(userData);

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw new DomainValidationError("Invalid User data", errors);
    }
  }

  // Getters
  get id(): string {
    return this.idValue;
  }

  get email(): string {
    return this.emailValue;
  }

  get name(): string {
    return this.nameValue;
  }

  get password(): string {
    return this.passwordValue;
  }

  get role(): UserRole {
    return this.roleValue;
  }

  get sellerStatus() {
    return this.sellerStatusValue;
  }

  get shopName() {
    return this.shopNameValue;
  }

  get shopAddress() {
    return this.shopAddressValue;
  }

  get shopDescription() {
    return this.shopDescriptionValue;
  }

  get createdAt(): Date {
    return this.createdAtValue;
  }

  get updatedAt(): Date {
    return this.updatedAtValue;
  }

  // Setters
  set email(value: string) {
    this.emailValue = value;
    this.updatedAtValue = new Date();
  }

  set name(value: string) {
    this.nameValue = value;
    this.updatedAtValue = new Date();
  }

  set password(value: string) {
    this.passwordValue = value;
    this.updatedAtValue = new Date();
  }

  set role(value: UserRole) {
    this.roleValue = value;
    this.updatedAtValue = new Date();
  }

  set sellerStatus(value: 'none' | 'pending' | 'approved' | 'rejected') {
    this.sellerStatusValue = value;
    this.updatedAtValue = new Date();
  }

  set shopName(value: string | undefined) {
    this.shopNameValue = value;
    this.updatedAtValue = new Date();
  }

  set shopAddress(value: string | undefined) {
    this.shopAddressValue = value;
    this.updatedAtValue = new Date();
  }

  set shopDescription(value: string | undefined) {
    this.shopDescriptionValue = value;
    this.updatedAtValue = new Date();
  }

  static fromValidatedData(data: User): UserEntity {
    return new UserEntity(
      data.id,
      data.email,
      data.name,
      data.password,
      data.role,
      data.sellerStatus,
      data.shopName,
      data.shopAddress,
      data.shopDescription,
      data.createdAt,
      data.updatedAt,
    );
  }

  static validateCreation(input: CreateUserInput): void {
    const result = CreateUserSchema.safeParse(input);

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw new DomainValidationError(
        "Invalid User creation data",
        errors,
      );
    }
  }

  static validateUpdate(input: UpdateUserInput): void {
    const result = UpdateUserSchema.safeParse(input);

    if (!result.success) {
      const errors = result.error.issues.map((err) => ({
        field: err.path.join("."),
        message: err.message,
      }));
      throw new DomainValidationError("Invalid User update data", errors);
    }
  }

  canBeDeleted(): boolean {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return this.createdAt <= oneDayAgo;
  }

  getAgeInDays(): number {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - this.createdAt.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  isRecentlyCreated(): boolean {
    return this.getAgeInDays() <= 7;
  }

  toJSON(): User {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      password: this.password,
      role: this.role,
      sellerStatus: this.sellerStatus,
      shopName: this.shopName,
      shopAddress: this.shopAddress,
      shopDescription: this.shopDescription,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

export class DomainValidationError extends Error {
  constructor(
    message: string,
    public readonly details: Array<{ field: string; message: string }>,
  ) {
    super(message);
    this.name = "DomainValidationError";
  }
}