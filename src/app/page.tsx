'use client';

import dynamic from 'next/dynamic';

// The entire OS is a client-side application. Disabling SSR keeps the heavy,
// browser-only runtimes (e.g. @mlc-ai/web-llm, @babel/standalone) out of the
// server bundle, which would otherwise push the Cloudflare Worker over the
// free-tier 3 MiB size limit.
const Desktop = dynamic(() => import('@/components/os/Desktop').then((m) => m.Desktop), {
  ssr: false,
  loading: () => null,
});

export default function Home() {
  return <Desktop />;
}
