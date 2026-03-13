import { computeReorderQuantity } from "../reorderAlgorithm";

describe("computeReorderQuantity - additional scenarios", () => {
  it("triggers reorder when expected consumption during lead time exceeds available + in transit", () => {
    const result = computeReorderQuantity({
      productId: 1,
      reorderMin: 10,
      reorderMax: 100,
      leadTimeDays: 5,
      safetyStock: 0,
      quantityAvailable: 10,
      quantityInTransit: 0,
      recentConsumptions: [10, 10, 10, 10, 10]
    });

    expect(result.shouldReorder).toBe(true);
    expect(result.reorderQuantity).toBeGreaterThanOrEqual(10);
  });

  it("uses safety stock override when provided", () => {
    const result = computeReorderQuantity({
      productId: 1,
      reorderMin: 1,
      reorderMax: 100,
      leadTimeDays: 1,
      safetyStock: 50,
      quantityAvailable: 0,
      quantityInTransit: 0,
      recentConsumptions: [5, 5, 5, 5, 5]
    });

    expect(result.shouldReorder).toBe(true);
    expect(result.safetyStockUsed).toBe(50);
  });

  it("clamps reorder quantity between min and max", () => {
    const result = computeReorderQuantity({
      productId: 1,
      reorderMin: 10,
      reorderMax: 20,
      leadTimeDays: 10,
      safetyStock: 0,
      quantityAvailable: 0,
      quantityInTransit: 0,
      recentConsumptions: Array(30).fill(10)
    });

    expect(result.shouldReorder).toBe(true);
    expect(result.reorderQuantity).toBeGreaterThanOrEqual(10);
    expect(result.reorderQuantity).toBeLessThanOrEqual(20);
  });
}

