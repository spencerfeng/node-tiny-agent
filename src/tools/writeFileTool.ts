import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import type { ToolDefinition } from "@/types.js"
import type { BaseTool } from "./registry.js"
import z from "zod"

const WriteFileArgsSchema = z.object({
  path: z.string(),
  content: z.string(),
})

export class WriteFileTool implements BaseTool {
  private name = "write_file"
  
    constructor(private workDir: string) {}
  
    getName() {
      return this.name
    }
  
    getDefinition(): ToolDefinition {
      return {
        name: this.name,
        description: "Create or overwrite a file. If the directory does not exist, it will be created automatically. Please provide a relative path to the workspace.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The path to the file relative to the workspace, such as src/index.ts",
            },
            content: {
              type: "string",
              description: "The complete file content to be written",
            },
          },
          required: [ "path", "content" ],
        },
      }
    }
  
    execute(args: string): string {
      try {
        const rawArgs = JSON.parse(args)
        const { path, content, } = WriteFileArgsSchema.parse(rawArgs)
        const fullPath = join(this.workDir, path)
        mkdirSync(dirname(fullPath), { recursive: true, })
        writeFileSync(fullPath, content, "utf-8")
        return `File written successfully: ${path}`
      } catch (error) {
        return `Error writing file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
}
