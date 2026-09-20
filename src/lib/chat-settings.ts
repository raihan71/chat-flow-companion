export type ChatSettings = {
  webhookUrl: string;
  authToken: string;
  /** Raw JSON object of extra request headers, e.g. {"x-api-key":"..."} */
  headersJson: string;
};

export const DEFAULT_TEST_WEBHOOK =
  "https://nnn.trilinguecita.com/webhook-test/05da907b-710d-4bca-a7ee-a38bc0762849";
export const DEFAULT_PROD_WEBHOOK =
  "https://nnn.trilinguecita.com/webhook/05da907b-710d-4bca-a7ee-a38bc0762849";

const KEY = "n8n-chat.settings.v1";

export const defaultSettings: ChatSettings = {
  webhookUrl: DEFAULT_TEST_WEBHOOK,
  authToken: "",
  headersJson: "",
};

let cache: ChatSettings | null = null;
const listeners = new Set<() => void>();

export function subscribeSettings(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSettings(): ChatSettings {
  if (typeof window === "undefined") return defaultSettings;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    cache = raw ? { ...defaultSettings, ...(JSON.parse(raw) as Partial<ChatSettings>) } : defaultSettings;
  } catch {
    cache = defaultSettings;
  }
  return cache;
}

export function setSettings(next: ChatSettings) {
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  listeners.forEach((l) => l());
}

export function parseExtraHeaders(settings: ChatSettings): Record<string, string> {
  const headers: Record<string, string> = {};
  if (settings.headersJson.trim()) {
    try {
      const parsed = JSON.parse(settings.headersJson) as Record<string, unknown>;
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "string" || typeof v === "number") headers[k] = String(v);
      }
    } catch {
      /* invalid JSON is ignored at request time; the dialog validates it */
    }
  }
  if (settings.authToken.trim()) {
    headers["Authorization"] = settings.authToken.trim().toLowerCase().startsWith("bearer ")
      ? settings.authToken.trim()
      : `Bearer ${settings.authToken.trim()}`;
  }
  return headers;
}

export function isTestWebhook(url: string) {
  return url.includes("/webhook-test/");
}
