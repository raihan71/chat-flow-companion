import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, MessageSquare, Pencil, Plus, Settings, Trash2, X } from "lucide-react";

import logo from "@/assets/flowchat-logo.png";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { Thread } from "@/lib/chat-storage";

export function ChatSidebar({
  threads,
  activeId,
  onNewChat,
  onRename,
  onDelete,
  onOpenSettings,
  onNavigate,
}: {
  threads: Thread[];
  activeId: string;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onOpenSettings: () => void;
  onNavigate?: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const startRename = (thread: Thread) => {
    setEditingId(thread.id);
    setDraftTitle(thread.title);
  };

  const commitRename = () => {
    if (editingId) onRename(editingId, draftTitle);
    setEditingId(null);
  };

  return (
    <div className="flex h-full w-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-2.5 px-4 pt-5 pb-4">
        <img src={logo} alt="" width={816} height={816} className="size-8" />
        <div className="leading-tight">
          <p className="font-display text-sm font-semibold">FlowChat</p>
          <p className="text-[11px] text-muted-foreground">n8n workflow assistant</p>
        </div>
      </div>

      <div className="px-3">
        <Button className="w-full justify-start" onClick={onNewChat}>
          <Plus /> New chat
        </Button>
      </div>

      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto px-2 pb-4">
        <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          History
        </p>
        {threads.length === 0 && (
          <p className="px-2 py-3 text-xs text-muted-foreground">No conversations yet.</p>
        )}
        {threads.map((thread) => {
          const isActive = thread.id === activeId;
          if (editingId === thread.id) {
            return (
              <div key={thread.id} className="flex items-center gap-1 px-1">
                <Input
                  autoFocus
                  value={draftTitle}
                  onChange={(e) => setDraftTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename();
                    if (e.key === "Escape") setEditingId(null);
                  }}
                  className="h-8 text-xs"
                />
                <Button size="icon-sm" variant="ghost" onClick={commitRename} aria-label="Save name">
                  <Check />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => setEditingId(null)}
                  aria-label="Cancel rename"
                >
                  <X />
                </Button>
              </div>
            );
          }
          return (
            <div
              key={thread.id}
              className={cn(
                "group flex items-center gap-1 rounded-lg pr-1 transition-colors",
                isActive ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/60",
              )}
            >
              <Link
                to="/chat/$threadId"
                params={{ threadId: thread.id }}
                onClick={onNavigate}
                className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-2 text-sm"
              >
                <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate">{thread.title}</span>
              </Link>
              <Button
                size="icon-sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => startRename(thread)}
                aria-label={`Rename ${thread.title}`}
              >
                <Pencil className="size-3.5" />
              </Button>
              <Button
                size="icon-sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                onClick={() => onDelete(thread.id)}
                aria-label={`Delete ${thread.title}`}
              >
                <Trash2 className="size-3.5" />
              </Button>
            </div>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <Button variant="ghost" className="w-full justify-start" onClick={onOpenSettings}>
          <Settings /> Settings
        </Button>
      </div>
    </div>
  );
}
