export type Role = "system" | "user" | "assistant"

export interface ToolCall {
  id: string
  name: string
  args: string
}

export interface ToolResult {
  toolCallId: string
  output: string
  isError: boolean
}

export interface Message {
  role: Role
  content: string
  toolCalls?: ToolCall[]
  toolCallId?: string
}

export interface ToolDefinition {
  name: string
  description: string
  inputSchema: Record<string, unknown>
}
