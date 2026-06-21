import { execSync } from "node:child_process"
import { z } from "zod"
import type { ToolDefinition } from "@/types.js"
import type { BaseTool } from "./registry.js"

const BashArgsSchema = z.object({
  command: z.string(),
})

export class BashTool implements BaseTool {
  private name = "bash"

  constructor(private workDir: string) {}

  getName() {
    return this.name
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: "Execute a bash command in the workspace. Supports chained commands (e.g. &&). Returns combined stdout and stderr.",
      inputSchema: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The bash command to execute",
          },
        },
        required: [ "command" ],
      },
    }
  }

  execute(args: string): string {
    let command = ""
    try {
      const rawArgs = JSON.parse(args)
      const parsed = BashArgsSchema.parse(rawArgs)
      command = parsed.command

      const output = execSync(command, {
        cwd: this.workDir,
        timeout: 30000,
        stdio: "pipe",
      })

      const outputStr = output.toString()
      if (outputStr === "") return "Command executed successfully with no output."

      const maxLen = 8000
      if (outputStr.length > maxLen) {
        return `${outputStr.slice(0, maxLen)}\n\n...[Output truncated to first ${maxLen} characters]...`
      }

      return outputStr
    } catch (error) {
      if (error instanceof Error) {
        // execSync throws when the process exits with non-zero or times out
        if ("killed" in error && error.killed) {
          const output = "stdout" in error ? String(error.stdout) : ""
          return `${output}\n[Warning: command timed out after 30s and was terminated.]`
        }
        const output = "stdout" in error ? String(error.stdout) : ""
        const stderr = "stderr" in error ? String(error.stderr) : ""
        return `Error: ${error.message}\nOutput:\n${output}${stderr}`
      }
      return `Error: ${String(error)}`
    }
  }
}
