# MittenOS

MittenOS is a web-based desktop environment and operating system simulator built on Next.js, Tailwind CSS v4, and Zustand. It provides a window manager, a virtual file system persisted to the browser, a suite of built-in utility applications, and a sandboxed application runtime with an AI-assisted application builder.

## Key Features

- **Desktop Shell**: Multi-window system, window manager, start menu, taskbar, desktop icons, notifications, context menus, and a customizable theme engine (including wallpapers and dark mode).
- **Virtual File System**: A complete local-first virtual directory structure persisted to browser `localStorage`.
- **Built-in Applications**: Includes a File Explorer, Terminal, Web Browser, Text Editor, Calculator, Weather app, Settings app, and Image Viewer.
- **Orion App Builder**: An AI-powered app generator that creates self-contained HTML/JS applications from natural language prompts, supporting streaming generation, surgical edits, and version history.
- **Sandboxed Runtime**: User-built apps are rendered in iframe sandboxes with custom Content Security Policies (CSP) and communicate with the host environment using a postMessage-based bridge API (`window.mittenOS`) for filesystem access and notification dispatching.

## Architecture

The project is structured as a Next.js App Router application:

- **`src/components/os/`**: Shell-level interface components, including the main `Desktop`, taskbar, start menu, window frames, context menus, and system dialogs.
- **`src/components/apps/`**: Source files for both system utilities and specialized applications (e.g., `OrionAppBuilder.tsx`, `SandboxedApp.tsx`).
- **`src/stores/`**: Zustand state management stores:
  - `desktop-store`: Manages wallpaper, theme, notification state, and preferences.
  - `window-store`: Manages window lifecycles (open, close, minimize, maximize).
  - `filesystem-store`: Implements the virtual file system.
  - `app-registry-store`: Keeps track of built-in and user-created applications.
- **`src/lib/os-bridge/`**: Sandbox integration layers and communication scripts that inject the MittenOS API into user-built iframes.
- **`src/lib/ai/`**: Services, prompts, and type definitions for LLM integrations.
- **`src/components/ui/`**: Reusable UI primitives (shadcn/ui built on Tailwind v4 and Lucide icons).

## Prerequisites

- **Node.js** (v18 or higher recommended)
- **npm** (for development)
- **Bun** (required for production server execution)

## Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/TechMitten/mitten-os.git
cd mitten-os
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Setup
Create a `.env.local` file in the root directory and configure your AI model keys (required for the Orion App Builder):

```ini
# DeepSeek configuration (optional)
DEEPSEEK_API_KEY=your_deepseek_api_key_here
DEEPSEEK_MODEL=deepseek-v4-pro

# Z.ai configuration (optional)
ZAI_API_KEY=your_zai_api_key_here
ZAI_MODEL=glm-5.1
```

### 4. Run the Development Server
```bash
npm run dev
```
The server will start on port `3000`. Logs are piped to `dev.log`.

---

## Production Build & Run

To build and run the application in a standalone production environment:

```bash
# Build the production application
npm run build

# Start the standalone server (requires Bun)
npm run start
```

*Note: The build process copies Next.js static assets (`.next/static` and `public`) into the standalone directory for correct self-hosting.*

---

## Cloudflare Workers Deployment

MittenOS is configured to deploy to Cloudflare Workers via OpenNext.

### Build and Test Locally
```bash
# Compile the application for Cloudflare (OpenNext)
npm run build:cf

# Preview locally in the Wrangler Workers runtime
npm run preview
```

### Deployment
To deploy directly to Cloudflare:
```bash
npm run deploy
```

If you modify bindings inside `wrangler.jsonc`, regenerate the environment interface:
```bash
npm run cf-typegen
```

---

## Development Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js development server. |
| `npm run build` | Builds the Next.js application for production. |
| `npm run start` | Runs the built standalone production server using Bun. |
| `npm run lint` | Performs a soft ESLint check. |
| `npm run build:cf` | Generates a Cloudflare-compatible build inside `.open-next/`. |
| `npm run preview` | Runs a local Wrangler dev server to preview Cloudflare compilation. |
| `npm run deploy` | Deploys the application directly to Cloudflare. |

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
