import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import type { ToolDefinition } from "@/types.js"
import type { BaseTool } from "./registry.js"
import { z } from "zod"

const EditFileArgsSchema = z.object({
  path: z.string(),
  oldText: z.string(),
  newText: z.string(),
})

export class EditFileTool implements BaseTool {
  private name = "edit_file"
  
    constructor(private workDir: string) {}
  
    getName() {
      return this.name
    }
  
    getDefinition(): ToolDefinition {
      return {
        name: this.name,
        description: "Perform a partial string replacement on an existing file. This is safer and faster than overwriting the entire file. Please provide enough oldText context to ensure a unique match.",
        inputSchema: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The path to the file relative to the workspace, such as src/index.ts",
            },
            oldText: {
              type: "string",
              description: "The original text in the file. It must contain sufficient context (it is recommended to include a few extra lines above and below) to ensure a unique match within the file.",
            },
            newText: {
              type: "string",
              description: "The new text to replace it with.",
            },
          },
          required: [ "path", "oldText", "newText" ],
        },
      }
    }
  
    execute(args: string): string {
      try {
        const rawArgs = JSON.parse(args)
        const { path, oldText, newText, } = EditFileArgsSchema.parse(rawArgs)
        const fullPath = join(this.workDir, path)
        const original = readFileSync(fullPath, "utf-8")
        const result = fuzzyReplace(original, oldText, newText)
        writeFileSync(fullPath, result, "utf-8")
        return `File edited successfully: ${path}`
      } catch (error) {
        return `Error editing file: ${error instanceof Error ? error.message : String(error)}`
      }
    }
}

function countOccurrences(haystack: string, needle: string): number {
  if (needle === "") return 0
  let count = 0
  let pos = 0
  while ((pos = haystack.indexOf(needle, pos)) !== -1) {
    count++
    pos += needle.length
  }
  return count
}

function fuzzyReplace(original: string, oldText: string, newText: string): string {
  // L1: exact match
  let count = countOccurrences(original, oldText)
  if (count === 1) return original.replace(oldText, newText)
  if (count > 1) throw new Error(`oldText matched ${count} times — provide more context to ensure a unique match`)

  // L2: normalize line endings
  const normalizedOriginal = original.replaceAll("\r\n", "\n")
  const normalizedOld = oldText.replaceAll("\r\n", "\n")
  count = countOccurrences(normalizedOriginal, normalizedOld)
  if (count === 1) return normalizedOriginal.replace(normalizedOld, newText)
  if (count > 1) throw new Error(`oldText matched ${count} times after line-ending normalization — provide more context`)

  // L3: trim leading/trailing whitespace
  const trimmedOld = normalizedOld.trim()
  if (trimmedOld !== "") {
    count = countOccurrences(normalizedOriginal, trimmedOld)
    if (count === 1) return normalizedOriginal.replace(trimmedOld, newText)
    if (count > 1) throw new Error(`oldText matched ${count} times after trimming — provide more context`)
  }

  // L4: sliding window line-by-line match with per-line trim
  return lineByLineReplace(normalizedOriginal, trimmedOld, newText)
}

function lineByLineReplace(content: string, oldText: string, newText: string): string {
  const contentLines = content.split("\n")
  const oldLines = oldText.trim().split("\n").map(l => l.trim())

  if (oldLines.length === 0 || contentLines.length < oldLines.length) {
    throw new Error("oldText not found in file — check that it matches the actual file content")
  }

  let matchCount = 0
  let matchStart = -1
  let matchEnd = -1

  for (let i = 0; i <= contentLines.length - oldLines.length; i++) {
    const isMatch = oldLines.every((oldLine, j) => contentLines[i + j].trim() === oldLine)
    if (isMatch) {
      matchCount++
      matchStart = i
      matchEnd = i + oldLines.length
    }
  }

  if (matchCount === 0) throw new Error("oldText not found in file — check that it matches the actual file content")
  if (matchCount > 1) throw new Error(`oldText matched ${matchCount} times after line-by-line comparison — provide more context`)

  const resultLines = [
    ...contentLines.slice(0, matchStart),
    ...newText.split("\n"),
    ...contentLines.slice(matchEnd)
  ]
  return resultLines.join("\n")
}

