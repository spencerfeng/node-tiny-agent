import type { ToolDefinition, ToolResult, ToolCall } from "@/types.js"

export interface ToolRegistry {
  getAvailableTools(): ToolDefinition[]
  execute(toolCall: ToolCall): ToolResult
  register(tool: BaseTool): undefined
}

export interface BaseTool {
  getName(): string
  getDefinition(): ToolDefinition
  execute(args: string): string
}
