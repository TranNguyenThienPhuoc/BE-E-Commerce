import { eventBus, EVENTS } from "./eventBus";
import { ISettlementUseCase } from "@/domain/usecases/ISettlementUseCase";

export function initializeSettlementWorker(settlementUseCase: ISettlementUseCase) {
  eventBus.on(EVENTS.ORDER_PAID, async (orderId: string) => {
    try {
      console.log(`[SettlementWorker] Processing settlement for paid order: ${orderId}`);
      await settlementUseCase.processSettlement(orderId);
    } catch (error) {
      console.error(`[SettlementWorker] Failed to process settlement for order ${orderId}:`, error);
    }
  });

  eventBus.on(EVENTS.ORDER_DELIVERED, async (orderId: string) => {
    try {
      console.log(`[SettlementWorker] Releasing settlement for delivered order: ${orderId}`);
      await settlementUseCase.releaseSettlement(orderId);
    } catch (error) {
      console.error(`[SettlementWorker] Failed to release settlement for order ${orderId}:`, error);
    }
  });

  eventBus.on(EVENTS.ORDER_CANCELLED, async (orderId: string) => {
    try {
      console.log(`[SettlementWorker] Cancelling settlement for cancelled/refunded order: ${orderId}`);
      await settlementUseCase.cancelSettlement(orderId);
    } catch (error) {
      console.error(`[SettlementWorker] Failed to cancel settlement for order ${orderId}:`, error);
    }
  });
}
