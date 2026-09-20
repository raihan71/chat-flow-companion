# Chat Flow Companion

Build a modern, full-featured web chatbot application connected to an n8n webhook backend.

Key requirements and architecture based on the shared spec:
1. **Webhook Integration**:
   - Default Webhook URL: `https://nnn.trilinguecita.com/webhook-test/05da907b-710d-4bca-a7ee-a38bc0762849`
   - Configurable in a Settings dialog/drawer so the user can easily switch between test and production webhooks (e.g. `https://nnn.trilinguecita.com/webhook/05da907b-710d-4bca-a7ee-a38bc0762849`), or test custom endpoints and headers/auth tokens.
   - Request payload sent on message:
     ```json
     {
       "message": "<user message>",
       "conversationId": "<uuid>",
       "userId": "<uuid or client id>",
       "timestamp": "<iso timestamp>"
     }
     ```
   - Resilient response parsing supporting all common n8n return patterns:
     - Standard contract: `{ "message": { "content": "..." } }`
     - Flat object: `{ "output": "..." }`, `{ "text": "..." }`, `{ "response": "..." }`, `{ "message": "..." }`, `{ "content": "..." }`
     - Array of items (standard n8n list output `[{ "json": { ... } }]`)
     - Plain text string response
   - Helpful error handling: if n8n returns 404 (e.g. "The requested webhook is not registered - click Execute workflow in test mode or activate workflow"), display an informative inline banner or message explaining how to trigger/listen in n8n or toggle to production.

2. **Chat Interface & Features**:
   - Clean, modern AI chat UI inspired by ChatGPT (sidebar with conversation history, persistent in localStorage).
   - Rich message rendering with Markdown formatting, syntax-highlighted code blocks with copy-to-clipboard buttons.
   - Typing/loading indicator with elapsed time or friendly status.
   - "New Chat", delete chat, rename chat capabilities.
   - Quick prompt suggestions / starter cards for new sessions.
   - Retry failed messages option.
   - Responsive design on mobile and desktop with dark/light theme support.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/23004666-8a29-4a8a-9ca3-8d7bf5480a1d).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
