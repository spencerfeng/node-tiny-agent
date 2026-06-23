import type { Message } from "@/types.js"

export class Compactor {
  constructor(
    private maxChars: number,
    private retainLastMsgs: number
  ) {}

  compact(msgs: Message[]): Message[] {
    const currentLength = this.estimateLength(msgs)

    if (currentLength < this.maxChars) return msgs

    console.log(`[Compactor] ⚠️ Memory warning: context length (${currentLength} chars) exceeds threshold (${this.maxChars}), triggering compaction...`)

    const msgCount = msgs.length
    const protectStartIndex = Math.max(0, msgCount - this.retainLastMsgs)

    return msgs.map((msg, i) => {
      const isToolResult = msg.role === "user" && msg.toolCallId !== undefined
      const isInProtectedZone = i >= protectStartIndex

      if (isToolResult) {
        if (!isInProtectedZone) {
          // First defense line: distant history — mask tool results longer than 200 chars
          if (msg.content.length > 200) {
            return {
              ...msg,
              content: `...[Early tool output cleared to save context. Original length: ${msg.content.length} chars]...`,
            }
          }
          return msg
        } else {
          // Second defense line: protected zone — head-tail truncation for oversized tool results
          const maxKeep = 1000
          if (msg.content.length > maxKeep) {
            const head = msg.content.slice(0, 500)
            const tail = msg.content.slice(msg.content.length - 500)
            return {
              ...msg,
              content: `${head}\n\n...[Content too long, ${msg.content.length - maxKeep} chars truncated by system]...\n\n${tail}`,
            }
          }
          return msg
        }
      }

      if (!isInProtectedZone) {
        // Mask all other distant history messages
        return {
          ...msg,
          content: "[Content masked to reduce context size]",
        }
      }

      return msg
    })
  }

  private estimateLength(msgs: Message[]): number {
    return msgs.reduce((total, msg) => {
      let len = msg.content.length
      if (msg.toolCalls) {
        len += msg.toolCalls.reduce((sum, tc) => sum + tc.name.length + tc.args.length, 0)
      }
      return total + len
    }, 0)
  }
}
