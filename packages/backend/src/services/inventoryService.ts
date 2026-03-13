import { InventoryState } from "shared";
import { prisma, withSerializableTransaction } from "../prismaClient";
import { AlertService } from "./alertService";
import { AuditService } from "./auditService";

const nextStateForQuantities = (available: number, blocked: number): InventoryState => {
  if (blocked > 0) {
    return "BLOCKED";
  }
  if (available <= 0) {
    return "OUT_OF_STOCK";
  }
  if (available > 0) {
    return "IN_STOCK";
  }
  return "IN_STOCK";
};

const recordStateTransition = async (productId: number, fromState: InventoryState, toState: InventoryState): Promise<void> => {
  if (fromState === toState) {
    return;
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
      const toState = nextStateForQuantities(inventory.quantity_available, inventory.blocked_quantity);
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
        await AlertService.createAlert(productId, "CRITICAL", "Inventory out of stock");
      }
      return inventory;
    });
  },

  addIncoming: async (productId: number, quantity: number) => {
    return await withSerializableTransaction(async tx => {
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          quantity_in_transit: {
            increment: quantity
          },
          state: "IN_TRANSIT"
        }
      });
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
      const fromState = current.state;
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          quantity_available: {
            increment: quantity
          },
          quantity_in_transit: {
            decrement: quantity
          }
        }
      });
      const toState = nextStateForQuantities(inventory.quantity_available, inventory.blocked_quantity);
      await recordStateTransition(productId, fromState, toState);
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
      const fromState = current.state;
      const inventory = await tx.inventory.update({
        where: { productId },
        data: {
          blocked_quantity: blockedQuantity
        }
      });
      const toState = nextStateForQuantities(inventory.quantity_available, inventory.blocked_quantity);
      await recordStateTransition(productId, fromState, toState);
      await AuditService.appendEvent(
        { name: "inventory.setBlocked", productId },
        { blockedQuantity }
      );
      return inventory;
    });
  }
};

