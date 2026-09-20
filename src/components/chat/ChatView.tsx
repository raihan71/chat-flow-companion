import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Languages,
  Lightbulb,
  RefreshCw,
  Workflow,
} from "lucide-react";

import logo from "@/assets/flowchat-logo.png";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { getSettings, isTestWebhook } from "@/lib/chat-settings";
import {
  appendMessage,
  getClientUserId,
  removeMessage,
  uid,
  type ChatMessage,
} from "@/lib/chat-storage";
import { sendToWebhook, type WebhookFailure } from "@/lib/n8n";

const STARTERS = [
  {
    icon: Workflow,
    title: "Explain my workflow",
    prompt: "Explain what an n8n webhook workflow does, step by step.",
  },
  {
    icon: Lightbulb,
    title: "Brainstorm automations",
    prompt: "Suggest five automations I could build for a small online store.",
  },
  {
    icon: Languages,
    title: "Draft a reply",
    prompt: "Write a friendly reply to a customer asking about delivery times.",
  },
  {
    icon: Check,
    title: "Show formatting",
    prompt: "Reply with a short markdown example including a code block and a list.",
  },
];

function encodeFailure(failure: WebhookFailure) {
  return JSON.stringify(failure);
}

function decodeFailure(raw: string): WebhookFailure {
  try {
    return JSON.parse(raw) as WebhookFailure;
  } catch {
    return { title: "Something went wrong", detail: raw };
  }
}

export function ChatView({
  threadId,
  messages,
  onOpenSettings,
}: {
  threadId: string;
  messages: ChatMessage[];
  onOpenSettings: () => void;
}) {
  const [pending, setPending] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [input, setInput] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const focusInput = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    focusInput();
  }, [threadId, focusInput]);

  useEffect(() => {
    if (!pending) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    const timer = window.setInterval(() => {
      setElapsed(Math.round((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [pending]);

  const send = useCallback(
    async (text: string, options?: { skipUserMessage?: boolean }) => {
      const trimmed = text.trim();
      if (!trimmed || pending) return;

      if (!options?.skipUserMessage) {
        appendMessage(threadId, {
          id: uid(),
          role: "user",
          content: trimmed,
          createdAt: new Date().toISOString(),
        });
      }
      setPending(true);

      const result = await sendToWebhook({
        message: trimmed,
        conversationId: threadId,
        userId: getClientUserId(),
        timestamp: new Date().toISOString(),
      });

      if (result.ok) {
        appendMessage(threadId, {
          id: uid(),
          role: "assistant",
          content: result.reply,
          createdAt: new Date().toISOString(),
        });
      } else {
        appendMessage(threadId, {
          id: uid(),
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          error: encodeFailure(result.failure),
          retryOf: trimmed,
        });
      }
      setPending(false);
      focusInput();
    },
    [threadId, pending, focusInput],
  );

  const retry = useCallback(
    (message: ChatMessage) => {
      if (!message.retryOf) return;
      removeMessage(threadId, message.id);
      void send(message.retryOf, { skipUserMessage: true });
    },
    [threadId, send],
  );

  const copy = useCallback((message: ChatMessage) => {
    void navigator.clipboard.writeText(message.content).then(() => {
      setCopiedId(message.id);
      window.setTimeout(() => setCopiedId(null), 1500);
    });
  }, []);

  const isEmpty = messages.length === 0;
  const modeLabel = useMemo(() => {
    const url = getSettings().webhookUrl;
    return isTestWebhook(url) ? "Test webhook" : "Production webhook";
  }, [threadId, messages.length]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Conversation className="min-h-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-6 px-4 py-6">
          {isEmpty ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 py-10 text-center">
              <img src={logo} alt="" width={816} height={816} className="size-16" />
              <div className="space-y-2">
                <h1 className="font-display text-2xl font-semibold tracking-tight">
                  What can your workflow do today?
                </h1>
                <p className="text-sm text-muted-foreground">
                  Messages go straight to your n8n webhook — currently the{" "}
                  <button
                    onClick={onOpenSettings}
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    {modeLabel.toLowerCase()}
                  </button>
                  .
                </p>
              </div>
              <div className="grid w-full max-w-xl gap-2.5 sm:grid-cols-2">
                {STARTERS.map(({ icon: Icon, title, prompt }) => (
                  <button
                    key={title}
                    onClick={() => void send(prompt)}
                    className="group rounded-xl border bg-card p-3.5 text-left transition-colors hover:border-primary/50 hover:bg-accent/40"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <Icon className="size-4 text-primary" /> {title}
                    </span>
                    <span className="mt-1 block text-xs text-muted-foreground">{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => {
              if (message.error) {
                const failure = decodeFailure(message.error);
                return (
                  <div
                    key={message.id}
                    className="rounded-xl border border-destructive/40 bg-destructive/5 p-4"
                  >
                    <p className="flex items-center gap-2 text-sm font-medium text-destructive">
                      <AlertTriangle className="size-4" /> {failure.title}
                    </p>
                    <p className="mt-1.5 text-xs text-muted-foreground">{failure.detail}</p>
                    {failure.hint && (
                      <p className="mt-2 text-xs text-foreground/80">{failure.hint}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {message.retryOf && (
                        <Button size="sm" variant="outline" onClick={() => retry(message)}>
                          <RefreshCw /> Retry
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={onOpenSettings}>
                        Open settings
                      </Button>
                    </div>
                  </div>
                );
              }

              return (
                <Message key={message.id} from={message.role}>
                  <MessageContent>
                    {message.role === "assistant" ? (
                      <MessageResponse>{message.content}</MessageResponse>
                    ) : (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    )}
                  </MessageContent>
                  {message.role === "assistant" && (
                    <MessageActions>
                      <MessageAction
                        label={copiedId === message.id ? "Copied" : "Copy"}
                        onClick={() => copy(message)}
                      >
                        {copiedId === message.id ? <Check /> : <Copy />}
                      </MessageAction>
                    </MessageActions>
                  )}
                </Message>
              );
            })
          )}

          {pending && (
            <Message from="assistant">
              <MessageContent>
                <Shimmer className="text-sm">
                  {elapsed > 2 ? `Working on it… ${elapsed}s` : "Thinking…"}
                </Shimmer>
              </MessageContent>
            </Message>
          )}
        </ConversationContent>
        <ConversationScrollButton />
      </Conversation>

      <div className="border-t bg-background/80 px-4 py-4 backdrop-blur">
        <div className="mx-auto w-full max-w-3xl">
          <PromptInput
            onSubmit={(message, event) => {
              event.preventDefault();
              const text = message.text || input;
              setInput("");
              void send(text);
            }}
          >
            <PromptInputTextarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message your n8n workflow…"
            />
            <PromptInputFooter className="justify-between">
              <span className="pl-1 text-[11px] text-muted-foreground">{modeLabel}</span>
              <PromptInputSubmit
                {...(pending ? { status: "submitted" as const } : {})}
                disabled={pending || !input.trim()}
              />
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
