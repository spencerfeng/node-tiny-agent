import "dotenv/config"
import process from "node:process"
import { AgentEngine } from "./engine/loop.js"
import { OpenRouterProvider } from "./provider/openrouter.js"
import { ToolRegistry } from "./tools/registry.js"
import { ReadFileTool } from "./tools/readFileTool.js"
import { WriteFileTool } from "./tools/writeFileTool.js"
import { EditFileTool } from "./tools/editFileTool.js"
import { Bot } from "./telegram/bot.js"
import { BashTool } from "./tools/bashTool.js"
import { SessionsManager } from "./engine/session.js"

const workDir = process.env["WORD_DIR"] ?? process.cwd()
const provider = new OpenRouterProvider("anthropic/claude-sonnet-4.6")
const sessionsManager = new SessionsManager()

const readFileTool = new ReadFileTool(workDir)
const writeFileTool = new WriteFileTool(workDir)
const editFileTool = new EditFileTool(workDir)
const bashTool = new BashTool(workDir)

const registry = new ToolRegistry()
registry.register(readFileTool)
registry.register(writeFileTool)
registry.register(editFileTool)
registry.register(bashTool)

const telegramBot = new Bot()

const main = () => {
  const enableThinking = false
  const planMode = true
  telegramBot.listenForMessage(() => new AgentEngine(provider, registry, workDir, enableThinking, planMode), sessionsManager)
}

main()

