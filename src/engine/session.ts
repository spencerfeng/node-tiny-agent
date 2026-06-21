import type { Message, Session } from "@/types.js"

export class SessionsManager {
  private sessions = new Map<number, Session>()

  createOrGetSession(id: number): Session {
    const session = this.sessions.get(id)

    if (session) {
      return session
    }

    const now = new Date()

    const newSession = {
      id,
      createdAt: now,
      updatedAt: now,
      history: [],
    }
    this.sessions.set(id, newSession)
    return newSession
  }
}

export class SessionManager {
  constructor(private session: Session) {}

  addMessage(message: Message): void {
    this.session.updatedAt = new Date()
    this.session.history.push(message)
  }

  getWorkingMemory(limit = 10): Message[] {
    if (this.session.history.length <= limit || limit <= 0) {
      return [ ...this.session.history ]
    }

    const memory = this.session.history.slice(-limit)

    // LLM APIs strictly require historical message continuity!
    // If the first message we slice happens to be a ToolResult (role: user and contains a ToolCallID),
    // but the original ToolCall that triggered this request was truncated and discarded, the LLM API will throw a 400 Bad Request error.
    // Therefore, if the first message of our slice is an "orphan" tool response,
    // we must forcefully discard it and roll over to the next valid User/Assistant message.
    const firstMessage = memory[0]
    if (firstMessage.role === "user" && firstMessage.toolCallId !== undefined) {
      memory.shift()
    }

    return memory
  }
}