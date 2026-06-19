import type { ToolDefinition, ToolResult, ToolCall, } from "@/types.js"

export interface ToolRegistry {
  getAvailableTools(): ToolDefinition[]
  execute(toolCall: ToolCall): ToolResult
}
