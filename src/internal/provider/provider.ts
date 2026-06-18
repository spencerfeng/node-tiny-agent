import type { Message, ToolDefinition, } from "./types.js"

export interface LLMProvider {
  generate(messages: Message[], tools: ToolDefinition[]): Promise<Message>
}
