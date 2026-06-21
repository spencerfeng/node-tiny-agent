import type { AgentEngine } from "@/engine/loop.js"
import type { Reporter } from "@/engine/reporter.js"
import TelegramBot, { type Message } from "node-telegram-bot-api"

export class Bot implements Reporter {
  private bot: TelegramBot

  constructor() {
    const token = process.env["TELEGRAM_BOT_TOKEN"]
    if (!token) {
      throw new Error("Telegram token can not be empty.")
    }
    
    this.bot = new TelegramBot(token, { polling: true, })
  }

  listenForMessage(agentEngine: AgentEngine) {
    this.bot.on("message", async (msg: Message) => {
      const chatId = msg.chat.id

      await this.bot.sendMessage(chatId, "Received your message")

      if (msg.text) {
        await agentEngine.run(msg.text, this, chatId)
      }
    })
  }

  async onThinking(chatId: number) {
    await this.bot.sendMessage(chatId, "🙇 I am thinking")
  }

  async onToolCall(chatId: number, toolName: string, args: string) {
    await this.bot.sendMessage(chatId, `🔨 I am calling the tool: ${toolName} with the arguments: ${args}`)
  }

  async onToolResult(chatId: number, toolName: string, result: string, isError: boolean) {
    if (isError) {
      await this.bot.sendMessage(chatId, `❌ Calling the tool: ${toolName} failed with an error: ${result}`)
      return
    }

    await this.bot.sendMessage(chatId, `✅ Calling the tool: ${toolName} succeeded`)
  }

  async onMessage(chatId: number, content: string) {
    await this.bot.sendMessage(chatId, `✉️ ${content}`)
  }
}
