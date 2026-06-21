import type { AgentEngine } from "@/engine/loop.js"
import type { Reporter } from "@/engine/reporter.js"
import { type SessionsManager, SessionManager } from "@/engine/session.js"
import type { Message } from "@/types.js"
import TelegramBot, { type Message as TelegramMessage } from "node-telegram-bot-api"

export class Bot implements Reporter {
  private bot: TelegramBot

  constructor() {
    const token = process.env["TELEGRAM_BOT_TOKEN"]
    if (!token) {
      throw new Error("Telegram token can not be empty.")
    }
    
    this.bot = new TelegramBot(token, { polling: true, })
  }

  listenForMessage(agentEngineFactoryFunc: () => AgentEngine, sessionsManager: SessionsManager) {
    this.bot.on("message", async (msg: TelegramMessage) => {
      const chatId = msg.chat.id

      await this.bot.sendMessage(chatId, "Received your message")

      const session = sessionsManager.createOrGetSession(chatId)
      const sessionManager = new SessionManager(session)

      if (msg.text) {
        const message: Message = {
          role: "user",
          content: msg.text,
        }
        sessionManager.addMessage(message)
        await agentEngineFactoryFunc().run(sessionManager, this, chatId)
      }
    })
  }

  async onThinking(chatId: number): Promise<void> {
    await this.bot.sendMessage(chatId, "🙇 I am thinking")
  }

  async onToolCall(chatId: number, toolName: string, args: string): Promise<void> {
    await this.bot.sendMessage(chatId, `🔨 I am calling the tool: ${toolName} with the arguments: ${args}`)
  }

  async onToolResult(chatId: number, toolName: string, result: string, isError: boolean): Promise<void> {
    if (isError) {
      await this.bot.sendMessage(chatId, `❌ Calling the tool: ${toolName} failed with an error: ${result}`)
      return
    }

    await this.bot.sendMessage(chatId, `✅ Calling the tool: ${toolName} succeeded`)
  }

  async onMessage(chatId: number, content: string): Promise<void> {
    await this.bot.sendMessage(chatId, `✉️ ${content}`)
  }
}
