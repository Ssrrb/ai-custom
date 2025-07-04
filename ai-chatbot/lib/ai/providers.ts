import {
  createProviderRegistry,
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { createOpenAI, openai } from '@ai-sdk/openai';
import { xai } from '@ai-sdk/xai';
import { isTestEnvironment } from '../constants';
import { customRagProvider } from '@/lib/ai/custom-provider/custom-provider';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

export const registry = createProviderRegistry({
  // register provider with prefix and default setup:
  custom: customProvider({
    languageModels: {
      'chat-model': chatModel,
      'chat-model-reasoning': reasoningModel,
      'title-model': titleModel,
      'artifact-model': artifactModel,
      'rag-pipeline-v1': customRagProvider('custom-rag-model'),
    },
  }),

  // register provider with prefix and custom setup:
  openai: createOpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  }),
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
        'rag-pipeline-v1': customRagProvider('custom-rag-model'),
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': customRagProvider('custom-rag-model'),
        'chat-model-reasoning': wrapLanguageModel({
          model: customRagProvider('custom-rag-model'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': openai('gpt-4o-mini'),
        'artifact-model': customRagProvider('custom-rag-model'),
        'rag-pipeline-v1': customRagProvider('custom-rag-model'),
      },
      imageModels: {
        'small-model': xai.imageModel('grok-2-image'),
      },
    });
