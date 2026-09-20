export type Role = "user" | "assistant";

export type ChatMessage = {
  id: string;
  role: Role;
  content: string;
  createdAt: string;
  /** Present when the assistant turn failed; content holds a user-facing explanation. */
  error?: string;
  /** For failed assistant turns: the user text that should be retried. */
  retryOf?: string;
};

export type Thread = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
};

const KEY = "n8n-chat.threads.v1";
const USER_KEY = "n8n-chat.userId.v1";

let cache: Thread[] | null = null;
const listeners = new Set<() => void>();

export function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

function read(): Thread[] {
  if (typeof window === "undefined") return [];
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Thread[]) : [];
    cache = Array.isArray(parsed) ? parsed : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(next: Thread[]) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage full or unavailable */
    }
  }
  listeners.forEach((l) => l());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getThreads(): Thread[] {
  return read();
}

export function getThread(id: string): Thread | undefined {
  return read().find((t) => t.id === id);
}

export function getClientUserId(): string {
  if (typeof window === "undefined") return "anonymous";
  let id = window.localStorage.getItem(USER_KEY);
  if (!id) {
    id = uid();
    window.localStorage.setItem(USER_KEY, id);
  }
  return id;
}

export function createThread(id = uid()): Thread {
  const now = new Date().toISOString();
  const thread: Thread = { id, title: "New chat", createdAt: now, updatedAt: now, messages: [] };
  write([thread, ...read()]);
  return thread;
}

export function ensureThread(id: string): Thread {
  return getThread(id) ?? createThread(id);
}

export function deleteThread(id: string) {
  write(read().filter((t) => t.id !== id));
}

export function renameThread(id: string, title: string) {
  write(read().map((t) => (t.id === id ? { ...t, title: title.trim() || "Untitled chat" } : t)));
}

function updateThread(id: string, updater: (thread: Thread) => Thread) {
  const list = read();
  const exists = list.some((t) => t.id === id);
  const now = new Date().toISOString();
  const base: Thread[] = exists
    ? list
    : [{ id, title: "New chat", createdAt: now, updatedAt: now, messages: [] }, ...list];
  write(base.map((t) => (t.id === id ? { ...updater(t), updatedAt: now } : t)));
}

function deriveTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean || "New chat";
}

export function appendMessage(threadId: string, message: ChatMessage) {
  updateThread(threadId, (thread) => ({
    ...thread,
    title:
      thread.messages.length === 0 && message.role === "user"
        ? deriveTitle(message.content)
        : thread.title,
    messages: [...thread.messages, message],
  }));
}

export function removeMessage(threadId: string, messageId: string) {
  updateThread(threadId, (thread) => ({
    ...thread,
    messages: thread.messages.filter((m) => m.id !== messageId),
  }));
}
