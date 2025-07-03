import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { xai } from '@ai-sdk/xai';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { isTestEnvironment } from '../constants';
import { customRagProvider } from '@/lib/ai/custom-provider/custom-provider';

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
        'title-model': customRagProvider('custom-rag-model'),
        'artifact-model': customRagProvider('custom-rag-model'),
        'rag-pipeline-v1': customRagProvider('custom-rag-model'),
      },
      imageModels: {
        'small-model': xai.imageModel('grok-2-image'),
      },
    });
