# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Dev server with Turbopack
npm run build        # Production build
npm run start        # Start production server
npm run lint         # ESLint
npm run test         # Vitest
npm run setup        # Install deps + generate Prisma client + run migrations
npm run db:reset     # Reset database (prisma migrate reset --force)
npm run dev:daemon   # Dev server in background, logs → logs.txt
```

## Architecture

UIGen is an AI-powered React component generator with live preview, built on Next.js 15 App Router + React 19.

**Core stack:** TypeScript, Tailwind CSS v4, Prisma + SQLite, Anthropic Claude via Vercel AI SDK, Monaco Editor, Babel standalone for in-browser JSX compilation.

### Data flow

1. **Auth & projects** — JWT cookie auth (7-day expiry, bcrypt hashing) handled by server actions in `src/actions/`. Projects store two blobs in SQLite: `messages` (chat history) and `data` (serialized virtual file system).

2. **Main interface** (`src/app/main-content.tsx`) — Three-panel resizable layout: chat (left), preview/code editor (right). State is managed by two React Contexts:
   - `FileSystemContext` — in-memory virtual file system (never written to disk); serialized for DB persistence.
   - `ChatContext` — wraps Vercel AI SDK `useChat`, scoped to the active project.

3. **AI chat loop** (`src/app/api/chat/route.ts`) — Sends user messages + current VFS state to Claude. Claude responds using two tools to manipulate files:
   - `str_replace_editor` — create/edit/view files
   - `file_manager` — rename/delete files
   
   System prompt lives in `src/lib/prompts/generation.tsx` with ephemeral prompt caching. Falls back to a mock LM when `ANTHROPIC_API_KEY` is absent.

4. **Live preview** (`src/components/preview/PreviewFrame.tsx`) — Renders in an isolated iframe. JSX is compiled with Babel standalone (`src/lib/transform/jsx-transformer.ts`); imports resolve via an import map pointing to esm.sh CDN. Auto-detects entry point (`App.jsx`, `index.jsx`, etc.).

5. **Code editor** (`src/components/editor/CodeEditor.tsx`) — Monaco Editor with two-way binding to `FileSystemContext`.

### Key directories

| Path | Purpose |
|------|---------|
| `src/app/` | Next.js pages and API routes |
| `src/components/` | UI components grouped by domain (`chat/`, `editor/`, `preview/`, `auth/`, `ui/`) |
| `src/lib/` | Core logic: file system, auth, Prisma client, AI provider, tool definitions, contexts, prompts, JSX transform |
| `src/actions/` | Server actions for auth and project CRUD |
| `src/hooks/` | Custom React hooks |
| `prisma/` | Schema (User → Projects 1:N) and SQLite migrations |
| `src/generated/` | Auto-generated Prisma client |

### Environment

Set `ANTHROPIC_API_KEY` in `.env` to enable real AI responses. Without it, the app uses a mock language model.
