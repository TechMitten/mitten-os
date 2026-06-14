'use client';

import React, { useMemo } from 'react';

interface SandboxedAppProps {
  htmlContent: string;
}

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval'",
  "style-src 'unsafe-inline'",
  "img-src data: https: http:",
  "connect-src *",
  "font-src 'self' data:",
].join('; ');

export function SandboxedApp({ htmlContent }: SandboxedAppProps) {
  const wrapped = useMemo(() => {
    return htmlContent.includes('<meta')
      ? htmlContent.replace(
          /<head>/i,
          `<head><meta http-equiv="Content-Security-Policy" content="${CSP}">`
        )
      : `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${CSP}"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body>${htmlContent}</body></html>`;
  }, [htmlContent]);

  return (
    <iframe
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      title="User App"
      srcDoc={wrapped}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
      }}
    />
  );
}

export default SandboxedApp;
