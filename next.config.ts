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
    origins.add(`${process.env.CODESPACE_NAME}-3000.app.github.dev`);
    origins.add(`${process.env.CODESPACE_NAME}-3000.github.dev`);
  }

  return Array.from(origins);
}

const nextConfig: NextConfig = {
  output: "standalone",
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: getAllowedDevOrigins(),
  // Poll for file changes so HMR/Fast Refresh works inside the dev container,
  // where inotify events don't propagate across the bind mount.
  watchOptions: {
    pollIntervalMs: 1000,
  },
};

export default nextConfig;

