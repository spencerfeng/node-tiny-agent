import type { ToolCall, ToolDefinition, ToolResult } from "@/types.js"
import type { BaseTool, ToolRegistry } from "./registry.js"

export class registryImpl implements ToolRegistry {
  private tools = new Map<string, BaseTool>()

  getAvailableTools(): ToolDefinition[] {
    const defs = []

    for (const tool of Object.values(this.tools)) {
      defs.push(tool.getDefinition())
    }

    return defs
  }

  execute(toolCall: ToolCall): ToolResult {
    const { name, args, } = toolCall
    const tool = this.tools.get(name)

    if (!tool) {
      return {
        toolCallId: toolCall.id,
        output: "The tool can not be found",
        isError: true,
      }
    }

    return {
      toolCallId: toolCall.id,
      output: tool.execute(args),
      isError: false,
    }
  }

  register(tool: BaseTool): undefined {
    const name = tool.getName()

    if (this.tools.has(name)) {
      console.log(`A tool with the name: ${name} already exists. It will be overriden by the new tool`)
    }

    this.tools.set(name, tool)
    console.log(`[Registry] Tool: ${tool} has been registered`)
  }
}