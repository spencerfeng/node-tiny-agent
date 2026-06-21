import "dotenv/config"
import process from "node:process"
import { AgentEngine } from "./engine/loop.js"
import { OpenRouterProvider } from "./provider/openrouter.js"
import { ToolRegistry } from "./tools/registry.js"
import { ReadFileTool } from "./tools/readFileTool.js"
import { WriteFileTool } from "./tools/writeFileTool.js"
import { EditFileTool } from "./tools/editFileTool.js"
import { Bot } from "./telegram/bot.js"

const workDir = process.env["WORD_DIR"] ?? process.cwd()

const provider = new OpenRouterProvider("deepseek/deepseek-chat-v3.1")

const readFileTool = new ReadFileTool(workDir)
const writeFileTool = new WriteFileTool(workDir)
const editFileTool = new EditFileTool(workDir)

const registry = new ToolRegistry()
registry.register(readFileTool)
registry.register(writeFileTool)
registry.register(editFileTool)

const telegramBot = new Bot()

const main = () => {
  const agentEngine = new AgentEngine(provider, registry, workDir, true)
  telegramBot.listenForMessage(agentEngine)
}

main()

