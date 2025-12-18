/**
 * Stream Parser for Claude CLI stream-json output
 *
 * This module provides utilities for parsing the real-time JSON output
 * from the Claude CLI when invoked with `--output-format stream-json`.
 * It handles:
 * - Streaming JSON line parsing with buffering for incomplete lines
 * - Extraction of text content from assistant messages
 * - Tool use and result parsing
 * - Session ID and cost extraction
 * - Conversion to AgentOutput format for UI consumption
 *
 * @module core/agent/stream-parser
 *
 * @example
 * ```typescript
 * const proc = Bun.spawn(['claude', '-p', '--output-format', 'stream-json', 'Hello']);
 * for await (const message of parseJsonStream(proc.stdout)) {
 *   console.log(message.type, extractTextContent(message));
 * }
 * ```
 */

import type { StreamMessage, AgentOutput, ContentBlock } from "./types.js";
import { StreamMessageSchema, createAgentOutput } from "./types.js";

/**
 * Parse a single JSON line into a StreamMessage.
 *
 * Attempts to parse the line as JSON and validate it against the
 * StreamMessageSchema. Returns null if parsing fails or the line
 * is empty/whitespace-only.
 *
 * @param line - A single line of JSON text from the Claude CLI output
 * @returns The parsed StreamMessage, or null if parsing fails
 *
 * @example
 * ```typescript
 * const message = parseStreamMessage('{"type":"assistant","message":{"content":[{"type":"text","text":"Hello"}]}}');
 * if (message) {
 *   console.log(message.type); // "assistant"
 * }
 * ```
 */
export function parseStreamMessage(line: string): StreamMessage | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    const result = StreamMessageSchema.safeParse(parsed);

    if (!result.success) {
      // Log validation errors but still try to return the parsed object
      // This allows for forward compatibility with new message types
      console.warn(
        "[stream-parser] Message validation warning:",
        result.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      );
      // Return the raw parsed object if it has a type field
      if (parsed && typeof parsed.type === "string") {
        return parsed as unknown as StreamMessage;
      }
      return null;
    }

    return result.data as StreamMessage;
  } catch (error) {
    // Log warning for malformed JSON
    const preview = trimmed.length > 100 ? `${trimmed.slice(0, 100)}...` : trimmed;
    console.warn(`[stream-parser] Malformed JSON: ${preview}`);
    return null;
  }
}

/**
 * Extract text content from a StreamMessage.
 *
 * Handles multiple message structures:
 * - Messages with a `content` field directly containing text
 * - Messages with `message.content` array containing content blocks
 * - Filters for content blocks with `type: 'text'` and extracts the `text` field
 *
 * @param message - The StreamMessage to extract text from
 * @returns The extracted text content, or undefined if no text found
 *
 * @example
 * ```typescript
 * const message: StreamMessage = {
 *   type: "assistant",
 *   message: { content: [{ type: "text", text: "Hello world" }] }
 * };
 * const text = extractTextContent(message);
 * console.log(text); // "Hello world"
 * ```
 */
export function extractTextContent(message: StreamMessage): string | undefined {
  // Check for direct content field (some message types)
  if (typeof message.content === "string") {
    return message.content;
  }

  // Check for message.content array (assistant messages)
  if (message.message?.content && Array.isArray(message.message.content)) {
    const textBlocks = message.message.content.filter(
      (block): block is ContentBlock & { text: string } =>
        block.type === "text" && typeof block.text === "string"
    );

    if (textBlocks.length > 0) {
      return textBlocks.map((block) => block.text).join("");
    }
  }

  return undefined;
}

/**
 * Extract tool use information from a StreamMessage.
 *
 * Looks in the `message.content` array for blocks with `type: 'tool_use'`
 * and extracts the tool name and input parameters.
 *
 * @param message - The StreamMessage to extract tool use from
 * @returns Object containing tool name and input, or undefined if no tool use found
 *
 * @example
 * ```typescript
 * const message: StreamMessage = {
 *   type: "assistant",
 *   message: { content: [{ type: "tool_use", name: "Read", input: { file: "test.ts" } }] }
 * };
 * const toolUse = extractToolUse(message);
 * console.log(toolUse?.name); // "Read"
 * console.log(toolUse?.input); // { file: "test.ts" }
 * ```
 */
export function extractToolUse(
  message: StreamMessage
): { name: string; input: unknown } | undefined {
  // Check message.content array for tool_use blocks
  if (message.message?.content && Array.isArray(message.message.content)) {
    const toolBlock = message.message.content.find(
      (block): block is ContentBlock & { name: string } =>
        block.type === "tool_use" && typeof block.name === "string"
    );

    if (toolBlock) {
      return {
        name: toolBlock.name,
        input: toolBlock.input,
      };
    }
  }

  return undefined;
}

/**
 * Extract session ID from a StreamMessage.
 *
 * Session IDs are typically found in result messages and can be used
 * to resume conversations with the Claude CLI.
 *
 * @param message - The StreamMessage to extract session ID from
 * @returns The session ID, or undefined if not present
 *
 * @example
 * ```typescript
 * const message: StreamMessage = {
 *   type: "result",
 *   session_id: "sess_abc123",
 *   cost_usd: 0.05
 * };
 * const sessionId = extractSessionId(message);
 * console.log(sessionId); // "sess_abc123"
 * ```
 */
export function extractSessionId(message: StreamMessage): string | undefined {
  return message.session_id;
}

/**
 * Extract cost from a StreamMessage.
 *
 * Cost information (in USD) is typically found in result messages
 * at the end of a Claude CLI session.
 *
 * @param message - The StreamMessage to extract cost from
 * @returns The cost in USD, or undefined if not present
 *
 * @example
 * ```typescript
 * const message: StreamMessage = {
 *   type: "result",
 *   subtype: "success",
 *   cost_usd: 0.0234
 * };
 * const cost = extractCost(message);
 * console.log(cost); // 0.0234
 * ```
 */
export function extractCost(message: StreamMessage): number | undefined {
  return message.cost_usd;
}

/**
 * Convert a StreamMessage to an AgentOutput.
 *
 * Maps message types from the Claude CLI format to the internal
 * AgentOutput format for UI consumption:
 * - `assistant` with text -> AgentOutput type 'text'
 * - `assistant` with tool_use -> AgentOutput type 'tool_use'
 * - `tool_result` -> AgentOutput type 'tool_result'
 * - `error` -> AgentOutput type 'error'
 * - `result` with cost -> AgentOutput type 'cost'
 * - `system` -> AgentOutput type 'system'
 *
 * @param message - The StreamMessage to convert
 * @returns The converted AgentOutput
 *
 * @example
 * ```typescript
 * const message: StreamMessage = {
 *   type: "assistant",
 *   message: { content: [{ type: "text", text: "Hello!" }] }
 * };
 * const output = toAgentOutput(message);
 * console.log(output.type); // "text"
 * console.log(output.content); // "Hello!"
 * ```
 */
export function toAgentOutput(message: StreamMessage): AgentOutput {
  // Handle error messages
  if (message.type === "error") {
    return createAgentOutput({
      type: "error",
      content: message.content ?? "Unknown error",
    });
  }

  // Handle result messages (typically contain cost)
  if (message.type === "result") {
    if (message.cost_usd !== undefined) {
      return createAgentOutput({
        type: "cost",
        costUsd: message.cost_usd,
        content: `Cost: $${message.cost_usd.toFixed(4)}`,
      });
    }
    return createAgentOutput({
      type: "system",
      content: message.subtype === "success" ? "Task completed successfully" : "Task completed",
    });
  }

  // Handle system messages
  if (message.type === "system") {
    return createAgentOutput({
      type: "system",
      content: message.content ?? message.subtype ?? "System message",
    });
  }

  // Handle tool_result messages
  if (message.type === "tool_result") {
    return createAgentOutput({
      type: "tool_result",
      toolOutput: message.content,
      content: typeof message.content === "string" ? message.content : undefined,
    });
  }

  // Handle assistant messages
  if (message.type === "assistant") {
    // Check for tool use first
    const toolUse = extractToolUse(message);
    if (toolUse) {
      return createAgentOutput({
        type: "tool_use",
        toolName: toolUse.name,
        toolInput: toolUse.input,
        content: `Using tool: ${toolUse.name}`,
      });
    }

    // Extract text content
    const text = extractTextContent(message);
    if (text) {
      return createAgentOutput({
        type: "text",
        content: text,
      });
    }

    // Fallback for assistant messages without content
    return createAgentOutput({
      type: "text",
      content: "",
    });
  }

  // Handle tool_use messages (direct, not nested in assistant)
  if (message.type === "tool_use") {
    return createAgentOutput({
      type: "tool_use",
      content: message.content,
    });
  }

  // Handle user messages
  if (message.type === "user") {
    return createAgentOutput({
      type: "text",
      content: extractTextContent(message) ?? "",
    });
  }

  // Fallback for unknown message types
  return createAgentOutput({
    type: "system",
    content: `Unknown message type: ${message.type}`,
  });
}

/**
 * Parse a ReadableStream of bytes into an async generator of StreamMessages.
 *
 * This is the main function for processing Claude CLI output. It handles:
 * - Reading chunks from the stream
 * - Decoding UTF-8 bytes to text
 * - Buffering incomplete lines across chunk boundaries
 * - Splitting on newlines to get individual JSON messages
 * - Parsing each line as JSON
 * - Yielding validated StreamMessage objects
 *
 * For parse errors, yields an error-type message with the malformed content
 * to allow the consumer to handle gracefully.
 *
 * @param stream - ReadableStream of bytes from Claude CLI stdout
 * @yields StreamMessage objects parsed from each JSON line
 *
 * @example
 * ```typescript
 * const proc = Bun.spawn(['claude', '-p', '--output-format', 'stream-json', 'Hello']);
 *
 * for await (const message of parseJsonStream(proc.stdout)) {
 *   if (message.type === 'assistant') {
 *     const text = extractTextContent(message);
 *     if (text) console.log('Assistant:', text);
 *   } else if (message.type === 'result') {
 *     console.log('Done! Cost:', message.cost_usd);
 *   }
 * }
 * ```
 */
export async function* parseJsonStream(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<StreamMessage, void, unknown> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        // Process any remaining content in buffer
        if (buffer.trim()) {
          const message = parseStreamMessage(buffer);
          if (message) {
            yield message;
          } else if (buffer.trim().length > 0) {
            // Yield error message for unparseable final content
            yield {
              type: "error",
              content: `Failed to parse: ${buffer.trim().slice(0, 200)}`,
            } as StreamMessage;
          }
        }
        break;
      }

      // Decode the chunk and append to buffer
      buffer += decoder.decode(value, { stream: true });

      // Split by newlines
      const lines = buffer.split("\n");

      // Keep the last element (potentially incomplete) in the buffer
      buffer = lines.pop() || "";

      // Process complete lines
      for (const line of lines) {
        if (!line.trim()) {
          continue; // Skip empty lines
        }

        const message = parseStreamMessage(line);
        if (message) {
          yield message;
        }
        // Note: parseStreamMessage logs warnings for malformed JSON,
        // but we don't yield error messages for every bad line to avoid noise.
        // Only the final incomplete buffer gets an error if unparseable.
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * Create an async generator that converts StreamMessages to AgentOutputs.
 *
 * A convenience wrapper that combines parseJsonStream with toAgentOutput
 * for consumers that prefer the AgentOutput format.
 *
 * @param stream - ReadableStream of bytes from Claude CLI stdout
 * @yields AgentOutput objects converted from parsed StreamMessages
 *
 * @example
 * ```typescript
 * const proc = Bun.spawn(['claude', '-p', '--output-format', 'stream-json', 'Hello']);
 *
 * for await (const output of parseJsonStreamAsOutput(proc.stdout)) {
 *   switch (output.type) {
 *     case 'text':
 *       console.log(output.content);
 *       break;
 *     case 'tool_use':
 *       console.log(`Using ${output.toolName}`);
 *       break;
 *     case 'cost':
 *       console.log(`Total cost: $${output.costUsd}`);
 *       break;
 *   }
 * }
 * ```
 */
export async function* parseJsonStreamAsOutput(
  stream: ReadableStream<Uint8Array>
): AsyncGenerator<AgentOutput, void, unknown> {
  for await (const message of parseJsonStream(stream)) {
    yield toAgentOutput(message);
  }
}

/**
 * Collect all text content from a stream into a single string.
 *
 * Useful when you need to capture the full text output from an agent
 * without processing individual messages.
 *
 * @param stream - ReadableStream of bytes from Claude CLI stdout
 * @returns Promise resolving to all concatenated text content
 *
 * @example
 * ```typescript
 * const proc = Bun.spawn(['claude', '-p', '--output-format', 'stream-json', 'Summarize this']);
 * const fullResponse = await collectTextContent(proc.stdout);
 * console.log('Full response:', fullResponse);
 * ```
 */
export async function collectTextContent(
  stream: ReadableStream<Uint8Array>
): Promise<string> {
  const texts: string[] = [];

  for await (const message of parseJsonStream(stream)) {
    const text = extractTextContent(message);
    if (text) {
      texts.push(text);
    }
  }

  return texts.join("");
}

/**
 * Result of collecting stream data with metadata.
 */
export interface StreamCollectionResult {
  /** All collected text content concatenated */
  text: string;
  /** All stream messages in order */
  messages: StreamMessage[];
  /** Session ID if found */
  sessionId?: string;
  /** Total cost in USD if reported */
  costUsd?: number;
  /** Total duration in milliseconds if reported */
  durationMs?: number;
}

/**
 * Collect all stream data including text, messages, and metadata.
 *
 * Provides a complete capture of the stream output for analysis
 * or logging purposes.
 *
 * @param stream - ReadableStream of bytes from Claude CLI stdout
 * @returns Promise resolving to collected stream data with metadata
 *
 * @example
 * ```typescript
 * const proc = Bun.spawn(['claude', '-p', '--output-format', 'stream-json', 'Hello']);
 * const result = await collectStream(proc.stdout);
 *
 * console.log('Response:', result.text);
 * console.log('Messages:', result.messages.length);
 * console.log('Session:', result.sessionId);
 * console.log('Cost:', result.costUsd);
 * ```
 */
export async function collectStream(
  stream: ReadableStream<Uint8Array>
): Promise<StreamCollectionResult> {
  const messages: StreamMessage[] = [];
  const texts: string[] = [];
  let sessionId: string | undefined;
  let costUsd: number | undefined;
  let durationMs: number | undefined;

  for await (const message of parseJsonStream(stream)) {
    messages.push(message);

    // Collect text
    const text = extractTextContent(message);
    if (text) {
      texts.push(text);
    }

    // Extract metadata
    if (message.session_id) {
      sessionId = message.session_id;
    }
    if (message.cost_usd !== undefined) {
      costUsd = message.cost_usd;
    }
    if (message.duration_ms !== undefined) {
      durationMs = message.duration_ms;
    }
  }

  return {
    text: texts.join(""),
    messages,
    sessionId,
    costUsd,
    durationMs,
  };
}
