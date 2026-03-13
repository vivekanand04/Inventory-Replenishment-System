import { InventoryState } from "shared";
import { prisma, withSerializableTransaction } from "../prismaClient";
import { AlertService } from "./alertService";
import { AuditService } from "./auditService";
import { alertQueue } from "../queues";

const computeNextState = (available: number, blocked: number, reorderLevel: number, currentState: InventoryState): InventoryState => {
  if (blocked > 0) {
    return "BLOCKED";
  }
  if (available <= 0) {
    return "OUT_OF_STOCK";
  }
  if (available < reorderLevel) {
    // Below threshold but still positive stock
    return "LOW_STOCK";
  }
  // Preserve RECEIVED for a short-lived state until next mutation
  if (currentState === "RECEIVED") {
    return "IN_STOCK";
  }
  return "IN_STOCK";
};

const isValidTransition = (fromState: InventoryState, toState: InventoryState): boolean => {
  if (fromState === toState) {
    return true;
  }
  const allowed: Record<InventoryState, InventoryState[]> = {
    OUT_OF_STOCK: ["IN_STOCK"],
    IN_STOCK: ["LOW_STOCK", "OUT_OF_STOCK", "BLOCKED"],
    LOW_STOCK: ["REORDER_TRIGGERED", "IN_STOCK", "OUT_OF_STOCK"],
    REORDER_TRIGGERED: ["IN_TRANSIT", "LOW_STOCK", "OUT_OF_STOCK"],
    IN_TRANSIT: ["RECEIVED", "CANCELLED" as InventoryState],
    RECEIVED: ["IN_STOCK"],
    BLOCKED: ["IN_STOCK"]
  };
  const next = allowed[fromState] ?? [];
  return next.includes(toState);
};

const recordStateTransition = async (productId: number, fromState: InventoryState, toState: InventoryState): Promise<void> => {
  if (fromState === toState) {
    return;
  }
  if (!isValidTransition(fromState, toState)) {
    throw new Error(`Invalid inventory state transition from ${fromState} to ${toState}`);
  }
  await prisma.inventoryStateHistory.create({
    data: {
      productId,
      from_state: fromState,
      to_state: toState
    }
  });
};

export const InventoryService = {
  getInventory: async (productId: number) => {
    const inventory = await prisma.inventory.findUnique({
      where: { productId }
    });
    return inventory;
  },

  applyConsumption: async (productId: number, quantity: number, referenceId: string, type: "SALE" | "USAGE" | "ADJUSTMENT") => {
    return await withSerializableTransaction(async tx => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        include: { inventory: true }
      });
      if (!product) {
        throw new Error("Product not found");
      }
      const existingInventory = product.inventory;
      const fromState: InventoryState = existingInventory ? existingInventory.state : "OUT_OF_STOCK";
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          quantity_available: {
            decrement: quantity
          }
        }
      });
      if (inventory.quantity_available < 0) {
        throw new Error("Negative inventory not allowed");
      }
      const toState = computeNextState(
        inventory.quantity_available,
        inventory.blocked_quantity,
        product.reorder_level,
        fromState
      );
      await recordStateTransition(productId, fromState, toState);
      await tx.consumptionRecord.create({
        data: {
          productId,
          quantity,
          referenceId,
          type
        }
      });
      await AuditService.appendEvent(
        { name: "inventory.applyConsumption", productId },
        { quantity, referenceId, type }
      );
      if (toState === "OUT_OF_STOCK") {
        const message = "Inventory out of stock";
        await AlertService.createAlert(productId, "CRITICAL", message);
        await alertQueue.add("notify", { productId, level: "CRITICAL", message });
      } else if (toState === "LOW_STOCK") {
        const message = "Inventory low stock";
        await AlertService.createAlert(productId, "WARNING", message);
        await alertQueue.add("notify", { productId, level: "WARNING", message });
      }
      return inventory;
    });
  },

  markReorderTriggered: async (productId: number) => {
    return await withSerializableTransaction(async tx => {
      const current = await tx.inventory.findUnique({ where: { productId } });
      if (!current) {
        throw new Error("Inventory not found");
      }
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error("Product not found");
      }
      const fromState = current.state;
      const toState: InventoryState = "REORDER_TRIGGERED";
      await recordStateTransition(productId, fromState, toState);
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          state: toState
        }
      });
      await AuditService.appendEvent(
        { name: "inventory.markReorderTriggered", productId },
        { previousState: fromState }
      );
      return inventory;
    });
  },

  addIncoming: async (productId: number, quantity: number) => {
    return await withSerializableTransaction(async tx => {
      const current = await tx.inventory.findUnique({ where: { productId } });
      if (!current) {
        throw new Error("Inventory not found");
      }
      const fromState = current.state;
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          quantity_in_transit: {
            increment: quantity
          },
          state: "IN_TRANSIT"
        }
      });
      await recordStateTransition(productId, fromState, "IN_TRANSIT");
      await AuditService.appendEvent(
        { name: "inventory.addIncoming", productId },
        { quantity }
      );
      return inventory;
    });
  },

  receiveStock: async (productId: number, quantity: number) => {
    return await withSerializableTransaction(async tx => {
      const current = await tx.inventory.findUnique({ where: { productId } });
      if (!current) {
        throw new Error("Inventory not found");
      }
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error("Product not found");
      }
      const fromState = current.state;
      const intermediate = await tx.inventory.update({
        where: { productId },
        data: {
          quantity_available: {
            increment: quantity
          },
          quantity_in_transit: {
            decrement: quantity
          },
          state: "RECEIVED"
        }
      });
      await recordStateTransition(productId, fromState, "RECEIVED");
      const toState = computeNextState(
        intermediate.quantity_available,
        intermediate.blocked_quantity,
        product.reorder_level,
        "RECEIVED"
      );
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          state: toState
        }
      });
      await recordStateTransition(productId, "RECEIVED", toState);
      await AuditService.appendEvent(
        { name: "inventory.receiveStock", productId },
        { quantity }
      );
      return inventory;
    });
  },

  setBlocked: async (productId: number, blockedQuantity: number) => {
    return await withSerializableTransaction(async tx => {
      const current = await tx.inventory.findUnique({ where: { productId } });
      if (!current) {
        throw new Error("Inventory not found");
      }
      const product = await tx.product.findUnique({ where: { id: productId } });
      if (!product) {
        throw new Error("Product not found");
      }
      const fromState = current.state;
      const updated = await tx.inventory.update({
        where: { productId },
        data: {
          blocked_quantity: blockedQuantity
        }
      });
      const toState = computeNextState(
        updated.quantity_available,
        updated.blocked_quantity,
        product.reorder_level,
        fromState
      );
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          state: toState
        }
      });
      await recordStateTransition(productId, fromState, toState);
      await AuditService.appendEvent(
        { name: "inventory.setBlocked", productId },
        { blockedQuantity }
      );
      return inventory;
    });
  }
};

