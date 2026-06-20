import type { LLMProvider } from "@/provider/provider.js"
import { ToolRegistry } from "@/tools/registry.js"
import type { Message } from "@/types.js"

export class AgentEngine {
  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
    private workDir: string,
    private enableThinking?: boolean
  ) {}

  async run(userPrompt: string) {
    console.log(`[Engine] Engine started in the working directory ${this.workDir}`)
    console.log(`[Engine] Thinking mode is enabled: ${this.enableThinking}`)

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

      // ========== Phase 1: Thinking ==========
      // The thinking response is injected as a user message so Phase 2 treats it                                                                            
      // as context/plan rather than a completed assistant turn — preventing the                                                                             
      // model from thinking the task is already done. 
      if (this.enableThinking) {
        console.log("[Engine][Phase 1] Tools are not provided to force LLM to think deeply and plan")
        const thinkingMsg = await this.provider.generate(contextHistory, [])
        console.log("[Engine][Phase 1] thinkingMsg", JSON.stringify(thinkingMsg))

        if (thinkingMsg.content !== "") {
          contextHistory.push({                                                                                                                              
            role: "user",                                                                                                                                    
            content: `Here is your thinking/plan:\n${thinkingMsg.content}\n\nNow use tools to execute the plan.`,                                            
          })  
        }
      }

      // ========== Phase 2: Action ==========
      console.log("[Engine][Phase 2] Tools are provided, wait for LLM to take actions")
      const responseMsg = await this.provider.generate(contextHistory, availableTools)
      console.log("[Engine][Phase 2] responseMsg", JSON.stringify(responseMsg))
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
        console.log(`  -> Call tool: ${tc.name}, args: ${tc.args}`)

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