# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Quick commands

```bash
npm run dev        # Start dev server on port 3000, logs go to dev.log
npm run build      # Production build (Next.js standalone output)
npm run start      # Production server (uses Bun)
npm run lint       # ESLint (soft check, nearly all rules disabled)

npm run build:cf   # Build for Cloudflare via OpenNext
npm run preview    # build:cf + wrangler dev (local Workers preview)
npm run deploy     # build:cf + wrangler deploy (deploy to Cloudflare)
npm run cf-typegen # Regenerate cloudflare-env.d.ts from wrangler.jsonc
```

**No tests or typecheck scripts.** `next.config.ts` sets `ignoreBuildErrors: true` and `reactStrictMode: false`; ESLint is permissive.

## Architecture

MittenOS is a Next.js App Router app that simulates a browser-based desktop environment. The entry point is `src/app/page.tsx`, which renders `<Desktop>`, a state-orchestrating shell that manages windows, apps, and the file system.

**Layer structure:**

- **`src/components/os/`** — Shell layer: `Desktop` (main orchestrator), `Taskbar`, `StartMenu`, `Window` (chrome), `DesktopIcon`, `ContextMenu`, `WelcomeWindow`
- **`src/components/apps/`** — Built-in apps (FileExplorer, Terminal, Browser, TextEditor, Calculator, Settings, ImageViewer, AppStore, Weather, AboutSystem) + specialized apps (`OrionAppBuilder`, `SandboxedApp`)
- **`src/stores/`** — Zustand state management:
  - `desktop-store` — wallpaper, theme, notifications, desktop settings (persisted to localStorage)
  - `window-store` — window lifecycle (open, close, minimize, maximize)
  - `filesystem-store` — virtual file system (persisted to localStorage)
  - `auth-store` — currently a static mock user (login bypassed)
  - `app-registry-store` — built-in and user-created app registry
- **`src/lib/os-bridge/`** — Sandbox integration: `SandboxedApp` creates an iframe, injects compiled code + the `OS_BRIDGE_SCRIPT`, and communicates via `postMessage`. CSP headers restrict sandboxed app capabilities. User apps access the host via `window.mittenOS` API (filesystem, notifications).
- **`src/lib/ai/`** — LLM integrations: chat service, tool definitions, type definitions. API route: `src/app/api/ai/chat/route.ts`
- **`src/components/ui/`** — shadcn/ui component library (toast, switch, tooltip)
- **`src/types/`** — Type definitions for apps, windows, filesystem, etc.
- **`src/hooks/`** — Custom React hooks for common patterns

## Key conventions

- **Path alias `@/`** maps to `src/` in `tsconfig.json`
- **shadcn/ui** (new-york style, lucide-react icons). Helper `cn()` is in `src/lib/utils.ts`
- **Tailwind v4** with `tw-animate-css`. Dark mode via `class` strategy on a wrapping `<div className="dark">`
- **Built-in app registration:** Add new built-in apps to `APP_COMPONENT_MAP` inside `src/components/os/Desktop.tsx`
- **User-created apps:** Loaded from localStorage, rendered via `SandboxedApp` with `srcDoc` iframes. User apps communicate via the `window.mittenOS` bridge API
- **Styling:** Component libraries use `cva` (class-variance-authority) for variant-driven styling; compose utility classes with `cn()`

## Environment

**Required in `.env.local` for LLM integration:**
```
DEEPSEEK_API_KEY=<DeepSeek API key>
DEEPSEEK_MODEL=<optional, defaults to deepseek-v4-pro>
ZAI_API_KEY=<Z.ai API key, mutually exclusive with DEEPSEEK_API_KEY>
ZAI_MODEL=<optional, defaults to glm-5.1>
```

For Cloudflare deployment, runtime secrets are set via `wrangler secret put <NAME>` or `.dev.vars` (for `npm run preview`).

## Cloudflare Workers deployment

Deploys via [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) to custom domain `mittenai.dev`.

- **`NEXT_PUBLIC_*` vars are build-time.** Inlined into the client bundle during `next build`, so must be set in the build environment (`.env.local` for local builds, Cloudflare dashboard for CI builds)
- **Non-public vars are runtime.** `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `ZAI_API_KEY`, `ZAI_MODEL` read from `process.env` in Route Handlers at request time
- After editing `wrangler.jsonc` bindings, run `npm run cf-typegen` to regenerate environment type definitions

## Gotchas

- **Bun is only for production.** Dev runs via `node` + `next dev`; production server runs `bun .next/standalone/server.js`
- **Standalone build requires manual asset copy.** The `build` script copies `.next/static` → `.next/standalone/.next/` and `public` → `.next/standalone/` because Next.js standalone output doesn't include them
- **Auth is bypassed.** The desktop boots into a default user environment without a login flow
- **The App Builder** (`src/components/apps/OrionAppBuilder.tsx`) is an AI-powered app generator. It creates self-contained HTML/JS applications from natural language prompts, with streaming generation, surgical edits, and version history. Projects saved to localStorage
- **File system persisted to localStorage.** VFS operations (read, write, delete) are all in-memory + localStorage
- **`dev.log` and `server.log` are gitignored** (output from `tee` in npm scripts)

## Claude Code instructions

- **Do not use the browser skill.** Do not invoke it in this repository, under any circumstances.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
