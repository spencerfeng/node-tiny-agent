import "dotenv/config"
import process from "node:process"
import { AgentEngine } from "./engine/loop.js"
import { OpenRouterProvider } from "./provider/openrouter.js"
import { ToolRegistry } from "./tools/registry.js"
import { ReadFileTool } from "./tools/readFileTool.js"
import { WriteFileTool } from "./tools/writeFileTool.js"
import { EditFileTool } from "./tools/editFileTool.js"

const workDir = process.env["WORD_DIR"] ?? process.cwd()

const provider = new OpenRouterProvider("deepseek/deepseek-chat-v3.1")

const readFileTool = new ReadFileTool(workDir)
const writeFileTool = new WriteFileTool(workDir)
const editFileTool = new EditFileTool(workDir)

const registry = new ToolRegistry()
registry.register(readFileTool)
registry.register(writeFileTool)
registry.register(editFileTool)

const main = async () => {
  const agentEngine = new AgentEngine(provider, registry, workDir, true)

  await agentEngine.run("Edit the index.js file to calcualte the sum of 2 + 4 in the workDir and return the result. Create the file if it does not exist.")
}

main().catch(error => {
  console.error(error)
})
