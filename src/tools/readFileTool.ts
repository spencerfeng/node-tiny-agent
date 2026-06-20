import { readFileSync } from "node:fs"
import { join } from "node:path"
import { z } from "zod"
import type { ToolDefinition } from "@/types.js"
import type { BaseTool } from "./registry.js"

const ReadFileArgsSchema = z.object({
  path: z.string(),
})

export class ReadFileTool implements BaseTool {
  private name = "read_file"

  constructor(private workDir: string) {}

  getName() {
    return this.name
  }

  getDefinition(): ToolDefinition {
    return {
      name: this.name,
      description: "Reads the content of a file. Requires the path to the file specified relative to the workDir.",
      inputSchema: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The path to the file relative to the workDir, such as src/index.ts",
          },
        },
        required: [ "path" ],
      },
    }
  }

  execute(args: string): string {
    try {
      const rawArgs = JSON.parse(args)
      const { path, } = ReadFileArgsSchema.parse(rawArgs)
      const content = readFileSync(join(this.workDir, path), "utf-8")
      const maxLen = 8000
      if (content.length > maxLen) {
        return `${content.slice(0, maxLen)}\n\n...[Content truncated to first ${maxLen} characters]...`
      }
      return content
    } catch (error) {
      return `Error reading file: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}