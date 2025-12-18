/**
 * Claude CLI Mock
 *
 * Mock implementation of Claude CLI process spawning for testing.
 * Captures spawn calls and allows configuring mock responses.
 */

/**
 * Spawn call record
 */
export interface SpawnCall {
  command: string[];
  cwd?: string;
  timestamp: Date;
  env?: Record<string, string>;
}

/**
 * Mock response configuration
 */
export interface MockResponse {
  stdout: string;
  stderr?: string;
  exitCode?: number;
  delay?: number;
}

/**
 * Stream message types from Claude CLI
 */
export interface StreamMessage {
  type: "assistant" | "result" | "error" | "tool_use" | "tool_result";
  content?: string;
  tool?: {
    name: string;
    input: Record<string, unknown>;
  };
  result?: Record<string, unknown>;
}

/**
 * Claude CLI Mock
 */
export const mockClaudeCLI = {
  /** Recorded spawn calls */
  spawnCalls: [] as SpawnCall[],

  /** Queue of mock responses */
  responseQueue: [] as MockResponse[],

  /** Default response when queue is empty */
  defaultResponse: {
    stdout: JSON.stringify({ type: "result", content: "Mock response" }),
    stderr: "",
    exitCode: 0,
  } as MockResponse,

  /**
   * Reset mock state
   */
  reset(): void {
    this.spawnCalls = [];
    this.responseQueue = [];
  },

  /**
   * Record a spawn call
   */
  recordSpawn(command: string[], cwd?: string, env?: Record<string, string>): void {
    this.spawnCalls.push({
      command,
      cwd,
      timestamp: new Date(),
      env,
    });
  },

  /**
   * Queue a mock response for the next spawn
   */
  mockSpawn(response: MockResponse): void {
    this.responseQueue.push(response);
  },

  /**
   * Queue multiple mock responses
   */
  mockSpawnSequence(responses: MockResponse[]): void {
    this.responseQueue.push(...responses);
  },

  /**
   * Get the next mock response (or default)
   */
  getNextResponse(): MockResponse {
    return this.responseQueue.shift() ?? this.defaultResponse;
  },

  /**
   * Get the last spawn call
   */
  getLastCall(): SpawnCall | undefined {
    return this.spawnCalls[this.spawnCalls.length - 1];
  },

  /**
   * Get all spawn calls
   */
  getAllCalls(): SpawnCall[] {
    return [...this.spawnCalls];
  },

  /**
   * Check if spawn was called with specific arguments
   */
  wasCalledWith(args: string[]): boolean {
    return this.spawnCalls.some((call) =>
      args.every((arg) => call.command.includes(arg))
    );
  },

  /**
   * Get calls filtered by argument
   */
  getCallsWithArg(arg: string): SpawnCall[] {
    return this.spawnCalls.filter((call) => call.command.includes(arg));
  },

  /**
   * Create a mock streaming response
   */
  createStreamResponse(messages: StreamMessage[]): string {
    return messages.map((msg) => JSON.stringify(msg)).join("\n");
  },

  /**
   * Create a mock error response
   */
  createErrorResponse(error: string): MockResponse {
    return {
      stdout: JSON.stringify({ type: "error", content: error }),
      stderr: error,
      exitCode: 1,
    };
  },

  /**
   * Create a mock tool use response
   */
  createToolUseResponse(toolName: string, input: Record<string, unknown>): string {
    return JSON.stringify({
      type: "tool_use",
      tool: { name: toolName, input },
    });
  },

  /**
   * Create a mock assistant message response
   */
  createAssistantResponse(content: string): string {
    return JSON.stringify({ type: "assistant", content });
  },
};

export type MockClaudeCLI = typeof mockClaudeCLI;
