import type { LanguageModelV2 } from '@ai-sdk/provider';
import { CustomChatLanguageModel } from './custom-chat-language-model';

export interface CustomProvider {
  (modelId: string): LanguageModelV2;
  chat(modelId: string): LanguageModelV2;
}

export function createCustomProvider(
  options: {
    baseURL: string;
    headers?: () => Record<string, string | undefined>;
  } = {
    baseURL: 'http://127.0.0.1:8000/api/v1', // TODO: Cambiar a tu URL de API
  },
): CustomProvider {
  const provider = (modelId: string): LanguageModelV2 => {
    return new CustomChatLanguageModel(modelId, {
      provider: 'custom',
      baseURL: options.baseURL,
      headers: options.headers ?? (() => ({})),
    });
  };

  provider.chat = provider;

  return provider;
}
