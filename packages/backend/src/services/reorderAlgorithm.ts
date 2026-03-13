import { ReorderEvaluationInput, ReorderEvaluationResult } from "shared";
import { config } from "../config";

const clamp = (value: number, min: number, max: number): number => {
  if (value < min) {
    return min;
  }
  if (value > max) {
    return max;
  }
  return value;
};

export const computeReorderQuantity = (input: ReorderEvaluationInput): ReorderEvaluationResult => {
  const days = config.avgDays;
  const history = input.recentConsumptions.slice(-days);
  const sum = history.reduce((acc: number, v: number) => acc + v, 0);
  const avgDailyConsumption = history.length === 0 ? 0 : sum / history.length;
  const safetyStockFromAvg = Math.ceil(avgDailyConsumption * config.safetyMultiplier);
  const safetyStockUsed = input.safetyStock > 0 ? input.safetyStock : safetyStockFromAvg;
  const expectedConsumptionDuringLead = avgDailyConsumption * input.leadTimeDays;
  const need = Math.ceil(expectedConsumptionDuringLead + safetyStockUsed - (input.quantityAvailable + input.quantityInTransit));
  if (need <= 0) {
    return {
      shouldReorder: false,
      reorderQuantity: 0,
      avgDailyConsumption,
      safetyStockUsed
    };
  }
  const reorderQuantity = clamp(need, input.reorderMin, input.reorderMax);
  return {
    shouldReorder: true,
    reorderQuantity,
    avgDailyConsumption,
    safetyStockUsed
  };
};

