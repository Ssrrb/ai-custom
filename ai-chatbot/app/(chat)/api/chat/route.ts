import {
  convertToModelMessages,
  createUIMessageStream,
  JsonToSseTransformStream,
  smoothStream,
  stepCountIs,
  streamText,
} from 'ai';
import { auth, type UserType } from '@/app/(auth)/auth';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import {
  createStreamId,
  deleteChatById,
  getChatById,
  getMessageCountByUserId,
  getMessagesByChatId,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { postRequestBodySchema, type PostRequestBody } from './schema';
import { geolocation } from '@vercel/functions';
import {
  createResumableStreamContext,
  type ResumableStreamContext,
} from 'resumable-stream';
import { after } from 'next/server';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { ChatModel } from '@/lib/ai/models';
import type { VisibilityType } from '@/components/visibility-selector';
export const maxDuration = 60;

let globalStreamContext: ResumableStreamContext | null = null;

export function getStreamContext() {
  if (!globalStreamContext) {
    try {
      globalStreamContext = createResumableStreamContext({
        waitUntil: after,
      });
    } catch (error: any) {
      if (error.message.includes('REDIS_URL')) {
        console.log(
          ' > Resumable streams are disabled due to missing REDIS_URL',
        );
      } else {
        console.error(error);
      }
    }
  }

  return globalStreamContext;
}

export async function POST(request: Request) {
  console.log('\n--- DEBUG: POST /api/chat ---');
  let requestBody: PostRequestBody;

  try {
    const json = await request.json();
    requestBody = postRequestBodySchema.parse(json);
  } catch (_) {
    console.error('DEBUG: Failed to parse request body.');
    return new ChatSDKError('bad_request:api').toResponse();
  }

  try {
    const {
      id,
      message,
      selectedChatModel,
      selectedVisibilityType,
    }: {
      id: string;
      message: ChatMessage;
      selectedChatModel: ChatModel['id'];
      selectedVisibilityType: VisibilityType;
    } = requestBody;

    console.log('DEBUG: Request body parsed:', { id, selectedChatModel });

    const session = await auth();

    if (!session?.user) {
      console.error('DEBUG: Unauthorized - No session or user found.');
      return new ChatSDKError('unauthorized:chat').toResponse();
    }

    console.log(`DEBUG: Authenticated user: ${session.user.id}`);
    const userType: UserType = session.user.type;

    const messageCount = await getMessageCountByUserId({
      id: session.user.id,
      differenceInHours: 24,
    });

    if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
      console.error('DEBUG: Rate limit exceeded.');
      return new ChatSDKError('rate_limit:chat').toResponse();
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message,
      });

      await saveChat({
        id,
        userId: session.user.id,
        title,
        visibility: selectedVisibilityType,
      });
    } else {
      if (chat.userId !== session.user.id) {
        console.error('DEBUG: Forbidden - Chat does not belong to user.');
        return new ChatSDKError('forbidden:chat').toResponse();
      }
    }

    const messagesFromDb = await getMessagesByChatId({ id });
    const uiMessages = [message, ...convertToUIMessages(messagesFromDb)];

    const { longitude, latitude, city, country } = geolocation(request);

    const requestHints: RequestHints = {
      longitude,
      latitude,
      city,
      country,
    };

    await saveMessages({
      messages: [
        {
          chatId: id,
          userId: session.user.id,
          id: message.id,
          role: 'user',
          parts: message.parts,
          attachments: [],
          createdAt: new Date(),
        },
      ],
    });

    const streamId = generateUUID();
    await createStreamId({ streamId, chatId: id });

    const stream = createUIMessageStream({
      execute: ({ writer: dataStream }) => {
        console.log(`DEBUG: Using chat model: ${selectedChatModel}`);
        const model = myProvider.languageModel(selectedChatModel);
        console.log('DEBUG: Provider and model selected:', {
          provider: model.provider,
          modelId: model.modelId,
        });

        console.log(
          'DEBUG: uiMessages structure:',
          JSON.stringify(
            {
              messageCount: uiMessages.length,
              firstMessage: uiMessages[0]
                ? {
                    id: uiMessages[0].id,
                    role: uiMessages[0].role,
                    partsCount: uiMessages[0].parts
                      ? uiMessages[0].parts.length
                      : 0,
                    partsTypes: uiMessages[0].parts
                      ? uiMessages[0].parts.map((p) => p.type)
                      : [],
                  }
                : 'No messages',
              allMessages: uiMessages.map((m) => ({
                id: m.id,
                role: m.role,
                hasValidParts: Array.isArray(m.parts) && m.parts.length > 0,
              })),
            },
            null,
            2,
          ),
        );

        console.log('DEBUG: Original uiMessages length:', uiMessages.length);

        // Create strictly typed valid messages conforming to what convertToModelMessages expects
        const validatedMessages = uiMessages
          .filter((msg) => msg && typeof msg.role === 'string') // Filter out undefined or malformed messages
          .map((msg) => {
            const role = msg.role as 'user' | 'assistant' | 'system';

            // Ensure all parts have valid type and content properties
            const validParts = Array.isArray(msg.parts)
              ? msg.parts
                  .filter((part) => part && typeof part === 'object')
                  .map((part) => {
                    // Ensure part is of type 'text' with valid text content
                    if (!part.type || typeof part.type !== 'string') {
                      console.log(
                        `DEBUG: Adding missing type to part in message ${msg.id}`,
                      );
                      return { type: 'text' as const, text: 'Empty content' };
                    } else if (part.type === 'text') {
                      // For text parts, ensure they have valid text content
                      const textPart = part as { type: 'text'; text?: unknown };
                      if (!textPart.text || typeof textPart.text !== 'string') {
                        console.log(
                          `DEBUG: Fixing invalid text content in message ${msg.id}`,
                        );
                        return { type: 'text' as const, text: 'Empty content' };
                      }
                    }

                    // Return the part as is if it has valid type and content
                    return part;
                  })
              : [];

            // If no valid parts, create a default text part
            if (validParts.length === 0) {
              console.log(
                `DEBUG: Creating default text part for message ${msg.id}`,
              );
              validParts.push({ type: 'text' as const, text: 'No content' });
            }

            return {
              role,
              id: msg.id,
              parts: validParts,
            };
          });

        console.log(
          'DEBUG: Validated messages ready for conversion, count:',
          validatedMessages.length,
        );
        console.log(
          'DEBUG: First validated message:',
          JSON.stringify(validatedMessages[0], null, 2),
        );

        const result = streamText({
          model: model, // Use the resolved model
          system: systemPrompt({ selectedChatModel, requestHints }),
          messages: convertToModelMessages(validatedMessages),
          stopWhen: stepCountIs(5),
          experimental_activeTools:
            selectedChatModel === 'chat-model-reasoning'
              ? []
              : [
                  'getWeather',
                  'createDocument',
                  'updateDocument',
                  'requestSuggestions',
                ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          tools: {
            getWeather,
            createDocument: createDocument({ session, dataStream }),
            updateDocument: updateDocument({ session, dataStream }),
            requestSuggestions: requestSuggestions({
              session,
              dataStream,
            }),
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        console.log('DEBUG: streamText call initiated. Result object:', result);

        result.consumeStream();

        dataStream.merge(
          result.toUIMessageStream({
            sendReasoning: true,
          }),
        );
      },
      generateId: generateUUID,
      onFinish: async ({ messages }) => {
        await saveMessages({
          messages: messages.map((message) => ({
            id: message.id,
            userId: session.user.id,
            role: message.role,
            parts: message.parts,
            createdAt: new Date(),
            attachments: [],
            chatId: id,
          })),
        });
      },
    });

    const streamContext = getStreamContext();
    if (streamContext) {
      return new Response(
        await streamContext.resumableStream(streamId, () =>
          stream.pipeThrough(new JsonToSseTransformStream()),
        ),
      );
    } else {
      return new Response(stream);
    }
  } catch (error) {
    if (error instanceof ChatSDKError) {
      console.error('DEBUG: Caught ChatSDKError:', error);
      return error.toResponse();
    }

    console.error('DEBUG: Unhandled error in POST /api/chat:', error);
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (!id) {
    console.error('DEBUG: Bad request - Missing id parameter.');
    return new ChatSDKError('bad_request:api').toResponse();
  }

  const session = await auth();

  if (!session?.user) {
    console.error('DEBUG: Unauthorized - No session or user found.');
    return new ChatSDKError('unauthorized:chat').toResponse();
  }

  const chat = await getChatById({ id });

  if (!chat) {
    console.error('DEBUG: Not found - Chat does not exist.');
    return new ChatSDKError('not_found:chat').toResponse();
  }

  if (chat.userId !== session.user.id) {
    console.error('DEBUG: Forbidden - Chat does not belong to user.');
    return new ChatSDKError('forbidden:chat').toResponse();
  }

  const deletedChat = await deleteChatById({ id });

  return Response.json(deletedChat, { status: 200 });
}
