# AGENTS.md — MittenOS

## Quick commands

```bash
npm run dev        # start dev server on port 3000, output logged to dev.log
npm run build      # production build (standalone output)
npm run lint       # eslint
npm run start      # production server (uses bun)

npm run build:cf   # build via OpenNext for Cloudflare (.open-next/)
npm run preview    # build:cf + wrangler dev (local Workers runtime preview)
npm run deploy     # build:cf + wrangler deploy (deploys to Cloudflare)
npm run cf-typegen # regenerate cloudflare-env.d.ts from wrangler.jsonc bindings
```

There are no typecheck or test scripts. `next.config.ts` sets `ignoreBuildErrors: true` and `reactStrictMode: false`. The ESLint config disables nearly all rules — `npm run lint` is a soft check.

## Architecture

MittenOS is a Next.js App Router app that renders a browser-based desktop environment ("OS"). The single page (`/`) mounts `Desktop`, which orchestrates everything:

- **`src/components/os/`** — shell layer: Desktop, Taskbar, StartMenu, Window chrome, DesktopIcon, ContextMenu, WelcomeWindow
- **`src/components/apps/`** — built-in OS apps: FileExplorer, Terminal, Browser, TextEditor, Calculator, Settings, ImageViewer, AppStore, Weather, AboutSystem, OrionAppBuilder, SandboxedApp
- **`src/stores/`** — Zustand stores: `desktop-store` (wallpaper/theme/icons/notifications/settings persistence to localStorage), `window-store` (window lifecycle), `filesystem-store` (virtual FS persisted to localStorage), `auth-store` (bypassed static mock user), `app-registry-store` (built-in + local user apps)
- **`src/lib/os-bridge/`** — iframe sandboxing for user-built apps. The `SandboxedApp` component creates an iframe, injects `OS_BRIDGE_SCRIPT` + compiled React/HTML code, and communicates via `postMessage`. CSP headers restrict what sandboxed apps can access.
- **`src/lib/ai/`** — chat service, tool definitions, and types. API route at `src/app/api/ai/chat/route.ts`.
- **`src/components/ui/`** — shadcn/ui components (toast, switch, tooltip)

## Key conventions

- **`@/` path alias** maps to `src/` (configured in `tsconfig.json`)
- **shadcn/ui** new-york style with `lucide-react` icons. `cn()` helper lives in `src/lib/utils.ts`
- **Tailwind v4** with `tw-animate-css`. Dark mode via `class` strategy on a wrapping `<div className="dark">`
- **Custom app window components have their own wiring.** Built-in apps are registered in `APP_COMPONENT_MAP` inside `Desktop.tsx` — add new built-in apps there
- **User apps** (from the App Store / App Builder) are loaded from localStorage and rendered via `SandboxedApp` with `srcDoc` iframes. User apps use the OS bridge API (`window.mittenOS`) for FS operations, notifications, etc.

## Environment

`.env.local` must define:
```
DEEPSEEK_API_KEY=<set to use DeepSeek>
DEEPSEEK_MODEL=<optional, defaults to deepseek-v4-pro>
ZAI_API_KEY=<set to use Z.ai GLM (mutually exclusive with DEEPSEEK_API_KEY)>
ZAI_MODEL=<optional, defaults to glm-5.1>
```

## Cloudflare deployment

The app deploys to Cloudflare Workers via [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare` + `wrangler`, configured in `wrangler.jsonc` / `open-next.config.ts`), bound to the custom domain `mittenai.dev` (and `www.mittenai.dev`).

- **`NEXT_PUBLIC_*` vars are build-time.** They get inlined into the client bundle when `next build` runs (inside `npm run build:cf`), so they must be set wherever the build runs (local `.env.local`, or as build variables in the Cloudflare dashboard if using Git-connected builds).
- **Non-public vars are runtime.** `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `CODING_ASSISTANT_DEEPSEEK_API_KEY`, `CODING_ASSISTANT_DEEPSEEK_MODEL` are read from `process.env` inside Route Handlers at request time. Set them with `wrangler secret put <NAME>` for production, or in a local `.dev.vars` (copy from `.dev.vars.example`) for `npm run preview`.
- **`npm run cf-typegen`** regenerates `cloudflare-env.d.ts` after editing `wrangler.jsonc` bindings.

## Gotchas

- **Bun for production, npm for dev.** `npm run start` invokes `bun .next/standalone/server.js`. The dev server runs with `next dev -p 3000` via `node_modules/.bin/next` — bun is only needed for the production server.
- **Standalone output requires manual copy.** The `build` script copies `.next/static` to `.next/standalone/.next/` and `public` to `.next/standalone/`. This is because Next.js standalone output doesn't include these automatically.
- **Bypassed auth.** The desktop boots directly into a default user environment without a login screen.
- **The App Builder (`OrionAppBuilder.tsx`) is an AI-powered app generator** that creates self-contained HTML files from natural language prompts. It uses direct client-side AI API calls (Z.ai, OpenRouter, or custom OpenAI-compatible endpoint) with streaming, surgical edits, and version history. Projects are saved to browser localStorage.
- **`dev.log` and `server.log` are gitignored** but are produced by the npm scripts using `tee`.
- **File system is persisted to localStorage.**

