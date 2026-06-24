import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { Message } from "@/types.js"
import { SkillLoader } from "./skillLoader.js"

export class PromptComposer {
  private skillLoader: SkillLoader

  constructor(
    private workDir: string,
    private planMode: boolean = false
  ) {
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

    if (this.planMode) {
      content += `

# Long-Running Tasks & State Externalisation (Plan Mode: ON)
!!! WARNING: In this mode, you MUST NOT rely on your short-term memory. You MUST persist all architectural thoughts and execution progress to physical files. !!!

When you receive a new instruction, you MUST follow this ABSOLUTE sequence:

**[STEP 1: Mandatory Environment Sniffing (Bootstrapping)]**
- Immediately after receiving an instruction, use bash (e.g. \`ls -la\`) to check whether \`PLAN.md\` and \`TODO.md\` already exist in the workspace root.
- **Branch A (New task)**: If neither file exists, this is a brand-new task. Use write_file to create them in order:
  1. Create \`PLAN.md\` first — write your understanding, architecture design, and technology choices.
  2. Then create \`TODO.md\` — break the task into concrete executable steps using Markdown checkbox format (e.g. \`- [ ] Step 1\`).
- **Branch B (Resume / wake-up)**: If these files already exist, DO NOT overwrite them. The system has just restarted or a human has taken over progress. Immediately use read_file to read \`PLAN.md\` for the global goal, then read \`TODO.md\` to find the first unchecked \`- [ ]\` item and continue from there.

**[STEP 2: Strict Single-Step Execution with Real-Time Checkoff]**
- Begin executing incomplete tasks from \`TODO.md\`, ONE AT A TIME.
- **Hard constraint**: After genuinely completing each sub-task via write_file, edit_file, or bash, you MUST immediately call edit_file to update \`TODO.md\`, changing \`- [ ]\` to \`- [x]\` for that step — BEFORE moving to the next step.
- The pattern for EVERY step is: **do the work → immediately check it off → then do the next step**.
- It is absolutely forbidden to complete multiple steps before checking them off. You must check off each step the moment it is done.
- After checking off a step, read the next unchecked item from \`TODO.md\` before proceeding.

- **Do NOT call multiple tools in a single response.** Call exactly one tool, wait for the result, check it off in \`TODO.md\`, then call the next tool. Never batch tool calls.

**[STEP 3: Self-Recovery When Lost]**
- If you encounter an error or don't know what to do next, immediately use read_file to re-read \`PLAN.md\` and \`TODO.md\` to reorient yourself before taking any further action.`
    }

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
