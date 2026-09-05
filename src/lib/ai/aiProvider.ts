import { AIProvider } from './types';
import { OpenAIProvider } from './openaiProvider';

let providerInstance: AIProvider | null = null;

/**
 * Returns the active AI Provider implementation.
 * Currently uses OpenAIProvider, with clean abstraction to swap providers if needed in the future.
 */
export function getAIProvider(): AIProvider {
  if (!providerInstance) {
    providerInstance = new OpenAIProvider();
  }
  return providerInstance;
}

export const aiProvider: AIProvider = new OpenAIProvider();

export * from './types';
export * from './config';
export * from './contextBuilder';
export * from './conflictService';
export * from './schemas/callAnalysisSchema';
export * from './schemas/demoPlanSchema';
export * from './schemas/whatsappSchema';
export * from './schemas/coachSchema';
export * from './prompts/demoPlanPrompt';
export * from './prompts/whatsappPrompt';
export * from './prompts/coachPrompt';
