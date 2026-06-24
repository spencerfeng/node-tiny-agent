import type { LLMProvider } from "@/provider/provider.js"
import { ToolRegistry } from "@/tools/registry.js"
import type { Message } from "@/types.js"
import type { Reporter } from "./reporter.js"
import type { SessionManager } from "./session.js"
import { globalApprovalManager, isDangerousCommand } from "@/telegram/approval.js"
import type { Bot } from "@/telegram/bot.js"
import { PromptComposer } from "./promptComposer.js"
import { Compactor } from "./compactor.js"

export class AgentEngine {
  private promptComposer: PromptComposer
  private compactor: Compactor

  constructor(
    private provider: LLMProvider,
    private registry: ToolRegistry,
    private workDir: string,
    private enableThinking?: boolean,
    planMode?: boolean
  ) {
    this.promptComposer = new PromptComposer(workDir, planMode ?? false)
    this.compactor = new Compactor(30000, 6)
  }

  async run(sessionManager: SessionManager, botWithReporter: Reporter & Bot, chatId: number) {
    console.log(`[Engine] Engine started in the working directory ${this.workDir}`)
    console.log(`[Engine] Thinking mode is enabled: ${this.enableThinking}`)

    const systemMessage: Message = this.promptComposer.build()

    let turnCount = 0

    while (true) {
      turnCount++
      console.log(`========== [Turn ${turnCount}] started ==========\n`)

      const availableTools = this.registry.getAvailableTools()

      const workingMemory = sessionManager.getWorkingMemory(20)

      const contextHistory: Message[] = [ systemMessage, ...workingMemory ]

      // Compact before sending to the LLM — only affects what the model sees,
      // session writes always use the full original messages.
      let compactedContext = this.compactor.compact(contextHistory)

      // ========== Phase 1: Thinking ==========
      // The thinking response is injected as a user message so Phase 2 treats it
      // as context/plan rather than a completed assistant turn — preventing the
      // model from thinking the task is already done.
      if (this.enableThinking) {
        await botWithReporter.onThinking(chatId)

        console.log("[Engine][Phase 1] Tools are not provided to force LLM to think deeply and plan")
        const thinkingMsg = await this.provider.generate(compactedContext, [])
        console.log("[Engine][Phase 1] thinkingMsg", JSON.stringify(thinkingMsg))

        // Strip any leaked internal tool-call tokens (model-specific artefacts)
        // Otherwise if it leaks into the context as part of the "plan" message,
        // Phase 2 sees it and interprets it as if the tool was already called and
        // the task is done, so it skips actually calling the tool.
        const thinkingContent = thinkingMsg.content.replace(/<｜tool▁calls▁begin｜>[\s\S]*$/, "").trim()
        if (thinkingContent !== "") {
          const thinkingPlanMessage: Message = {
            role: "user",
            content: `Here is your thinking/plan:\n${thinkingContent}\n\nNow use tools to execute the plan.`,
          }
          sessionManager.addMessage(thinkingPlanMessage)
          compactedContext = [ ...compactedContext, thinkingPlanMessage ]
        }
      }

      // ========== Phase 2: Action ==========
      console.log("[Engine][Phase 2] Tools are provided, wait for LLM to take actions")
      const responseMsg = await this.provider.generate(compactedContext, availableTools)
      console.log("[Engine][Phase 2] responseMsg", JSON.stringify(responseMsg))

      sessionManager.addMessage(responseMsg)
      contextHistory.push(responseMsg)

      if (responseMsg.content !== "") {
        console.log(`Model response content: ${responseMsg.content}`)
      }

      if (!responseMsg.toolCalls?.length) {
        console.log("[Engine] task completed and exits the loop")
        botWithReporter.onMessage(chatId, responseMsg.content)
        break
      }

      console.log(`Model needs to call ${responseMsg.toolCalls.length} tools`)

      for (const tc of responseMsg.toolCalls) {
        if (isDangerousCommand(tc.name, tc.args)) {
          const taskId = crypto.randomUUID()
          const result = await globalApprovalManager.waitForApproval(taskId, tc.name, tc.args, botWithReporter.getTelegramBot(), chatId)

          if (!result.allowed) {
            const observationMsg: Message = {
              role: "user",
              content: `Execution halted by human operator for tool call: ${tc.name}. Reason: ${result.reason}`,
              toolCallId: tc.id,
            }

            sessionManager.addMessage(observationMsg)
            break
          }
        }

        await botWithReporter.onToolCall(chatId, tc.name, tc.args)
        console.log(`  -> Call tool: ${tc.name}, args: ${tc.args}`)

        const result = this.registry.execute(tc)

        if (result.isError) {
          await botWithReporter.onToolResult(chatId, tc.name, result.output, true)
          console.log(`  -> ❌ Tool calling throws an error: ${result.output}\n`)
        } else {
          await botWithReporter.onToolResult(chatId, tc.name, result.output, false)
          console.log(`  -> ✅ Tool calling is successful and returns: ${result.output}\n`)
        }

        const observationMsg: Message = {
          role: "user",
          content: result.output,
          toolCallId: tc.id,
        }

        await botWithReporter.onMessage(chatId, result.output)

        sessionManager.addMessage(observationMsg)
      }
    }
  }
}
