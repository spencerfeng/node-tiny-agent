import type { ToolCall, ToolDefinition, ToolResult } from "@/types.js"
import type { ToolRegistry } from "./registry.js"

export class MockedRegistry implements ToolRegistry{
  getAvailableTools(): ToolDefinition[] {
    return []
  }

  execute(toolCall: ToolCall): ToolResult {
    return {
      toolCallId: toolCall.id,
      output: "mocked tool call output",
      isError: false,
    }
  }
}