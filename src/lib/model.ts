import { anthropic } from '@ai-sdk/anthropic';

export const DEFAULT_MODEL = 'claude-3-5-haiku-latest';

export const SUPPORTED_MODELS = [
  'claude-3-5-haiku-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-opus-latest'
] as const;

export type SupportedModel = typeof SUPPORTED_MODELS[number];

export function createModel(modelName: string = DEFAULT_MODEL) {
  if (!SUPPORTED_MODELS.includes(modelName as SupportedModel)) {
    throw new Error(`Unsupported model: ${modelName}. Supported models: ${SUPPORTED_MODELS.join(', ')}`);
  }
  return anthropic(modelName);
}

// Export default model for backward compatibility
export const model = createModel();
