import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { createThread, getThreads, uid } from "@/lib/chat-storage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FlowChat — a chat front end for your n8n workflows" },
      {
        name: "description",
        content:
          "Chat with any n8n webhook from a modern interface: saved conversations, markdown answers, retries and switchable test or production endpoints.",
      },
      { property: "og:title", content: "FlowChat — a chat front end for your n8n workflows" },
      {
        property: "og:description",
        content:
          "Chat with any n8n webhook from a modern interface: saved conversations, markdown answers and switchable endpoints.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();

  useEffect(() => {
    const existing = getThreads();
    const target = existing[0]?.id ?? createThread(uid()).id;
    void navigate({ to: "/chat/$threadId", params: { threadId: target }, replace: true });
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening your chat…</p>
    </div>
  );
}
