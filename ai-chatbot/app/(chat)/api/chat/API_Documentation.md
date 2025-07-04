# Chat API Documentation

This document provides a detailed overview of the Chat API endpoints, request/response schemas, and data models.

## 1. API Endpoints

The API is located at `/app/(chat)/api/chat/` and exposes the following endpoints:

### 1.1. `POST /`

- **Description**: Initiates or continues a chat conversation. It processes the user's message, interacts with the AI model, and streams the response back to the client.
- **Request Body**: See [Request Body Schema](#2-request-body-schema) below.
- **Response**: A streaming response of Server-Sent Events (SSE) containing the AI-generated message parts.

### 1.2. `GET /`

- **Description**: Retrieves the details of a specific chat session.
- **Query Parameters**:
  - `id` (string, required): The UUID of the chat to retrieve.
- **Response**: A JSON object representing the chat session.

### 1.3. `DELETE /`

- **Description**: Deletes a specific chat session.
- **Query Parameters**:
  - `id` (string, required): The UUID of the chat to delete.
- **Response**: A JSON object of the deleted chat session.

## 2. Schemas

This API utilizes two primary types of schemas: a Zod schema for request validation and a Drizzle schema for database modeling.

### 2.1. Request Body Schema (`app/(chat)/api/chat/schema.ts`)

This Zod schema defines the expected structure of the `POST` request body. It ensures that incoming data is correctly formatted before being processed.

```typescript
export const postRequestBodySchema = z.object({
  id: z.string().uuid(),
  message: z.object({
    id: z.string().uuid(),
    role: z.enum(['user']),
    parts: z.array(z.union([
      z.object({ type: z.enum(['text']), text: z.string() }),
      z.object({ type: z.enum(['file']), mediaType: z.enum(['image/jpeg', 'image/png']), name: z.string(), url: z.string().url() })
    ])),
  }),
  selectedChatModel: z.enum(['chat-model', 'chat-model-reasoning', 'rag-pipeline-v1']),
  selectedVisibilityType: z.enum(['public', 'private']),
});
```

### 2.2. Database Schema (`lib/db/schema.ts`)

This Drizzle schema defines the structure of the database tables. It is used to interact with the database, including creating, reading, and updating records.

**`chat` Table:**
```typescript
export const chat = pgTable('chat', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('userId').notNull().references(() => user.id),
  // ... other fields
});
```

**`message` Table:**
```typescript
export const message = pgTable('message', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chatId').notNull().references(() => chat.id),
  userId: uuid('userId').notNull().references(() => user.id),
  role: varchar('role').notNull(),
  parts: json('parts').notNull(),
  // ... other fields
});
```

## 3. Schema Differences and Relationship

- **Purpose**: The **Zod schema** is for **validation** of incoming API requests, while the **Drizzle schema** is for **database modeling**.
- **Structure**: The Zod schema is tailored to the specific needs of the `POST` endpoint, whereas the Drizzle schema represents the complete structure of the data as it is stored in the database.
- **Relationship**: Data validated by the Zod schema is used to create or update records in the database according to the Drizzle schema. For example, the `message` from the request body is saved as a new record in the `message` table.
