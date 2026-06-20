import OpenAI from "openai"
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions"
import type { LLMProvider } from "./provider.js"
import type { Message, ToolDefinition } from "@/types.js"

export class OpenRouterProvider implements LLMProvider {
  private client: OpenAI
  private model: string

  constructor(model: string) {
    const apiKey = process.env["OPENROUTER_API_KEY"]
    if (!apiKey) throw new Error("OPENROUTER_API_KEY environment variable is not set")

    this.client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey,
    })
    this.model = model
  }

  async generate(messages: Message[], tools: ToolDefinition[]): Promise<Message> {
    const openaiMessages = messages.map(toOpenAIMessage)

    const openaiTools = tools.map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.inputSchema,
      },
    }))

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: openaiMessages,
      ...(openaiTools.length > 0 && { tools: openaiTools, }),
    })

    const choice = response.choices[0]
    if (!choice) throw new Error("No choices returned from OpenRouter")

    const { message, } = choice
    const result: Message = {
      role: "assistant",
      content: message.content ?? "",
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      result.toolCalls = message.tool_calls
        .filter(tc => tc.type === "function")
        .map(tc => ({
          id: tc.id,
          name: tc.function.name,
          args: tc.function.args,
        }))
    }

    return result
  }
}

function toOpenAIMessage(message: Message): ChatCompletionMessageParam {
  if (message.role === "system") {
    return { role: "system", content: message.content, }
  }

  if (message.role === "user") {
    if (message.toolCallId) {
      return { role: "tool", content: message.content, tool_call_id: message.toolCallId, }
    }
    return { role: "user", content: message.content, }
  }

  // assistant
  if (message.toolCalls && message.toolCalls.length > 0) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map(tc => ({
        id: tc.id,
        type: "function" as const,
        function: { name: tc.name, args: tc.args, },
      })),
    }
  }

  return { role: "assistant", content: message.content, }
}
