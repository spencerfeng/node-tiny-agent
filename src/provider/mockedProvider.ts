import type { Message, ToolDefinition } from "@/types.js"
import type { LLMProvider } from "./provider.js"

export class MockedProvider implements LLMProvider {
  private turnCount

  constructor() {
    this.turnCount = 0
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  generate(messages: Message[], tools: ToolDefinition[]): Promise<Message> {
    this.turnCount++

    if (this.turnCount === 1) {
      return Promise.resolve({
        role: "assistant",
        content: "Let me check what files are in this folder",
        toolCalls: [
          {
            id: "call_123",
            name: "bash",
            args: JSON.stringify({
              command: "ls -la",
            }),
          }
        ],
      } as Message
    )}

    return Promise.resolve({
      role: "assistant",
      content: "I saw the files in the folder. Task completed",
    })
  }
}