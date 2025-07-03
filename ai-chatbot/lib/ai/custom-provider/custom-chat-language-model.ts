import type {
  LanguageModelV2,
  LanguageModelV2CallWarning,
  LanguageModelV2Content,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
  LanguageModelV2FinishReason,
} from '@ai-sdk/provider';
import {
  createJsonResponseHandler,
  postJsonToApi,
  createJsonErrorResponseHandler,
} from '@ai-sdk/provider-utils';
import { z } from 'zod';

// Schema for the backend API response, this will be transformed to match LanguageModelV2
const customChatResponseSchema = z.object({
  choices: z.array(
    z.object({
      message: z.object({
        content: z.string().nullable(),
        // Additional fields like tool_calls could be added here as the backend supports them
      }),
      finish_reason: z.string().optional(),
    }),
  ),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number().optional(),
  }),
});

const customErrorResponseSchema = z.object({
  error: z.object({
    message: z.string(),
  }),
});

export interface CustomChatConfig {
  provider: string;
  baseURL: string;
  headers: () => Record<string, string | undefined>;
}

export class CustomChatLanguageModel implements LanguageModelV2 {
  readonly specificationVersion = 'v2';
  readonly modelId: string;
  readonly supportedUrls: LanguageModelV2['supportedUrls'] = {};
  private readonly config: CustomChatConfig;

  constructor(modelId: string, config: CustomChatConfig) {
    this.modelId = modelId;
    this.config = config;
  }

  get provider(): string {
    return this.config.provider;
  }

  private getArgs(options: LanguageModelV2CallOptions) {
    const warnings: LanguageModelV2CallWarning[] = [];

    const messages = options.prompt
      .map(promptMessage => {
        if (promptMessage.role === 'system') {
          return { role: 'system', content: promptMessage.content };
        }

        if (promptMessage.role === 'user' || promptMessage.role === 'assistant') {
          if (Array.isArray(promptMessage.content)) {
            const content = promptMessage.content.reduce((acc, part) => {
              if (part.type === 'text') {
                return acc + part.text;
              }
              return acc;
            }, '');
            return { role: promptMessage.role, content };
          }
        }
        return null;
      })
      .filter(Boolean);

    const body = {
      messages,
      model: this.modelId,
      stream: false,
      user_id: (options.providerOptions?.['custom-rag-provider'] as { user?: string })?.user,
      temperature: options.temperature,
      max_tokens: options.maxOutputTokens,
    };

    return { args: body, warnings };
  }

  async doGenerate(options: LanguageModelV2CallOptions): Promise<{
    content: LanguageModelV2Content[];
    finishReason: LanguageModelV2FinishReason;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
    };
    warnings: LanguageModelV2CallWarning[];
  }> {
    const { args: body, warnings } = this.getArgs(options);

    try {
      const { value: response } = await postJsonToApi({
        url: `${this.config.baseURL}/chat/completions`,
        headers: this.config.headers(),
        body,
        failedResponseHandler: createJsonErrorResponseHandler({
          errorSchema: customErrorResponseSchema,
          errorToMessage: data => data.error.message,
        }),
        successfulResponseHandler: createJsonResponseHandler(
          customChatResponseSchema,
        ),
        abortSignal: options.abortSignal,
      });

      const choice = response.choices[0];
      // Explicitly type content as LanguageModelV2Text
      const content: LanguageModelV2Content[] = choice.message.content
        ? [{ type: 'text' as const, text: choice.message.content }]
        : [];

      // Map backend finish_reason to LanguageModelV2 finishReason format
      const finishReason: LanguageModelV2FinishReason = (() => {
        const reason = choice.finish_reason || 'stop';
        switch (reason) {
          case 'stop': return 'stop';
          case 'length': return 'length';
          case 'content_filter': return 'content-filter';
          case 'tool_calls': return 'tool-calls';
          default: return 'unknown';
        }
      })();

      return {
        content,
        finishReason,
        usage: {
          inputTokens: response.usage.prompt_tokens,
          outputTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens || 
            (response.usage.prompt_tokens + response.usage.completion_tokens),
        },
        warnings,
      };
    } catch (error: unknown) {
      // In development environment, provide a mock response if backend is unavailable
      if (process.env.NODE_ENV === 'development' && 
          error instanceof Error && 
          error.toString().includes('ECONNREFUSED')) {
        console.warn('Backend unavailable. Returning mock response for development.');
        
        const mockWarning: LanguageModelV2CallWarning = {
          type: 'other',
          message: 'Using mock response in development mode',
        };
        
        return {
          content: [{ type: 'text' as const, text: 'This is a mock response because the backend is not available. Please start the backend server or check the connection.' }],
          finishReason: 'stop',
          usage: {
            inputTokens: 10,
            outputTokens: 20,
            totalTokens: 30,
          },
          warnings: [...warnings, mockWarning],
        };
      }
      throw error;
    }
  }

  async doStream(
    options: LanguageModelV2CallOptions,
  ): Promise<{ stream: ReadableStream<LanguageModelV2StreamPart> }> {
    console.warn(
      'Streaming not implemented for custom provider, falling back to generate.',
    );
    const { content, finishReason, usage, warnings } = await this.doGenerate(options);

    const stream = new ReadableStream<LanguageModelV2StreamPart>({
      start(controller) {
        controller.enqueue({ type: 'stream-start', warnings });
        if (content.length > 0 && content[0].type === 'text') {
          controller.enqueue({ type: 'text-start', id: '0' });
          controller.enqueue({
            type: 'text-delta',
            id: '0',
            delta: content[0].text,
          });
          controller.enqueue({ type: 'text-end', id: '0' });
        }
        controller.enqueue({ type: 'finish', finishReason, usage });
        controller.close();
      },
    });

    return { stream };
  }
}
