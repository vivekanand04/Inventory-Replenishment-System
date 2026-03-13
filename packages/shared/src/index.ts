export type ConsumptionType = "SALE" | "USAGE" | "ADJUSTMENT";

export type ReorderStatus = "TRIGGERED" | "CREATED_PO" | "CANCELLED" | "COMPLETED";

export type PurchaseOrderStatus = "CREATED" | "SENT" | "PARTIAL" | "RECEIVED" | "CANCELLED";

export type InventoryState =
  | "IN_STOCK"
  | "LOW_STOCK"
  | "REORDER_TRIGGERED"
  | "IN_TRANSIT"
  | "RECEIVED"
  | "OUT_OF_STOCK"
  | "BLOCKED";

export type AlertLevel = "INFO" | "WARNING" | "CRITICAL";

export type ReorderEvaluationInput = {
  productId: number;
  reorderMin: number;
  reorderMax: number;
  leadTimeDays: number;
  safetyStock: number;
  quantityAvailable: number;
  quantityInTransit: number;
  recentConsumptions: number[];
};

export type ReorderEvaluationResult = {
  shouldReorder: boolean;
  reorderQuantity: number;
  avgDailyConsumption: number;
  safetyStockUsed: number;
};

