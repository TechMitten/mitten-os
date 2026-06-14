'use client';

import React, { useSyncExternalStore, useState, useEffect } from 'react';
import { Info, Cpu, Monitor, HardDrive } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('resize', callback);
  return () => window.removeEventListener('resize', callback);
}

function getResolution() {
  return `${window.innerWidth} x ${window.innerHeight}`;
}

function getServerResolution() {
  return '';
}

export default function AboutSystem() {
  const resolution = useSyncExternalStore(subscribe, getResolution, getServerResolution);

  // Defer client-only values to avoid hydration mismatch
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(rafId);
  }, []);

  const userAgent = mounted
    ? (navigator.userAgent.length > 80
        ? navigator.userAgent.substring(0, 77) + '...'
        : navigator.userAgent)
    : '';

  const platform = mounted ? (navigator.platform || 'N/A') : 'Loading...';
  const language = mounted ? (navigator.language || 'N/A') : 'Loading...';
  const cores = mounted ? (navigator.hardwareConcurrency?.toString() || 'N/A') : 'Loading...';

  return (
    <div className="bg-card dark:bg-zinc-900 text-card-foreground h-full overflow-y-auto select-none flex flex-col items-center">
      {/* Logo area */}
      <div className="pt-8 pb-6 flex flex-col items-center">
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg mb-4">
          <span className="text-3xl font-bold text-white">M</span>
        </div>
        <h1 className="text-xl font-semibold">MittenOS</h1>
        <p className="text-xs text-muted-foreground mt-1">Browser-based Operating System</p>
      </div>

      {/* System info */}
      <div className="w-full max-w-sm px-6">
        <div className="bg-accent dark:bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground/60 dark:text-white/50 font-medium">System Info</span>
          </div>

          <div className="space-y-0">
            <div className="flex justify-between py-2 border-b border-border text-sm">
              <span className="text-muted-foreground/60 dark:text-white/50">Version</span>
              <span className="font-medium">1.0.0</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border text-sm">
              <span className="text-muted-foreground/60 dark:text-white/50">Build</span>
              <span className="font-medium">Next.js 16 + React 19</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border text-sm">
              <span className="text-muted-foreground/60 dark:text-white/50">Runtime</span>
              <span className="font-medium">Browser</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border text-sm items-center">
              <span className="text-muted-foreground/60 dark:text-white/50 flex items-center gap-1.5">
                <Monitor className="w-3 h-3" />
                Resolution
              </span>
              <span className="font-medium text-xs">{resolution || 'Loading...'}</span>
            </div>
            <div className="flex justify-between py-2 text-sm items-start">
              <span className="text-muted-foreground/60 dark:text-white/50 flex items-center gap-1.5">
                <Cpu className="w-3 h-3" />
                User Agent
              </span>
              <span className="font-medium text-xs text-right max-w-[200px] leading-tight">
                {userAgent || 'Loading...'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Hardware info */}
      <div className="w-full max-w-sm px-6 mt-3">
        <div className="bg-accent dark:bg-white/5 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground/60 dark:text-white/50 font-medium">Environment</span>
          </div>

          <div className="space-y-0">
            <div className="flex justify-between py-2 border-b border-border text-sm">
              <span className="text-muted-foreground/60 dark:text-white/50">Platform</span>
              <span className="font-medium text-xs">{platform}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border text-sm">
              <span className="text-muted-foreground/60 dark:text-white/50">Language</span>
              <span className="font-medium text-xs">{language}</span>
            </div>
            <div className="flex justify-between py-2 text-sm">
              <span className="text-muted-foreground/60 dark:text-white/50">Cores</span>
              <span className="font-medium text-xs">{cores}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Credits */}
      <div className="w-full max-w-sm px-6 mt-3">
        <div className="bg-accent dark:bg-white/5 rounded-xl p-4">
          <span className="text-xs uppercase tracking-wider text-muted-foreground/60 dark:text-white/50 font-medium">Credits</span>
          <div className="mt-2 space-y-1.5">
            <p className="text-xs text-muted-foreground/70">Built with Next.js, React, Tailwind CSS, shadcn/ui, Framer Motion</p>
            <p className="text-xs text-muted-foreground/70">Icons by Lucide</p>
            <p className="text-xs text-muted-foreground/70">Window management with Zustand</p>
          </div>
        </div>
      </div>

      {/* License */}
      <div className="w-full max-w-sm px-6 mt-3 mb-6">
        <div className="bg-accent dark:bg-white/5 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">Licensed under the MIT License</p>
          <p className="text-[10px] text-muted-foreground/40 mt-1">© 2025 MittenOS Project</p>
        </div>
      </div>
    </div>
  );
}
