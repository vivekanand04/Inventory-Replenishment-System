import { prisma } from "../prismaClient";
import { AlertService } from "./alertService";
import { AuditService } from "./auditService";
import { InventoryService } from "./inventoryService";
import { alertQueue } from "../queues";

export const PurchaseOrderService = {
  createPO: async (reorderId: number) => {
    const reorder = await prisma.reorder.findUnique({
      where: { id: reorderId }
    });
    if (!reorder) {
      throw new Error("Reorder not found");
    }
    const supplier = await prisma.supplier.findFirst();
    if (!supplier) {
      throw new Error("Supplier not found");
    }
    const po = await prisma.purchaseOrder.create({
      data: {
        supplierId: supplier.id,
        reorderId: reorder.id,
        status: "CREATED",
        total_cost: 0
      }
    });
    await prisma.reorder.update({
      where: { id: reorder.id },
      data: {
        status: "CREATED_PO"
      }
    });
    await AuditService.appendEvent(
      { name: "po.create", productId: reorder.productId },
      { reorderId: reorder.id, purchaseOrderId: po.id }
    );
    return po;
  },

  sendToSupplier: async (poId: number) => {
    const po = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: "SENT"
      }
    });
    await AuditService.appendEvent(
      { name: "po.sendToSupplier" },
      { purchaseOrderId: poId }
    );
    return po;
  },

  applyReceipt: async (poId: number, lines: { productId: number; quantityReceived: number }[]) => {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId }
    });
    if (!po) {
      throw new Error("Purchase order not found");
    }
    if (!po.reorderId) {
      throw new Error("Purchase order has no linked reorder");
    }
    const reorder = await prisma.reorder.findUnique({
      where: { id: po.reorderId }
    });
    if (!reorder) {
      throw new Error("Linked reorder not found");
    }

    let totalQuantity = 0;
    for (const line of lines) {
      if (line.quantityReceived < 0) {
        throw new Error("Negative receipt quantity not allowed");
      }
      totalQuantity += line.quantityReceived;
    }

    const orderedQuantity = reorder.reorder_quantity;
    let status: "PARTIAL" | "RECEIVED";
    if (totalQuantity === 0) {
      status = "PARTIAL";
    } else if (totalQuantity < orderedQuantity) {
      status = "PARTIAL";
    } else {
      status = "RECEIVED";
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status
      }
    });

    for (const line of lines) {
      if (line.quantityReceived > 0) {
        await InventoryService.receiveStock(line.productId, line.quantityReceived);
        const message = "Stock received";
        await AlertService.createAlert(line.productId, "INFO", message);
        await alertQueue.add("notify", { productId: line.productId, level: "INFO", message });
      }
    }

    await AuditService.appendEvent(
      { name: "po.applyReceipt", productId: reorder.productId },
      { purchaseOrderId: poId, lines, totalQuantity, orderedQuantity, resultingStatus: status }
    );

    return updated;
  },

  applySupplierStatus: async (poId: number, status: string) => {
    const normalized = status.toUpperCase();
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: poId }
    });
    if (!po) {
      throw new Error("Purchase order not found");
    }

    let updatedStatus = po.status;
    if (normalized === "SHIPPED") {
      updatedStatus = "SENT";
    } else if (normalized === "DELAYED") {
      updatedStatus = po.status;
    } else if (normalized === "CANCELLED") {
      updatedStatus = "CANCELLED";
    }

    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status: updatedStatus
      }
    });

    // If the PO is linked to a reorder, use its product for alerts/audit context
    if (po.reorderId) {
      const reorder = await prisma.reorder.findUnique({ where: { id: po.reorderId } });
      const productId = reorder?.productId;
      if (normalized === "DELAYED" && productId) {
        const message = "Purchase order delayed";
        await AlertService.createAlert(productId, "WARNING", message);
        await alertQueue.add("notify", { productId, level: "WARNING", message });
      }
      if (normalized === "CANCELLED" && productId) {
        const message = "Purchase order cancelled by supplier";
        await AlertService.createAlert(productId, "CRITICAL", message);
        await alertQueue.add("notify", { productId, level: "CRITICAL", message });
      }
      await AuditService.appendEvent(
        { name: "po.applySupplierStatus", productId },
        { purchaseOrderId: poId, supplierStatus: normalized, resultingStatus: updatedStatus }
      );
    } else {
      await AuditService.appendEvent(
        { name: "po.applySupplierStatus" },
        { purchaseOrderId: poId, supplierStatus: normalized, resultingStatus: updatedStatus }
      );
    }

    return updated;
  }
};

