// Server-side AI Configuration
// Strictly server-only: DO NOT export via NEXT_PUBLIC_* or import into client components.

export interface AIConfig {
  apiKey: string | undefined;
  model: string;
  isConfigured: boolean;
}

export function getAIConfig(): AIConfig {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o';

  return {
    apiKey,
    model,
    isConfigured: Boolean(apiKey && apiKey.length > 0 && !apiKey.includes('your-key-here')),
  };
}
