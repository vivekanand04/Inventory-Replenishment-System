import { prisma } from "../prismaClient";
import { AlertService } from "./alertService";
import { AuditService } from "./auditService";

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
    let totalQuantity = 0;
    for (const line of lines) {
      totalQuantity += line.quantityReceived;
    }
    const status = totalQuantity > 0 ? "RECEIVED" : "PARTIAL";
    const updated = await prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        status
      }
    });
    for (const line of lines) {
      await AlertService.createAlert(line.productId, "INFO", "Stock received");
    }
    await AuditService.appendEvent(
      { name: "po.applyReceipt" },
      { purchaseOrderId: poId, lines }
    );
    return updated;
  }
};

