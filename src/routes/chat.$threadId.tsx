import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Menu, Moon, Settings, Sun } from "lucide-react";

import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatView } from "@/components/chat/ChatView";
import { SettingsDialog } from "@/components/chat/SettingsDialog";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useTheme } from "@/hooks/useTheme";
import {
  createThread,
  deleteThread,
  ensureThread,
  getThreads,
  renameThread,
  subscribe,
  uid,
} from "@/lib/chat-storage";

export const Route = createFileRoute("/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "FlowChat — chat with your n8n workflow" },
      {
        name: "description",
        content:
          "A modern chat workspace that talks to your n8n webhook, with conversation history, markdown answers and configurable endpoints.",
      },
      { property: "og:title", content: "FlowChat — chat with your n8n workflow" },
      {
        property: "og:description",
        content:
          "Chat with any n8n webhook: saved conversations, markdown replies, retries and switchable test/production endpoints.",
      },
    ],
  }),
  component: ChatPage,
});

const EMPTY: ReturnType<typeof getThreads> = [];

function ChatPage() {
  const { threadId } = Route.useParams();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const threads = useSyncExternalStore(subscribe, getThreads, () => EMPTY);

  useEffect(() => {
    ensureThread(threadId);
  }, [threadId]);

  const active = threads.find((t) => t.id === threadId);

  const newChat = useCallback(() => {
    const thread = createThread(uid());
    setMobileNavOpen(false);
    void navigate({ to: "/chat/$threadId", params: { threadId: thread.id } });
  }, [navigate]);

  const removeChat = useCallback(
    (id: string) => {
      const remaining = getThreads().filter((t) => t.id !== id);
      deleteThread(id);
      if (id === threadId) {
        const next = remaining[0]?.id ?? createThread(uid()).id;
        void navigate({ to: "/chat/$threadId", params: { threadId: next } });
      }
    },
    [threadId, navigate],
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-72 shrink-0 border-r md:block">
        <ChatSidebar
          threads={threads}
          activeId={threadId}
          onNewChat={newChat}
          onRename={renameThread}
          onDelete={removeChat}
          onOpenSettings={() => setSettingsOpen(true)}
        />
      </aside>

      <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
        <SheetContent side="left" className="w-72 p-0">
          <SheetTitle className="sr-only">Conversations</SheetTitle>
          <ChatSidebar
            threads={threads}
            activeId={threadId}
            onNewChat={newChat}
            onRename={renameThread}
            onDelete={removeChat}
            onOpenSettings={() => {
              setMobileNavOpen(false);
              setSettingsOpen(true);
            }}
            onNavigate={() => setMobileNavOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-2 border-b px-3 py-2.5">
          <Button
            size="icon-sm"
            variant="ghost"
            className="md:hidden"
            onClick={() => setMobileNavOpen(true)}
            aria-label="Open conversations"
          >
            <Menu />
          </Button>
          <p className="min-w-0 flex-1 truncate font-display text-sm font-medium">
            {active?.title ?? "New chat"}
          </p>
          <Button size="icon-sm" variant="ghost" onClick={toggle} aria-label="Toggle theme">
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings"
          >
            <Settings />
          </Button>
        </header>

        <div className="min-h-0 flex-1">
          <ChatView
            key={threadId}
            threadId={threadId}
            messages={active?.messages ?? []}
            onOpenSettings={() => setSettingsOpen(true)}
          />
        </div>
      </main>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
}
