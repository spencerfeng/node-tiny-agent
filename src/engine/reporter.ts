export interface Reporter {
  onThinking(chatId: number): Promise<void>
  onToolCall(chatId: number, toolName: string, args: string): Promise<void>
  onToolResult(chatId: number, toolName: string, result: string, isError: boolean): Promise<void>
  onMessage(chatId: number, content: string): Promise<void>
}
