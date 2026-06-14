import { OS_BRIDGE_CLIENT_SCRIPT } from './client';

const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline' 'unsafe-eval' https://esm.sh https://cdn.jsdelivr.net https://unpkg.com",
  "style-src 'unsafe-inline' https://esm.sh https://cdn.jsdelivr.net",
  "img-src data: https: http:",
  "connect-src *",
  "font-src 'self' data: https://esm.sh https://cdn.jsdelivr.net",
].join('; ');

const REACT_TEMPLATE = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="viewport" content="width=device-width, initial-scale=1">
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@19",
    "react-dom/": "https://esm.sh/react-dom@19/",
    "react/": "https://esm.sh/react@19/"
  }
}
</script>
</head>
<body>
<div id="root"></div>
${OS_BRIDGE_CLIENT_SCRIPT}
<script type="module">
import React from 'react';
import { createRoot } from 'react-dom/client';
__APP_CODE__
const rootEl = document.getElementById('root');
if (rootEl && typeof App !== 'undefined') {
  createRoot(rootEl).render(React.createElement(App));
}
</script>
</body>
</html>`;

interface TemplateOptions {
  compiledCode: string;
  entryPoint?: string;
  cssContent?: string;
}

export function generateReactTemplate(options: TemplateOptions): string {
  const { compiledCode, entryPoint = 'App', cssContent } = options;

  let html = REACT_TEMPLATE;

  html = html.replace('__APP_CODE__', compiledCode);

  if (entryPoint !== 'App') {
    html = html.replace(
      `React.createElement(App)`,
      `React.createElement(${entryPoint})`
    );
  }

  if (cssContent) {
    html = html.replace('</head>', `<style>${cssContent}</style></head>`);
  }

  return html;
}

export function generateHtmlTemplate(htmlContent: string): string {
  const htmlCsp = [
    "default-src 'none'",
    "script-src 'unsafe-inline' 'unsafe-eval'",
    "style-src 'unsafe-inline'",
    "img-src data: https: http:",
    "connect-src *",
    "font-src 'self' data:",
  ].join('; ');

  if (htmlContent.includes('<head')) {
    return htmlContent.replace(
      /<head>/i,
      `<head><meta http-equiv="Content-Security-Policy" content="${htmlCsp}">`
    );
  }

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${htmlCsp}"><meta name="viewport" content="width=device-width, initial-scale=1">${OS_BRIDGE_CLIENT_SCRIPT}</head><body>${htmlContent}</body></html>`;
}
