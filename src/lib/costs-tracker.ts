import {
  addUsage,
  getCostSummary,
  CostSummary,
  type CostData,
  type TokenUsage,
} from '.';

let costs: CostData[] = [];

export function addCliUsage(modelName: string, usage: TokenUsage): void {
  costs = addUsage(costs, modelName, usage);
}

export function getCliCostSummary(): CostSummary {
  return getCostSummary(costs);
}
