import { getModelPricing } from './model';

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface CostData {
  modelName: string;
  usage: TokenUsage;
  cost: number;
}

export interface CostSummary {
  totalCost: number;
  totalUsage: TokenUsage;
  costsByModel: Record<string, { cost: number; usage: TokenUsage }>;
}

function calculateCost(modelName: string, usage: TokenUsage): number {
  const pricing = getModelPricing(modelName);

  if (!pricing) {
    console.warn(`Unknown model pricing for ${modelName}, using default rates`);

    return 0;
  }

  const inputCost = (usage.inputTokens / 1_000_000) * pricing.inputTokenCost;
  const outputCost =
    (usage.outputTokens / 1_000_000) * pricing.outputTokenCost;

  return inputCost + outputCost;
}

function getTotalCost(costs: CostData[]): number {
  return costs.reduce((total, { cost }) => total + cost, 0);
}

function getTotalTokens(costs: CostData[]): TokenUsage {
  return costs.reduce(
    (total, { usage }) => ({
      inputTokens: total.inputTokens + usage.inputTokens,
      outputTokens: total.outputTokens + usage.outputTokens,
      totalTokens: total.totalTokens + usage.totalTokens,
    }),
    { inputTokens: 0, outputTokens: 0, totalTokens: 0 }
  );
}

function getCostsByModel(
  costs: CostData[]
): Record<string, { cost: number; usage: TokenUsage }> {
  const result: Record<string, { cost: number; usage: TokenUsage }> = {};

  for (const { modelName, usage, cost } of costs) {
    if (!result[modelName]) {
      result[modelName] = {
        cost: 0,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
      };
    }

    result[modelName].cost += cost;
    result[modelName].usage.inputTokens += usage.inputTokens;
    result[modelName].usage.outputTokens += usage.outputTokens;
    result[modelName].usage.totalTokens += usage.totalTokens;
  }

  return result;
}

export function addUsage(
  costs: CostData[],
  modelName: string,
  usage: TokenUsage
): CostData[] {
  const cost = calculateCost(modelName, usage);

  return [...costs, { modelName, usage, cost }];
}

export function getCostSummary(costs: CostData[]): CostSummary {
  return {
    totalCost: getTotalCost(costs),
    totalUsage: getTotalTokens(costs),
    costsByModel: getCostsByModel(costs),
  };
}
