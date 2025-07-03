import type { LanguageModelV2 } from '@ai-sdk/provider';
import { CustomChatLanguageModel } from '@/lib/ai/custom-provider/custom-chat-language-model';
import type { CustomChatModelId } from './custom-chat-settings';

/**
 * A factory for creating custom chat models.
 */
export interface CustomProvider {
  (modelId: CustomChatModelId): LanguageModelV2;
  chat(modelId: CustomChatModelId): LanguageModelV2;
}

/**
 * Creates a new custom provider instance.
 * @param options - Configuration for the provider.
 * @param options.baseURL - The base URL of the custom provider's API.
 * @param options.headers - A function that returns headers to be sent with each request.
 * @returns A CustomProvider factory.
 */
export function createCustomProvider(options: {
  baseURL: string;
  headers?: () => Record<string, string | undefined>;
}): CustomProvider {
  const provider = (modelId: CustomChatModelId): LanguageModelV2 => {
    return new CustomChatLanguageModel(modelId, {
      provider: 'custom-rag-provider',
      baseURL: options.baseURL,
      headers: options.headers ?? (() => ({})),
    });
  };

  provider.chat = provider;

  return provider;
}

/**
 * The exported instance of our custom RAG provider.
 */
export const customRagProvider = createCustomProvider({
  baseURL: 'http://127.0.0.1:8000/api/v1',
  headers: () => ({
    'Content-Type': 'application/json',
    // Example for API key, manage this securely:
    // 'X-API-Key': process.env.PYTHON_BACKEND_API_KEY,
  }),
});
