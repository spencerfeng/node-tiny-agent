import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

interface Skill {
  name: string
  description: string
  body: string
}

export class SkillLoader {
  constructor(private workDir: string) {}

  loadAll(): string {
    const skillBaseDir = join(this.workDir, ".agents", "skills")

    if (!existsSync(skillBaseDir)) return ""

    const skills: Skill[] = []
    this.walkDir(skillBaseDir, skills)

    if (skills.length === 0) return ""

    let result = "\n### Available Agent Skills\n"
    result += "The following are your available skills. Apply them strictly when the scenario matches the description:\n\n"

    for (const skill of skills) {
      result += `#### Skill: ${skill.name}\n`
      result += `**Trigger condition**: ${skill.description}\n\n`
      result += "**Execution guide**:\n"
      result += skill.body
      result += "\n\n---\n"
    }

    return result
  }

  private walkDir(dir: string, skills: Skill[]): void {
    for (const entry of readdirSync(dir)) {
      const fullPath = join(dir, entry)
      if (statSync(fullPath).isDirectory()) {
        this.walkDir(fullPath, skills)
      } else if (entry === "SKILL.md") {
        skills.push(this.parseSkillMD(readFileSync(fullPath, "utf-8")))
      }
    }
  }

  private parseSkillMD(content: string): Skill {
    const skill: Skill = {
      name: "Unknown Skill",
      description: "No description provided.",
      body: content,
    }

    if (content.startsWith("---\n") || content.startsWith("---\r\n")) {
      const parts = content.split("---")
      if (parts.length >= 3) {
        const frontmatter = parts[1]
        skill.body = parts.slice(2).join("---").trim()

        for (const line of frontmatter.split("\n")) {
          const trimmed = line.trim()
          if (trimmed.startsWith("name:")) {
            skill.name = trimmed.slice("name:".length).trim()
          } else if (trimmed.startsWith("description:")) {
            skill.description = trimmed.slice("description:".length).trim()
          }
        }
      }
    }

    return skill
  }
}
