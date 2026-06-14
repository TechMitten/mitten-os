# AGENTS.md — MittenOS

## Quick commands

```bash
npm run dev      # start dev server on port 3000, output logged to dev.log
npm run build    # production build (standalone output)
npm run lint     # eslint
npm run start    # production server (uses bun)
```

There are no typecheck or test scripts. `next.config.ts` sets `ignoreBuildErrors: true` and `reactStrictMode: false`. The ESLint config disables nearly all rules — `npm run lint` is a soft check.

## Architecture

MittenOS is a Next.js App Router app that renders a browser-based desktop environment ("OS"). The single page (`/`) mounts `Desktop`, which orchestrates everything:

- **`src/components/os/`** — shell layer: Desktop, Taskbar, StartMenu, Window chrome, DesktopIcon, ContextMenu, WelcomeWindow, LoginScreen
- **`src/components/apps/`** — built-in OS apps: FileExplorer, Terminal, Browser, TextEditor, Calculator, Settings, ImageViewer, AppStore, Weather, AboutSystem, AppBuilder, SandboxedApp
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
- A Supabase RPC function `check_user_exists(user_email)` returning `{ user_exists: boolean, email_confirmed: boolean }`

## Environment

`.env.local` must define:
```
NEXT_PUBLIC_SUPABASE_URL=<url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
DEEPSEEK_API_KEY=<optional, for AI chat>
```

## Gotchas

- **Bun for production, npm for dev.** `npm run start` invokes `bun .next/standalone/server.js`. The dev server runs with `next dev -p 3000` via `node_modules/.bin/next` — bun is only needed for the production server.
- **Standalone output requires manual copy.** The `build` script copies `.next/static` to `.next/standalone/.next/` and `public` to `.next/standalone/`. This is because Next.js standalone output doesn't include these automatically.
- **No RLS or migration files in the repo.** All Supabase schema/auth setup is external. Apps are loaded from `user_apps` where `status = 'approved'`.
- **User auth is mandatory.** `Desktop.tsx` gatekeeps everything behind `useAuthStore` — unauthenticated users see `LoginScreen`, and loading states render a spinner.
- **The App Builder (`AppBuilder.tsx`) compiles TypeScript in the browser** using `@babel/standalone`. It generates iframe-ready HTML with an import map pointing to `esm.sh` CDN for React 19.
- **`dev.log` and `server.log` are gitignored** but are produced by the npm scripts using `tee`.
- **File system is flat via `buildTree`.** The `filesystem_nodes` table stores all nodes with `parent_id` references; `loadFromDB` reconstructs the tree in memory.
