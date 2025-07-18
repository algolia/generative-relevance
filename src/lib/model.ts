import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';

export const DEFAULT_MODEL = 'claude-3-5-haiku-latest';

const ANTHROPIC_MODELS = [
  'claude-3-5-haiku-latest',
  'claude-3-5-sonnet-latest',
] as const;

const OPENAI_MODELS = ['gpt-4.1-nano'] as const;

const SUPPORTED_MODELS = [...ANTHROPIC_MODELS, ...OPENAI_MODELS];

export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

export function createModel(modelName: string = DEFAULT_MODEL) {
  if (!SUPPORTED_MODELS.includes(modelName as SupportedModel)) {
    throw new Error(
      `Unsupported model: ${modelName}. Supported models: ${SUPPORTED_MODELS.join(
        ', '
      )}`
    );
  }

  // Use OpenAI provider for OpenAI models
  if (OPENAI_MODELS.includes(modelName as any)) {
    return openai(modelName);
  }

  // Use Anthropic provider for Claude models
  return anthropic(modelName);
}

export function getModelProvider(modelName: string): 'anthropic' | 'openai' {
  if (OPENAI_MODELS.includes(modelName as any)) {
    return 'openai';
  }
  return 'anthropic';
}

// Export default model for backward compatibility
export const model = createModel();
