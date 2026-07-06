import { EventEmitter } from 'events';

class AppEventBus extends EventEmitter {}

export const eventBus = new AppEventBus();

// Events
export const EVENTS = {
  ORDER_PAID: 'ORDER_PAID',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
};
