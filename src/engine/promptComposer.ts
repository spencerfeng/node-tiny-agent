import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Message } from "@/types.js"
import { SkillLoader } from "./skillLoader.js"

export class PromptComposer {
  private skillLoader: SkillLoader

  constructor(private workDir: string) {
    this.skillLoader = new SkillLoader(workDir)
  }

  build(): Message {
    let content = `# Core Identity
You are node-tiny-agent, an expert coding assistant. You have full access to tools in the workspace.

# Core Discipline (CRITICAL)
1. To check if a file exists, use bash with \`ls\` or \`test -f\`, not read_file on a directory.
2. When creating a new file, always use write_file with both path and content.
3. Always read an existing file before editing it to understand the context.
4. When modifying an existing file, always prefer edit_file over write_file — only use write_file to create new files or when a full rewrite is explicitly required.
5. When a tool returns an error, read the output carefully, fix the command, and retry.`

    const agentsMDPath = join(this.workDir, "AGENTS.md")
    if (existsSync(agentsMDPath)) {
      const agentsMD = readFileSync(agentsMDPath, "utf-8")
      content += "\n\n# Project-Specific Guidelines (from AGENTS.md)\n"
      content += "The following are workspace-specific architecture rules. Your behaviour must strictly follow them:\n"
      content += "```markdown\n"
      content += agentsMD
      content += "\n```"
    }

    const skills = this.skillLoader.loadAll()
    if (skills) {
      content += skills
    }

    return {
      role: "system",
      content,
    }
  }
}
