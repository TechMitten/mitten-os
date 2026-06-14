import type { ToolDefinition } from './types';

export const SYSTEM_PROMPT = `You are an expert React + TypeScript developer building apps inside MittenOS, a web-based operating system that runs user-created apps in a sandboxed iframe.

## Environment
- **Runtime**: Browser iframe with React 19 and ReactDOM 19 loaded via esm.sh
- **TypeScript**: The project uses .tsx files. Use TypeScript syntax.
- **Imports**: External packages are imported from esm.sh CDN (e.g., "react", "lodash", "zustand"). You can import any npm package available on esm.sh.
- **Styling**: Use inline styles (React style objects) since there is no CSS module bundler in the sandbox. You may also use a single <style> tag approach by writing to a CSS file.
- **OS API**: Apps can access \`window.mittenOS\` for OS features (setTitle, close, notifications, file system, open other apps). The mittenOS global is always available — do NOT import it.

## Project Structure
- \`src/index.tsx\` - Entry point, renders <App /> to #root
- \`src/App.tsx\` - Main app component
- \`src/mitten.ts\` - Optional helper with a fallback for mittenOS global
- \`package.json\` - Metadata (name, description, version)

## Guidelines
1. **Write complete, production-quality code** — no placeholders or "// TODO" comments
2. **Use React hooks** (useState, useEffect, useCallback, etc.)
3. **Make apps visually polished** — use gradients, shadows, smooth transitions, good typography
4. **Handle edge cases** — loading, empty, error states
5. **Mobile-responsive within the window** — use flexbox/grid, percentage widths
6. **Import React** in every TSX file: \`import React from 'react'\`
7. **Default export** the main component in each file
8. **When creating a new app from scratch**: always update package.json with the app name and description
9. **Edit existing files** with the edit_file tool when making small changes — don't rewrite entire files for minor edits
10. **After finishing**, call run_preview so the user knows to check their app

## Example App Structure
- src/index.tsx: imports App, renders with createRoot
- src/App.tsx: default export function App() { return <div style={{...}}>...</div> }
- src/styles.css (optional): global CSS
- package.json: metadata JSON

You have access to tools for reading, writing, editing, and deleting files. Use them to build the app the user requests. Always explain what you're doing briefly before making changes.`;

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'List all file paths in the current project. Use this to understand the project structure before making changes.',
      parameters: {
        type: 'object',
        properties: {},
        required: [],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the full contents of a file. Always read a file before editing it to ensure you have the current content.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path relative to the project root (e.g., "src/App.tsx")',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create a new file or completely overwrite an existing file. Use this for creating new files or when you need to rewrite a file entirely.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path relative to the project root (e.g., "src/MyComponent.tsx")',
          },
          content: {
            type: 'string',
            description: 'The complete file content',
          },
        },
        required: ['path', 'content'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Perform a surgical string replacement in an existing file. Provide the exact string to find (must match exactly including whitespace/indentation) and the replacement string. Use this for targeted changes instead of rewriting entire files.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path relative to the project root (e.g., "src/App.tsx")',
          },
          old_string: {
            type: 'string',
            description: 'The exact string to find in the file. Must match character-for-character including whitespace and indentation.',
          },
          new_string: {
            type: 'string',
            description: 'The replacement string',
          },
        },
        required: ['path', 'old_string', 'new_string'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'delete_file',
      description: 'Delete a file from the project. Cannot be undone — use with caution.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The file path relative to the project root',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_directory',
      description: 'Create a new directory (folder) in the project structure.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The directory path relative to the project root (e.g., "src/components")',
          },
        },
        required: ['path'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'search_files',
      description: 'Search all files in the project for a pattern. Returns matching file paths and the matching line content.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The search pattern (simple string match or substring)',
          },
        },
        required: ['pattern'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'run_preview',
      description: 'Notify the user that they should preview their app. Call this after making significant changes so the user can see the results.',
      parameters: {
        type: 'object',
        properties: {
          message: {
            type: 'string',
            description: 'A short message about what was changed',
          },
        },
        required: ['message'],
      },
    },
  },
];
