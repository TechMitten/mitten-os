import type { NextConfig } from "next";
import os from "os";

function getAllowedDevOrigins(): string[] {
  const origins = new Set<string>([
    "localhost",
    "127.0.0.1",
    "[::1]",
    "0.0.0.0",
    "*.github.dev",
    "*.app.github.dev",
  ]);

  // Dynamically include all local network interfaces (e.g. container / LAN IPs)
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] || []) {
      if (iface.address) {
        origins.add(iface.address);
      }
    }
  }

  // Support custom environment variables
  if (process.env.ALLOWED_DEV_ORIGINS) {
    process.env.ALLOWED_DEV_ORIGINS.split(",").forEach((origin) => {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    });
  }

  if (process.env.DEV_ORIGIN) {
    origins.add(process.env.DEV_ORIGIN.trim());
  }

  if (process.env.CODESPACE_NAME) {
    origins.add(`${process.env.CODESPACE_NAME}-3131.app.github.dev`);
    origins.add(`${process.env.CODESPACE_NAME}-3131.github.dev`);
  }

  return Array.from(origins);
}

// Static export for Cloudflare Pages (`npm run build:pages`); standalone for
// Docker/self-hosting (`npm run build`). Only one output mode is allowed per build.
const isStaticExport = process.env.NEXT_OUTPUT === "export";

const nextConfig: NextConfig = {
  output: isStaticExport ? "export" : "standalone",
  /* config options here */
  experimental: {
    agentUpgrade: "security",
  },
  turbopack: {
    root: import.meta.dirname,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: getAllowedDevOrigins(),
};

export default nextConfig;

