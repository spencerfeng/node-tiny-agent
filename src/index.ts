import "dotenv/config"
import process from "node:process"
import { AgentEngine } from "./engine/loop.js"
import { OpenRouterProvider } from "./provider/openrouter.js"
import { ToolRegistry } from "./tools/registry.js"
import { ReadFileTool } from "./tools/readFileTool.js"
import { WriteFileTool } from "./tools/writeFileTool.js"

const workDir = process.cwd()
const provider = new OpenRouterProvider("deepseek/deepseek-chat-v3.1")
const readFileTool = new ReadFileTool(workDir)
const writeFileTool = new WriteFileTool(workDir)
const registry = new ToolRegistry()
registry.register(readFileTool)
registry.register(writeFileTool)

const main = async () => {
  const agentEngine = new AgentEngine(provider, registry, workDir, true)

  await agentEngine.run("Use tools to write the following content: \"I love you\" to the file test.txt in the work directory and then read the content of the file and summary it")
}

main().catch(error => {
  console.error(error)
})
