import type { ToolCall, ToolDefinition, ToolResult } from "@/types.js"
import type { BaseTool, ToolRegistry } from "./registry.js"

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  register(tool: BaseTool): undefined {}
}