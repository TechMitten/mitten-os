<div align="center">

# 🧤 MittenOS

**A local-first, web-based desktop environment and OS simulator.**

[![Next.js](https://img.shields.io/badge/Next.js-App_Router-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/State-Zustand-brown?style=flat-square)](https://zustand-demo.pmnd.rs/)
[![Bun](https://img.shields.io/badge/Runtime-Bun-fbf0df?style=flat-square&logo=bun&logoColor=black)](https://bun.sh/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

---

**MittenOS** is a browser-based operating system simulator built with Next.js, Tailwind CSS v4, and Zustand. It features a complete window manager, a persistent virtual file system, a suite of built-in utility apps, and a sandboxed runtime for executing user-created applications safely in the browser.

## ✨ Key Features

- **100% Local & Private File System:** Features a virtual directory structure persisted entirely in browser `localStorage`—keeping your files and workspace data completely offline and private.
- **Full Desktop Experience:** Complete window lifecycle management (open, close, minimize, maximize, focus), custom wallpapers, theming, context menus, and system notifications.
- **Sandboxed App Runtime:** User-built applications run inside isolated `iframe` sandboxes with strict Content Security Policies (CSP). Apps communicate with the host OS via a `postMessage` bridge API (`window.mittenOS`) for safe filesystem access and notification dispatching.
- **Integrated AI Workflow:** Includes built-in AI coding assistance and local API key management to power AI-driven utilities directly from the desktop.

---

## 🖥️ Built-in Applications

*New applications are added weekly.*

| Category | Application | Description | Access |
| :--- | :--- | :--- | :--- |
| **System & Core** | **Files** | Browse, organize, and manage the virtual file system. | Start Menu |
| | **Terminal** | Command-line interface for interacting with the virtual file system. | Start Menu |
| | **Settings** | Configure system preferences (wallpaper, theme, accent color). | Start Menu |
| | **App Store** | Discover and install user-created sandboxed applications. | Start Menu |
| | **About** | View system specifications and OS version info. | *Desktop Right-Click* |
| **Productivity** | **Notepad** | Lightweight plain-text editor for quick notes and code. | Start Menu |
| | **Pencil** | Rich-text editor for writing and formatting documents. | Start Menu |
| | **Calculator** | Standard arithmetic calculator. | Start Menu |
| **AI Suite** | **MittenAI** | AI-powered virtual coding and chat assistant. | Start Menu |
| | **Keys** | Manage AI API endpoints and secret keys. | *System / Hidden* |
| **Media & Web** | **Browser** | Embedded web browser for viewing external sites. | Start Menu |
| | **Photos** | Image viewer and gallery browser. | Start Menu |
| | **Weather** | Check current local and global weather conditions. | Start Menu |

---

## 🏗️ Architecture

MittenOS is structured as a modular Next.js App Router application:

```text
src/
├── components/
│   ├── os/             # Shell UI: Desktop, taskbar, start menu, window frames, dialogs
│   ├── apps/           # Built-in system utilities and SandboxedApp.tsx wrapper
│   └── ui/             # Reusable UI primitives (shadcn/ui + Tailwind v4 + Lucide icons)
├── stores/             # Zustand state management stores
├── lib/
│   ├── os-bridge/      # Sandbox iframe injection and postMessage host bridge (window.mittenOS)
│   └── ai/             # LLM service integrations, system prompts, and type definitions
```

### State Management (`src/stores/`)

| Store | Responsibility |
| :--- | :--- |
| **`desktop-store`** | Manages wallpaper, theme, accent colors, notifications, and desktop preferences. |
| **`window-store`** | Controls window lifecycles, z-index stacking, positioning, and window states. |
| **`filesystem-store`** | Implements the `localStorage`-backed virtual file system and file operations. |
| **`app-registry-store`** | Tracks installed built-in utilities and user-created sandboxed applications. |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** (v18+ recommended)
- **npm** (for package management and local development)
- **Bun** (required for running the standalone production server)

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/TechMitten/mitten-os.git](https://github.com/TechMitten/mitten-os.git)
   cd mitten-os
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables:**
   Create a `.env.local` file in the project root and add any required environment variables.

4. **Start the development server:**
   ```bash
   npm run dev
   ```
   The development server runs at **`http://localhost:3131`** (with output piped to `dev.log`).

---

## 🛠️ Available Scripts

| Command | Description |
| :--- | :--- |
| `npm run dev` | Starts the Next.js development server on port `3131` (logs to `dev.log`). |
| `npm run lint` | Runs a soft ESLint check across the codebase. |
| `npm run build` | Builds the application for standalone production deployment. |
| `npm run start` | Starts the built standalone production server using **Bun**. |
| `npm run build:pages` | Generates a static client-side export in `out/` for Cloudflare Pages. |
| `npm run preview:pages` | Builds the static export and previews it locally using Wrangler. |

---

## 🌐 Deployment

MittenOS supports two deployment modes: **Self-Hosted Standalone** (via Bun) and **Static Edge Hosting** (via Cloudflare Pages).

### Option 1: Standalone Production Server (Bun)

To build and self-host MittenOS as a standalone server:

```bash
# 1. Build the standalone application
npm run build

# 2. Start the production server via Bun
npm run start
```
> **Note:** The build script automatically copies `.next/static` and `public/` assets into the standalone output directory for seamless self-hosting.

### Option 2: Cloudflare Pages (Static Export)

Because MittenOS operates entirely client-side, it can be deployed as a static export (`out/`). Pushes to the `main` branch are automatically deployed via the [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) workflow.

#### One-Time Setup
1. **Create the Cloudflare Pages project:**
   ```bash
   npx wrangler pages project create mittenos --production-branch=main
   ```
2. **Configure GitHub Repository Secrets** (*Settings → Secrets and variables → Actions*):
   - `CLOUDFLARE_API_TOKEN`: API token with **Cloudflare Pages: Edit** permissions.
   - `CLOUDFLARE_ACCOUNT_ID`: Your Cloudflare Account ID.
3. **Custom Domain (Optional):** Attach your custom domain (e.g., `mittenai.dev`) in the Cloudflare Pages dashboard.

#### Local Static Preview
To test the Cloudflare Pages static build locally before pushing:
```bash
npm run preview:pages
```

---

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
