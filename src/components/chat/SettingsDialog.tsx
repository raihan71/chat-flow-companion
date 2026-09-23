import { useEffect, useState } from "react";
import { CheckCircle2, FlaskConical, Rocket } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_PROD_WEBHOOK,
  DEFAULT_TEST_WEBHOOK,
  getSettings,
  isTestWebhook,
  setSettings,
  type ChatSettings,
} from "@/lib/chat-settings";

export function SettingsDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [draft, setDraft] = useState<ChatSettings>(getSettings);
  const [headersError, setHeadersError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setDraft(getSettings());
      setHeadersError(null);
    }
  }, [open]);

  const save = () => {
    if (draft.headersJson.trim()) {
      try {
        const parsed: unknown = JSON.parse(draft.headersJson);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
          throw new Error("Headers must be a JSON object");
        }
      } catch (error) {
        setHeadersError(error instanceof Error ? error.message : "Invalid JSON");
        return;
      }
    }
    setSettings({ ...draft, webhookUrl: draft.webhookUrl.trim() });
    toast.success("Connection settings saved");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Connection settings</DialogTitle>
          <DialogDescription>
            Point the chat at any n8n webhook. Everything stays in this browser.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label htmlFor="webhook-url">Webhook URL</Label>
            <Input
              id="webhook-url"
              value={draft.webhookUrl}
              onChange={(e) => setDraft({ ...draft, webhookUrl: e.target.value })}
              placeholder="https://your-n8n/webhook/..."
              className="font-mono text-xs"
            />
            <div className="flex flex-wrap gap-2 pt-1">
              <Button
                type="button"
                size="sm"
                variant={isTestWebhook(draft.webhookUrl) ? "default" : "outline"}
                onClick={() => setDraft({ ...draft, webhookUrl: DEFAULT_TEST_WEBHOOK })}
              >
                <FlaskConical /> Test URL
              </Button>
              <Button
                type="button"
                size="sm"
                variant={draft.webhookUrl === DEFAULT_PROD_WEBHOOK ? "default" : "outline"}
                onClick={() => setDraft({ ...draft, webhookUrl: DEFAULT_PROD_WEBHOOK })}
              >
                <Rocket /> Production URL
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {isTestWebhook(draft.webhookUrl)
                ? "Test mode needs you to click “Execute workflow” in n8n before each message."
                : "Production mode needs the workflow to be Active in n8n."}
              {" "}Leave empty to use server-side <code>N8N_WEBHOOK_URL</code>.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Basic authentication</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Input
                aria-label="Basic auth username"
                value={draft.basicAuthUsername}
                onChange={(e) => setDraft({ ...draft, basicAuthUsername: e.target.value })}
                placeholder="Username"
                autoComplete="username"
                className="font-mono text-xs"
              />
              <Input
                aria-label="Basic auth password"
                type="password"
                value={draft.basicAuthPassword}
                onChange={(e) => setDraft({ ...draft, basicAuthPassword: e.target.value })}
                placeholder="Password"
                autoComplete="current-password"
                className="font-mono text-xs"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Sent as the <code>Authorization: Basic ...</code> request header.
              {" "}Leave empty to use server-side credentials.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="auth-token">Bearer auth token (optional)</Label>
            <Input
              id="auth-token"
              value={draft.authToken}
              onChange={(e) => setDraft({ ...draft, authToken: e.target.value })}
              placeholder="Sent as Authorization: Bearer ..."
              className="font-mono text-xs"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="extra-headers">Extra headers (JSON, optional)</Label>
            <Textarea
              id="extra-headers"
              value={draft.headersJson}
              onChange={(e) => {
                setHeadersError(null);
                setDraft({ ...draft, headersJson: e.target.value });
              }}
              placeholder={'{ "x-api-key": "abc123" }'}
              rows={3}
              className="font-mono text-xs"
            />
            {headersError && <p className="text-xs text-destructive">{headersError}</p>}
          </div>

          <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
            <p className="mb-1 font-medium text-foreground">Each message sends</p>
            <pre className="whitespace-pre-wrap font-mono">{`{
  "message": "...",
  "conversationId": "...",
  "userId": "...",
  "timestamp": "..."
}`}</pre>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save}>
            <CheckCircle2 /> Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
