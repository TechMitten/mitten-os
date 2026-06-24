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

- **`src/components/os/`** — shell layer: Desktop, Taskbar, StartMenu, Window chrome, DesktopIcon, ContextMenu, WelcomeWindow, LoginScreen
- **`src/components/apps/`** — built-in OS apps: FileExplorer, Terminal, Browser, TextEditor, Calculator, Settings, ImageViewer, AppStore, Weather, AboutSystem, OrionAppBuilder, SandboxedApp
- **`src/stores/`** — Zustand stores: `desktop-store` (wallpaper/theme/icons/notifications/settings persistence), `window-store` (window lifecycle), `filesystem-store` (virtual FS synced to Supabase), `auth-store` (Supabase auth), `app-registry-store` (built-in + user-submitted apps)
- **`src/lib/supabase/`** — thin wrappers for `@supabase/ssr` (browser client + server client using cookies)
- **`src/lib/os-bridge/`** — iframe sandboxing for user-built apps. The `SandboxedApp` component creates an iframe, injects `OS_BRIDGE_CLIENT_SCRIPT` + compiled React/HTML code, and communicates via `postMessage`. CSP headers restrict what sandboxed apps can access.
- **`src/lib/ai/`** — chat service, tool definitions, and types. API route at `src/app/api/ai/chat/route.ts`.
- **`src/components/ui/`** — shadcn/ui components (toast, switch, tooltip)

## Key conventions

- **`@/` path alias** maps to `src/` (configured in `tsconfig.json`)
- **shadcn/ui** new-york style with `lucide-react` icons. `cn()` helper lives in `src/lib/utils.ts`
- **Tailwind v4** with `tw-animate-css`. Dark mode via `class` strategy on a wrapping `<div className="dark">`
- **Custom app window components have their own wiring.** Built-in apps are registered in `APP_COMPONENT_MAP` inside `Desktop.tsx` — add new built-in apps there
- **User apps** (from the App Store / App Builder) are loaded from the `user_apps` Supabase table and rendered via `SandboxedApp` with `srcDoc` iframes. User apps use the OS bridge API (`window.mittenOS`) for FS operations, notifications, etc.

## Supabase schema (inferred)

The app expects these tables (no migration files in the repo):

- `user_settings` — columns: `user_id`, `theme`, `wallpaper`, `settings_json` (jsonb), `window_states` (jsonb), `icon_positions` (jsonb), `updated_at`
- `filesystem_nodes` — columns: `id`, `user_id`, `parent_id`, `name`, `type`, `content`, `mime_type`, `sort_order`, `created_at`, `updated_at`
- `user_apps` — columns: `id`, `user_id`, `name`, `description`, `icon`, `category`, `html_content`, `source_files` (jsonb), `compiled_html`, `app_type`, `default_window_size` (jsonb), `min_window_size` (jsonb), `singleton`, `status`, `submitted_at`, `reviewed_at`, `created_at`, `updated_at`
- `projects` — columns: `id` (text PK), `user_id` (uuid), `name` (text), `data` (jsonb: `{ versions, currentVersionIndex }`), `updated_at` (timestamptz)
- A Supabase RPC function `check_user_exists(user_email)` returning `{ user_exists: boolean, email_confirmed: boolean }`

## Environment

`.env.local` must define:
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
DEEPSEEK_API_KEY=<set to use DeepSeek>
DEEPSEEK_MODEL=<optional, defaults to deepseek-v4-pro>
ZAI_API_KEY=<set to use Z.ai GLM (mutually exclusive with DEEPSEEK_API_KEY)>
ZAI_MODEL=<optional, defaults to glm-5.1>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<set to enable the Turnstile widget on the email/OTP sign-in flow; unset = no widget, no gating, today's behavior>
```

**Turnstile protects the OTP email flow via Supabase Auth's own bot-protection, not a custom API route.** `LoginScreen` and `AccountSwitcher` render a Cloudflare Turnstile widget (`src/components/auth/Turnstile.tsx`) when `NEXT_PUBLIC_TURNSTILE_SITE_KEY` is set, and pass the resulting token as `captchaToken` into `supabase.auth.signInWithOtp()` (`src/stores/auth-store.ts`). For that token to actually be enforced, **Bot and Abuse Protection must be enabled in the Supabase Dashboard** (Authentication → Settings, provider = Turnstile, paste the Turnstile secret key there) — this is a manual, one-time step outside this repo since auth config isn't exposed via the Supabase MCP tools. GitHub OAuth is intentionally left ungated: Supabase doesn't support `captchaToken` for OAuth, and GitHub's own consent screen is already the bot barrier there.

## Cloudflare deployment

The app deploys to Cloudflare Workers via [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) (`@opennextjs/cloudflare` + `wrangler`, configured in `wrangler.jsonc` / `open-next.config.ts`), bound to the custom domain `mittenai.dev` (and `www.mittenai.dev`).

- **`NEXT_PUBLIC_*` vars are build-time.** They get inlined into the client bundle when `next build` runs (inside `npm run build:cf`), so they must be set wherever the build runs (local `.env.local`, or as build variables in the Cloudflare dashboard if using Git-connected builds) — not as Worker secrets. This includes `NEXT_PUBLIC_TURNSTILE_SITE_KEY`.
- **Non-public vars are runtime.** `DEEPSEEK_API_KEY`, `DEEPSEEK_MODEL`, `DEEPSEEK_BASE_URL`, `CODING_ASSISTANT_DEEPSEEK_API_KEY`, `CODING_ASSISTANT_DEEPSEEK_MODEL` are read from `process.env` inside Route Handlers at request time. Set them with `wrangler secret put <NAME>` for production, or in a local `.dev.vars` (copy from `.dev.vars.example`) for `npm run preview`.
- **Exception: the Turnstile secret key is not a Worker secret.** It's configured directly in the Supabase Dashboard (Bot and Abuse Protection), not read by this app's `process.env` anywhere, so it doesn't go through `wrangler secret put` or `.dev.vars` — only the public site key is part of this app's build.
- **`npm run cf-typegen`** regenerates `cloudflare-env.d.ts` after editing `wrangler.jsonc` bindings.

## Gotchas

- **Bun for production, npm for dev.** `npm run start` invokes `bun .next/standalone/server.js`. The dev server runs with `next dev -p 3000` via `node_modules/.bin/next` — bun is only needed for the production server.
- **Standalone output requires manual copy.** The `build` script copies `.next/static` to `.next/standalone/.next/` and `public` to `.next/standalone/`. This is because Next.js standalone output doesn't include these automatically.
- **No RLS or migration files in the repo.** All Supabase schema/auth setup is external. Apps are loaded from `user_apps` where `status = 'approved'`.
- **User auth is mandatory.** `Desktop.tsx` gatekeeps everything behind `useAuthStore` — unauthenticated users see `LoginScreen`, and loading states render a spinner.
- **The App Builder (`OrionAppBuilder.tsx`) is an AI-powered app generator** that creates self-contained HTML files from natural language prompts. It uses direct client-side AI API calls (Z.ai, OpenRouter, or custom OpenAI-compatible endpoint) with streaming, surgical edits, and version history. Projects are saved to Supabase's `projects` table.
- **`dev.log` and `server.log` are gitignored** but are produced by the npm scripts using `tee`.
- **File system is flat via `buildTree`.** The `filesystem_nodes` table stores all nodes with `parent_id` references; `loadFromDB` reconstructs the tree in memory.
