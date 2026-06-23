import type TelegramBot from "node-telegram-bot-api"

export interface ApprovalResult {
  allowed: boolean
  reason: string
}

interface PendingTask {
  resolve: (value: ApprovalResult) => void
  timeoutId: NodeJS.Timeout
}

export interface ParsedApproval {
  action: "approve" | "reject"
  taskId: string
}

class ApprovalManager {
  private pendingTasks: Map<string, PendingTask> = new Map()

  async waitForApproval(
    taskId: string,
    toolName: string,
    args: string,
    bot: TelegramBot,
    chatId: number
  ): Promise<ApprovalResult> {
    return new Promise<ApprovalResult>(async resolve => {
      const timeoutId = setTimeout(() => {
        this.resolveApproval(taskId, false, "Approval request time out.")
      }, 10 * 60 * 1000)

      this.pendingTasks.set(taskId, { resolve, timeoutId, })

      const noticeMsg = "⚠️ *High-Risk Operation Approval Request*\n\n" +
        "Agent is attempting to execute the following action:\n" +
        `• *Tool*: \`${toolName}\`\n` +
        `• *Arguments*: \`${args}\`\n\n` +
        `Task ID: \`${taskId}\`\n\n` +
        `👉 Please reply \`approve ${taskId}\` or \`reject ${taskId}\` to decide whether to allow execution.`

      try {
        await bot.sendMessage(chatId, noticeMsg, { parse_mode: "Markdown", })
      } catch {
        await bot.sendMessage(chatId, noticeMsg)
      }
    })
  }

  resolveApproval(taskId: string, allowed: boolean, reason: string): boolean {
    const task = this.pendingTasks.get(taskId)
    if (task) {
      clearTimeout(task.timeoutId)
      task.resolve({ allowed, reason, })
      this.pendingTasks.delete(taskId)
      return true
    }
    return false
  }
}

export const globalApprovalManager = new ApprovalManager()

/**
 * Simple regex-based blacklist check to determine if a tool call requires human approval.
 */
export function isDangerousCommand(toolName: string, args: string): boolean {
  // For read-only tools, default to YOLO mode and allow everything
  if (toolName !== "bash" && toolName !== "write_file" && toolName !== "edit_file") {
    return false
  }

  // High-risk pattern matching specifically for bash commands
  if (toolName === "bash") {
    const dangerousPatterns: RegExp[] = [
      /\brm\b/,     // Any file deletion
      /sudo\s+/,    // Privilege escalation
      /drop\s+/,    // Database truncation/drop
      />.*\.ts/,    // Maliciously overwriting TypeScript source code
      />.*\.js/     // Maliciously overwriting JavaScript source code
    ]

    // Check if any of the dangerous patterns match the arguments string
    return dangerousPatterns.some((pattern) => pattern.test(args))
  }

  return false
}

export function parseApprovalMessage(content: string): ParsedApproval | null {
    const regex = /^\s*(approve|reject)\s+([a-zA-Z0-9-]+)\s*$/i
    const match = content.trim().match(regex)
    if (!match) return null

    return {
        action: match[1].toLowerCase() as "approve" | "reject",
        taskId: match[2],
    }
}

