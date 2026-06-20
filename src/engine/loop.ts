import type { LLMProvider } from "@/provider/provider.js"
import type { ToolRegistry } from "@/tools/registry.js"
import type { Message } from "@/types.js"

export class AgentEngine {
  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
    private workDir: string
  ) {}

  async run(userPrompt: string) {
    console.log(`Engine started in the working directory ${this.workDir}`)

    const contextHistory: Message[] = [
      {
        role: "system",
        content: "You are node-tiny-agent, an expert coding assistant. You have the full access to tools in the workspace",
      },
      {
        role: "user",
        content: userPrompt,
      }
    ]

    let turnCount = 0

    while (true) {
      turnCount++
      console.log(`========== [Turn ${turnCount}] started ==========\n`)

      const availableTools = this.registry.getAvailableTools()

      console.log("[Engine] is thinking\n")

      const responseMsg = await this.provider.generate(contextHistory, availableTools)

      contextHistory.push(responseMsg)

      if (responseMsg.content !== "") {
        console.log(`Model response content: ${responseMsg.content}`)
      }

      if (!responseMsg.toolCalls?.length) {
        console.log("[Engine] task completed and exits the loop")
        break
      }

      console.log(`Model needs to call ${responseMsg.toolCalls.length} tools`)

      responseMsg.toolCalls.forEach(tc => {
        console.log(`  -> Call tool: ${tc.name}, arguments: ${tc.arguments}`)

        const result = this.registry.execute(tc)

        if (result.isError) {
          console.log(`  -> ❌ Tool calling throws an error: ${result.output}\n`)
        } else {
          console.log(`  -> ✅ Tool calling is successful and returns: ${result.output}\n`)
        }

        const observationMsg: Message = {
          role: "user",
          content: result.output,
          toolCallId: tc.id,
        }

        contextHistory.push(observationMsg)
      })
    }
  }
}