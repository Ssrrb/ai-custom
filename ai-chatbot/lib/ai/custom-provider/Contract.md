# Custom AI Provider API Contract

This document outlines the contract between the Vercel AI SDK frontend provider (`CustomChatLanguageModel`) and the backend API it communicates with. Adhering to this contract is essential for ensuring seamless integration with the Vercel AI SDK's `LanguageModelV2` interface.

## 1. API Endpoint

The backend must expose the following endpoint for chat completions:

- **URL**: `/chat/completions`
- **Method**: `POST`

*Note: The base URL (e.g., `http://127.0.0.1:8000/api/v1`) is configured in the frontend and prepended to this path.*

## 2. Headers

All requests will include the following header:

```json
{
  "Content-Type": "application/json"
}
```

## 3. Request Payload

The `POST` request to `/chat/completions` will have a JSON body with the following structure:

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Your system prompt here..."
    },
    {
      "role": "user",
      "content": "The user's message here..."
    },
    {
      "role": "assistant",
      "content": "Previous assistant response..."
    }
  ],
  "model": "custom-rag-model",
  "stream": false,
  "user_id": "user-identifier",
  "temperature": 0.7,
  "max_tokens": 1024
}
```

### Field Descriptions:

- `messages` (array, required): A list of message objects representing the conversation history.
  - Each message must have `role` ("system", "user", or "assistant") and `content` (string).
- `model` (string, required): The identifier for the model.
- `stream` (boolean): Whether to return a streaming response.
  - `false` for standard synchronous response.
  - `true` for Server-Sent Events (SSE) streaming response.
- `user_id` (string, optional): A unique identifier for the end-user.
- `temperature` (number, optional): The sampling temperature.
- `max_tokens` (number, optional): The maximum number of tokens to generate.

## 4. Response Formats

### 4.1. Synchronous Response (stream: false) - Status `200 OK`

For a non-streaming request, the backend must respond with a JSON object with the following structure:

```json
{
  "choices": [
    {
      "message": {
        "content": "The generated response from the AI model."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 120,
    "completion_tokens": 88,
    "total_tokens": 208
  }
}
```

#### Field Descriptions:

- `choices` (array, required): A list of generated responses. The frontend uses the first element.
  - `message` (object, required): Contains the response content.
    - `content` (string, nullable): The text of the AI's response.
  - `finish_reason` (string, required): Why the model stopped generating.
    - Possible values: "stop", "length", "content_filter", "tool_calls", or null.
- `usage` (object, required): Token usage information.
  - `prompt_tokens` (number): Tokens in the input prompt.
  - `completion_tokens` (number): Tokens in the generated response.
  - `total_tokens` (number): Total tokens used.

### 4.2. Streaming Response (stream: true) - Status `200 OK`

For streaming requests, the response should be formatted as Server-Sent Events (SSE), with each event being a JSON object.

Each event should have the format:

```
data: {"choices":[{"delta":{"content":"chunk of text"}}]}

```

The final event should indicate completion:

```
data: {"choices":[{"finish_reason":"stop"}], "usage":{"prompt_tokens":120, "completion_tokens":88, "total_tokens":208}}

data: [DONE]

```

#### Streaming Field Descriptions:

- `choices[0].delta.content` (string): A chunk of the generated text.
- `choices[0].finish_reason` (string): Same as non-streaming (sent in final chunk).
- `usage` (object): Token usage information (sent in final chunk).

### 4.3. Error Response (Status `4xx` or `5xx`)

If an error occurs, the backend should respond with a JSON object containing an `error` key:

```json
{
  "error": {
    "message": "A descriptive error message explaining what went wrong."
  }
}
```

## 5. LanguageModelV2 Interface Compatibility

The response format is designed to be compatible with the Vercel AI SDK's `LanguageModelV2` interface. The frontend provider will map the backend response to the following structure:

```typescript
{
  content: [{ type: 'text', text: choice.message.content }],
  finishReason: finishReasonMapping[choice.finish_reason] || 'unknown',
  usage: {
    inputTokens: response.usage.prompt_tokens,
    outputTokens: response.usage.completion_tokens,
    totalTokens: response.usage.total_tokens
  },
  warnings: []
}
```

Where `finishReasonMapping` converts backend finish reason values to the appropriate `LanguageModelV2FinishReason` values.
1-Backend developers only need the Response Format to implement the API
2-Frontend developers need the Interface Compatibility to understand how the backend responses are adapted to the SDK
3-Full-stack developers benefit from seeing both the raw format and how it's transformed
