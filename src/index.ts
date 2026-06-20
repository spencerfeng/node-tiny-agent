import process from "node:process"
import { AgentEngine } from "./engine/loop.js"
import { MockedProvider } from "./provider/mockedProvider.js"
import { MockedRegistry } from "./tools/mockedRegistry.js"

const mockedProvider = new MockedProvider()
const mockedRegistry = new MockedRegistry()
const workDir = process.cwd()

const main = async () => {
  const agentEngine = new AgentEngine(mockedProvider, mockedRegistry, workDir, true)

  await agentEngine.run("Check the files in the current folder")
}

main().catch(error => {
  console.error(error)
})
