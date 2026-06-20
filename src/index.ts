import "dotenv/config"
import process from "node:process"
import { AgentEngine } from "./engine/loop.js"
import { OpenRouterProvider } from "./provider/openrouter.js"
import { ToolRegistry } from "./tools/registry.js"
import { ReadFileTool } from "./tools/readFileTool.js"

const workDir = process.cwd()
const provider = new OpenRouterProvider("deepseek/deepseek-chat-v3.1")
const readFileTool = new ReadFileTool(workDir)
const registry = new ToolRegistry()
registry.register(readFileTool)

const main = async () => {
  const agentEngine = new AgentEngine(provider, registry, workDir, true)

  await agentEngine.run("Use tools to read the content of the file test.txt in the work directory and summarise it for me")
}

main().catch(error => {
  console.error(error)
})
