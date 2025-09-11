import { CostSummary } from '../../lib';

export function formatCostSummary(summary: CostSummary): string {
  const { totalCost, totalUsage, costsByModel } = summary;

  let output = `\n💰 Cost Summary\n`;
  output += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
  output += `Total Cost: $${totalCost.toFixed(4)}\n`;
  output += `Total Tokens: ${totalUsage.totalTokens.toLocaleString()}\n`;
  output += `  • Input: ${totalUsage.inputTokens.toLocaleString()}\n`;
  output += `  • Output: ${totalUsage.outputTokens.toLocaleString()}\n`;

  if (Object.keys(costsByModel).length > 1) {
    output += `\nBy Model:\n`;

    for (const [modelName, data] of Object.entries(costsByModel)) {
      output += `  • ${modelName}: $${data.cost.toFixed(
        4
      )} (${data.usage.totalTokens.toLocaleString()} tokens)\n`;
    }
  }

  return output;
}
