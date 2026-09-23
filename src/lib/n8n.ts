import { createServerFn } from "@tanstack/react-start";
import {
  getSettings,
  isTestWebhook,
  parseExtraHeaders,
  type ChatSettings,
} from "./chat-settings";

export type WebhookPayload = {
  message: string;
  conversationId: string;
  userId: string;
  timestamp: string;
};

export type WebhookFailure = {
  title: string;
  detail: string;
  /** Extra guidance shown in the inline banner, e.g. how to arm an n8n test webhook. */
  hint?: string;
};

/**
 * Server-side function to handle the webhook request.
 * This reads credentials from environment variables if they are not provided by the client.
 */
const sendToWebhookServer = createServerFn({ method: "POST" })
  .validator((data: { payload: WebhookPayload; settings: ChatSettings }) => data)
  .handler(async ({ data: { payload, settings } }) => {
    // Priority: Environment variables > Client Settings > Hardcoded defaults
    const envUrl = process.env.N8N_WEBHOOK_URL;
    const envUser = process.env.N8N_WEBHOOK_USERNAME;
    const envPass = process.env.N8N_WEBHOOK_PASSWORD;

    const url = (envUrl || settings.webhookUrl || "").trim();

    if (!url) {
      return {
        ok: false as const,
        failure: {
          title: "No webhook configured",
          detail: "Server-side N8N_WEBHOOK_URL is missing and no client URL provided.",
          hint: "Set N8N_WEBHOOK_URL in your environment variables.",
        },
      };
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...parseExtraHeaders(settings),
    };

    // Apply Basic Auth from env if available, otherwise use client settings
    const username = envUser || settings.basicAuthUsername;
    const password = envPass || settings.basicAuthPassword;

    if (username || password) {
      const auth = Buffer.from(`${username}:${password}`).toString("base64");
      headers["Authorization"] = `Basic ${auth}`;
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      const raw = await response.text();

      if (!response.ok) {
        return {
          ok: false as const,
          failure: describeHttpFailure(response.status, raw, { ...settings, webhookUrl: url }),
        };
      }

      let parsed: unknown;
      try {
        parsed = raw ? JSON.parse(raw) : "";
      } catch {
        parsed = raw;
      }

      const reply = extractReply(parsed);
      if (!reply) {
        return {
          ok: false as const,
          failure: {
            title: "The workflow replied with no text",
            detail: raw ? `Raw response: ${raw.slice(0, 300)}` : "The response body was empty.",
            hint: 'Make the last node return something like { "message": { "content": "..." } } or { "output": "..." }.',
          },
        };
      }

      return { ok: true as const, reply };
    } catch (error) {
      return {
        ok: false as const,
        failure: {
          title: "Couldn't reach the webhook",
          detail: error instanceof Error ? error.message : String(error),
          hint: "Check the server's connection to the n8n instance.",
        },
      };
    }
  });

const TEXT_KEYS = ["output", "text", "response", "message", "content", "answer", "reply", "result"];

/** Resilient parser covering the common n8n return shapes. */
export function extractReply(data: unknown, depth = 0): string | null {
  if (depth > 6 || data == null) return null;

  if (typeof data === "string") {
    const trimmed = data.trim();
    if (!trimmed) return null;
    // n8n sometimes returns a JSON document with a text/plain content type.
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        const nested = extractReply(JSON.parse(trimmed), depth + 1);
        if (nested) return nested;
      } catch {
        /* genuinely plain text */
      }
    }
    return trimmed;
  }

  if (typeof data === "number" || typeof data === "boolean") return String(data);

  if (Array.isArray(data)) {
    for (const item of data) {
      const found = extractReply(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if ("json" in obj) {
      const found = extractReply(obj["json"], depth + 1);
      if (found) return found;
    }
    if ("data" in obj) {
      const found = extractReply(obj["data"], depth + 1);
      if (found) return found;
    }
    for (const key of TEXT_KEYS) {
      if (!(key in obj)) continue;
      const value = obj[key];
      if (typeof value === "string" && value.trim()) return value.trim();
      const found = extractReply(value, depth + 1);
      if (found) return found;
    }
    // Last resort: first non-empty string value on the object.
    for (const value of Object.values(obj)) {
      if (typeof value === "string" && value.trim()) return value.trim();
    }
  }

  return null;
}

function describeHttpFailure(status: number, body: string, settings: ChatSettings): WebhookFailure {
  const lower = body.toLowerCase();
  if (status === 404 || lower.includes("not registered")) {
    return {
      title: "The n8n webhook isn't listening right now",
      detail:
        "n8n replied 404 — the webhook node is not registered for this URL." +
        (body ? ` Response: ${body.slice(0, 300)}` : ""),
      hint: isTestWebhook(settings.webhookUrl)
        ? "You're on the test URL (/webhook-test/). Open the workflow in n8n and click “Execute workflow” to arm it for one call, or switch to the production URL in Settings after activating the workflow."
        : "You're on the production URL (/webhook/). Make sure the workflow is Active in n8n, or switch to the test URL in Settings and click “Execute workflow” there.",
    };
  }
  if (status === 401 || status === 403) {
    return {
      title: "n8n rejected the request",
      detail: `Authentication failed (${status}).`,
      hint: "Add the right auth token or headers in Settings so they match the webhook node's authentication.",
    };
  }
  if (status >= 500) {
    return {
      title: "The workflow errored",
      detail: `n8n returned ${status}. ${body.slice(0, 300)}`,
      hint: "Check the latest execution in n8n for the failing node.",
    };
  }
  return {
    title: `Request failed (${status})`,
    detail: body.slice(0, 300) || "No response body.",
  };
}

export async function sendToWebhook(
  payload: WebhookPayload,
  signal?: AbortSignal,
): Promise<{ ok: true; reply: string } | { ok: false; failure: WebhookFailure }> {
  const settings = getSettings();

  // We delegate to the server function to keep credentials on the server
  try {
    const result = await sendToWebhookServer({
      data: {
        payload,
        settings,
      },
      signal,
    });
    return result;
  } catch (error) {
    return {
      ok: false,
      failure: {
        title: "Server Error",
        detail: error instanceof Error ? error.message : String(error),
        hint: "The server function failed to execute.",
      },
    };
  }
}
