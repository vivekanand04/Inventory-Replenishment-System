import { computeReorderQuantity } from "../reorderAlgorithm";

describe("computeReorderQuantity", () => {
  it("returns no reorder when consumption is zero", () => {
    const result = computeReorderQuantity({
      productId: 1,
      reorderMin: 10,
      reorderMax: 100,
      leadTimeDays: 5,
      safetyStock: 0,
      quantityAvailable: 100,
      quantityInTransit: 0,
      recentConsumptions: []
    });
    expect(result.shouldReorder).toBe(false);
    expect(result.reorderQuantity).toBe(0);
  });
});

