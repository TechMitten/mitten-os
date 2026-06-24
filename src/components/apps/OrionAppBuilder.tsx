'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useWindowStore } from '@/stores/window-store';
import { createClient } from '@/lib/supabase/client';
import {
  Wand2, Smartphone, Code2, Play, Loader2, History, Settings, Layout, Download,
  RefreshCw, Sparkles, ChevronRight, TerminalSquare, Plus, Edit2, Clock,
  Undo2, Redo2, FolderOpen, X, Copy, Check, Trash2, ZoomIn, ZoomOut,
  Monitor, PanelLeftOpen, PanelLeftClose, TriangleAlert, Brain,
} from 'lucide-react';

// --- Types ---
interface Version {
  id: number;
  prompt: string;
  code: string;
  timestamp: string;
  editMode: string;
  editSummary: string;
}

interface Project {
  id: string;
  name: string;
  versions: Version[];
  currentVersionIndex: number;
  lastModified?: Date;
}

interface SurgicalEdit {
  search: string;
  replace: string;
}

interface SurgicalEditResult {
  success: boolean;
  code?: string;
  error?: string;
  failedBlock?: string;
}

// --- Constants ---
const SURGICAL_EDIT_TOOL = {
  type: 'function' as const,
  function: {
    name: 'apply_surgical_edits',
    description: 'Applies precise search-and-replace edits to the current code. Each search block MUST include enough unique surrounding context (5+ lines) to guarantee a single unambiguous match. Use landmark comments (<!-- @section: name -->) as anchors. Prefer fewer, larger edits over many tiny ones.',
    parameters: {
      type: 'object' as const,
      properties: {
        edits: {
          type: 'array' as const,
          items: {
            type: 'object' as const,
            properties: {
              search: { type: 'string' as const, description: 'Exact code to find. Include 5+ lines of unique surrounding context.' },
              replace: { type: 'string' as const, description: 'Replacement code. Preserve surrounding context and indentation.' },
            },
            required: ['search', 'replace'],
            additionalProperties: false,
          },
        },
      },
      required: ['edits'],
      additionalProperties: false,
    },
    strict: true,
  },
};

const HTML_SYSTEM_PROMPT = `You are an expert frontend developer and UX designer. 
Generate a complete, self-contained HTML file (with inline CSS and JS) that implements the user's requested app.

CRITICAL RULES:
1. Output ONLY valid, raw HTML code or use the provided tools for edits.
2. DO NOT wrap the output in markdown formatting (e.g., no \`\`\`html or \`\`\` blocks).
3. Follow the platform-targeting instructions in the user request exactly.
4. Use Tailwind CSS via CDN (<script src="https://cdn.tailwindcss.com"></script>) for styling.
5. Include modern UI elements, rounded corners, good typography, and smooth interactions.
6. Ensure any JavaScript is fully functional and self-contained within a <script> tag.
7. For mobile-focused apps, always include viewport-fit=cover meta tag and safe-area-inset padding.

SURGICAL EDIT GUIDELINES:
- Analyze the full code structure before deciding where and how to edit.
- SEARCH blocks MUST span 5-10 lines including unique surrounding context to avoid false matches.
- Use <!-- @section: name --> landmark comments as structural anchors for precise targeting.
- Combine related changes into fewer, larger edit blocks rather than scattering tiny edits.
- Verify mentally that each search string appears exactly once in the code before submitting.
- If adding new elements, search for the nearest landmark comment or distinctive container and replace the entire section.

Do not include any explanations, markdown markers, or text outside of these formats.`;

const getSafeAreaInstruction = (layoutTarget: string): string => {
  if (layoutTarget === 'desktop') return '';
  return ' Respect modern phone safe areas: include a viewport meta tag with viewport-fit=cover and pad edge-aligned headers, footers, and fixed controls with env(safe-area-inset-top/right/bottom/left) so nothing is hidden by a notch or home indicator.';
};

type ProviderId = 'zai' | 'gemini' | 'openrouter' | 'custom' | 'mittenai';

interface ProviderOption {
  id: ProviderId;
  label: string;
  description: string;
  icon: React.ComponentType<{ size?: number }>;
}

const PROVIDER_OPTIONS: ProviderOption[] = [
  { id: 'mittenai', label: 'MittenAI', description: 'DeepSeek Coding Assistant', icon: Wand2 },
  { id: 'zai', label: 'Orion AI', description: 'High-performance generation', icon: Code2 },
  { id: 'gemini', label: 'Gemini', description: 'Google Gemini API', icon: Brain },
  { id: 'openrouter', label: 'OpenRouter', description: 'Universal model access', icon: Sparkles },
  { id: 'custom', label: 'Custom', description: 'OpenAI-compatible endpoint', icon: TerminalSquare },
];

const DEFAULT_PROVIDER: ProviderId = PROVIDER_OPTIONS[0].id;
const PROVIDER_OPTION_MAP: Record<string, ProviderOption> = Object.fromEntries(
  PROVIDER_OPTIONS.map((option) => [option.id, option])
) as Record<string, ProviderOption>;

const INITIAL_LAYOUT_OPTIONS = [
  { id: 'mobile', label: 'Mobile', icon: Smartphone },
  { id: 'desktop', label: 'Desktop', icon: Monitor },
  { id: 'both', label: 'Both', icon: Layout },
];

// --- Utility Functions ---
const sanitizeHtmlResponse = (text: string): string => {
  const htmlBlockMatch = text.match(/```html\s*([\s\S]*?)\s*```/i);
  if (htmlBlockMatch) return htmlBlockMatch[1].trim();
  const codeBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch) return codeBlockMatch[1].trim();
  const htmlStartMatch = text.match(/(<!DOCTYPE html[\s\S]*)/i) || text.match(/(<html[\s\S]*)/i);
  if (htmlStartMatch) {
    const content = htmlStartMatch[0];
    const endTagMatch = content.match(/<\/html>/i);
    if (endTagMatch) {
      const lastIndex = content.toLowerCase().lastIndexOf('</html>');
      return content.substring(0, lastIndex + 7).trim();
    }
    return content.replace(/\n?```$/, '').trim();
  }
  return text.replace(/^```html\n?/, '').replace(/^```\n?/, '').replace(/\n?```$/, '').trim();
};

const applySurgicalEdits = (currentCode: string, edits: SurgicalEdit[]): SurgicalEditResult => {
  if (!currentCode || !edits || !Array.isArray(edits)) return { success: false, error: 'Invalid edit format' };
  const normalizeLine = (line: string) => line.trim().replace(/\s+/g, ' ');
  let newCode = currentCode;
  const appliedSearchStrings = new Set<string>();

  for (const block of edits) {
    const { search: searchStr, replace: replaceStr } = block;
    if (!searchStr) continue;

    if (newCode.includes(searchStr)) {
      newCode = newCode.split(searchStr).join(replaceStr);
      appliedSearchStrings.add(searchStr);
      continue;
    }

    if (appliedSearchStrings.has(searchStr)) continue;

    const codeLines = newCode.split(/\r?\n/);
    const searchLines = searchStr.split(/\r?\n/);
    const normalizedSearchLines = searchLines.map(normalizeLine);

    let matchIndex = -1;
    for (let i = 0; i <= codeLines.length - searchLines.length; i++) {
      let isMatch = true;
      for (let j = 0; j < searchLines.length; j++) {
        if (normalizeLine(codeLines[i + j]) !== normalizedSearchLines[j]) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) { matchIndex = i; break; }
    }

    if (matchIndex !== -1) {
      const beforeLines = codeLines.slice(0, matchIndex);
      const afterLines = codeLines.slice(matchIndex + searchLines.length);
      newCode = [...beforeLines, replaceStr, ...afterLines].join('\n');
      appliedSearchStrings.add(searchStr);
    } else {
      return { success: false, error: `Search block not found: "${searchStr.substring(0, 100)}..."`, failedBlock: searchStr };
    }
  }
  return { success: true, code: newCode };
};

const buildInitialGenerationPrompt = (prompt: string, layoutTarget: string): string => {
  const trimmedPrompt = prompt.trim();
  const safeAreaInstruction = getSafeAreaInstruction(layoutTarget);
  switch (layoutTarget) {
    case 'mobile':
      return `Create a mobile-first web app based on this request: ${trimmedPrompt}. Optimize for a polished 375px touch-screen experience with compact spacing, thumb-friendly controls, and a layout that feels native on phones.${safeAreaInstruction}`;
    case 'desktop':
      return `Create a desktop-focused web app based on this request: ${trimmedPrompt}. Optimize for larger screens with a true desktop layout, richer information density, and interactions suited for mouse and keyboard use.`;
    case 'both':
    default:
      return `Create a responsive web app based on this request: ${trimmedPrompt}. It must look polished on mobile and also present a true desktop layout on larger screens instead of staying in a phone-width column.${safeAreaInstruction}`;
  }
};

interface RequestModelTextParams {
  provider: ProviderId;
  systemPrompt: string;
  userText: string;
  onChunk?: ((chunk: string) => void) | null;
  temperature?: number;
  tools?: unknown[] | null;
  tool_choice?: unknown;
  retryCount?: number;
  signal?: AbortSignal | null;
}

const requestModelText = async (params: RequestModelTextParams): Promise<{ content?: string; tool_calls?: Array<{ id: string; function: { name: string; arguments: string } }> }> => {
  const { provider, systemPrompt, userText, onChunk, temperature = 0.7, tools, tool_choice, retryCount = 0, signal } = params;
  const delays = [1000, 2000, 4000, 8000, 16000];

  let apiKey: string | undefined, model: string, baseUrl: string;
  let customEnv: Record<string, unknown> | undefined;

  const getStorageItem = (key: string): string | null => {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  };

  if (provider === 'openrouter') {
    apiKey = getStorageItem('mittenOS_openrouter_api_key') || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY;
    model = getStorageItem('mittenOS_openrouter_model') || process.env.NEXT_PUBLIC_OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
    baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
  } else if (provider === 'gemini') {
    apiKey = getStorageItem('mittenOS_gemini_api_key') || process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    model = getStorageItem('mittenOS_gemini_model') || process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-2.5-flash';
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta/chat/completions';
  } else if (provider === 'mittenai') {
    apiKey = getStorageItem('mittenOS_coding_assistant_key') || process.env.NEXT_PUBLIC_CODING_ASSISTANT_KEY;
    model = getStorageItem('mittenOS_coding_assistant_model') || 'deepseek-v4-pro';
    baseUrl = 'https://api.deepseek.com/chat/completions';
  } else if (provider === 'custom') {
    apiKey = getStorageItem('mittenOS_custom_api_key') || process.env.NEXT_PUBLIC_CUSTOM_API_KEY;
    model = getStorageItem('mittenOS_custom_model') || process.env.NEXT_PUBLIC_CUSTOM_MODEL || 'gpt-4o';
    baseUrl = getStorageItem('mittenOS_custom_base_url') || process.env.NEXT_PUBLIC_CUSTOM_BASE_URL || 'https://api.openai.com/v1/chat/completions';
    customEnv = {
      temperature: process.env.NEXT_PUBLIC_CUSTOM_TEMPERATURE ? parseFloat(process.env.NEXT_PUBLIC_CUSTOM_TEMPERATURE) : undefined,
      top_p: process.env.NEXT_PUBLIC_CUSTOM_TOP_P ? parseFloat(process.env.NEXT_PUBLIC_CUSTOM_TOP_P) : undefined,
      max_tokens: process.env.NEXT_PUBLIC_CUSTOM_MAX_TOKENS ? parseInt(process.env.NEXT_PUBLIC_CUSTOM_MAX_TOKENS) : undefined,
      thinking_enabled: process.env.NEXT_PUBLIC_CUSTOM_THINKING_ENABLED !== 'false',
      reasoning_effort: process.env.NEXT_PUBLIC_CUSTOM_REASONING_EFFORT || undefined,
      stop: process.env.NEXT_PUBLIC_CUSTOM_STOP ? process.env.NEXT_PUBLIC_CUSTOM_STOP.split(',').map(s => s.trim()) : undefined,
    };
  } else {
    apiKey = getStorageItem('mittenOS_zai_api_key') || process.env.NEXT_PUBLIC_ZAI_API_KEY;
    model = getStorageItem('mittenOS_zai_model') || process.env.NEXT_PUBLIC_ZAI_MODEL || 'glm-4-plus';
    baseUrl = 'https://api.z.ai/api/coding/paas/v4/chat/completions';
  }

  if (!apiKey) {
    throw new Error(`API key for provider '${provider}' is not configured. Please set it in Settings.`);
  }

  try {
    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    };
    if (provider === 'gemini') {
      headers['x-goog-api-key'] = apiKey;
    }
    if (provider === 'openrouter') {
      headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : '';
      headers['X-Title'] = 'Orion';
    }

    const bodyObj: Record<string, unknown> = {
      model,
      stream: !!onChunk,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userText },
      ],
    };

    if (provider === 'custom' && customEnv) {
      if (customEnv.temperature !== undefined && !isNaN(customEnv.temperature as number)) bodyObj.temperature = customEnv.temperature;
      if (customEnv.top_p !== undefined && !isNaN(customEnv.top_p as number)) bodyObj.top_p = customEnv.top_p;
      if (customEnv.max_tokens !== undefined && !isNaN(customEnv.max_tokens as number)) bodyObj.max_tokens = customEnv.max_tokens;
      if (customEnv.stop) bodyObj.stop = customEnv.stop;
      if (customEnv.reasoning_effort) bodyObj.reasoning_effort = customEnv.reasoning_effort;
    }

    bodyObj.temperature = temperature;
    if (tools) bodyObj.tools = tools;
    if (tool_choice) bodyObj.tool_choice = tool_choice;

    const response = await fetch(baseUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyObj),
      signal,
    });

    if (!response.ok) throw new Error(`API Error: ${response.status}`);

    if (!onChunk) {
      const data = await response.json() as any;
      return data.choices[0].message;
    }

    const STREAM_READ_TIMEOUT_MS = 60000;
    let text = '';
    const toolCallsBuffer: Array<{ id: string; function: { name: string; arguments: string } }> = [];
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    const readWithTimeout = async () => {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const readPromise = reader.read();
      const timeoutPromise = new Promise<ReadableStreamReadResult<Uint8Array>>((_, reject) =>
        setTimeout(() => reject(new Error('Stream stalled: no data received for ' + (STREAM_READ_TIMEOUT_MS / 1000) + 's')), STREAM_READ_TIMEOUT_MS)
      );
      return await Promise.race([readPromise, timeoutPromise]);
    };

    while (true) {
      const { done, value } = await readWithTimeout();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.startsWith('data: ')) {
          const data = trimmedLine.slice(6);
          if (data === '[DONE]') continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices[0]?.delta;
            if (delta?.content) { text += delta.content; onChunk(delta.content); }
            if (delta?.tool_calls) {
              for (const tc of delta.tool_calls) {
                const idx: number = tc.index || 0;
                if (!toolCallsBuffer[idx]) toolCallsBuffer[idx] = { id: tc.id, function: { name: tc.function?.name, arguments: '' } };
                if (tc.function?.arguments) toolCallsBuffer[idx].function.arguments += tc.function.arguments;
              }
            }
          } catch { /* ignore */ }
        }
      }
    }
    return { content: text, tool_calls: toolCallsBuffer.filter(Boolean) };
  } catch (err) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (retryCount < delays.length && !(err instanceof DOMException && err.name === 'AbortError')) {
      await new Promise(r => setTimeout(r, delays[retryCount]));
      return requestModelText({ ...params, retryCount: retryCount + 1 });
    }
    throw new Error(err instanceof Error ? err.message : 'Failed to generate app.');
  }
};

interface GenerateResult {
  code: string;
  editMode: string;
  editSummary: string;
}

const generateAppCode = async (
  prompt: string,
  currentCode: string | null,
  provider: ProviderId,
  onChunk: ((chunk: string) => void) | null,
  layoutTarget: string,
  signal: AbortSignal | null,
): Promise<GenerateResult> => {
  if (!currentCode) {
    const userText = buildInitialGenerationPrompt(prompt, layoutTarget);
    const message = await requestModelText({ provider, systemPrompt: HTML_SYSTEM_PROMPT, userText, onChunk, temperature: 0.7, signal });
    return { code: sanitizeHtmlResponse(message.content || (message as unknown as string)), editMode: 'full-generation', editSummary: 'Initial app generation.' };
  }

  let lastError: string | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    try {
      const userMessage = lastError
        ? `Edit attempt ${attempt - 1} failed: ${lastError}\n\nCurrent Code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nCorrective action: The SEARCH block was not found in the code. Re-examine the code structure, pick a different anchor point (landmark comment or unique class/id), and include 5+ lines of surrounding context to ensure the search string appears exactly once.`
        : `Current App Code:\n\`\`\`html\n${currentCode}\n\`\`\`\n\nTask: ${prompt}. Use apply_surgical_edits to update the app.`;

      const message = await requestModelText({
        provider, systemPrompt: HTML_SYSTEM_PROMPT, userText: userMessage,
        onChunk, temperature: 0.1,
        tools: [SURGICAL_EDIT_TOOL],
        tool_choice: { type: 'function', function: { name: 'apply_surgical_edits' } },
        signal,
      });

      const toolCall = message.tool_calls?.[0];
      if (!toolCall) throw new Error("AI did not use the surgical edit tool.");

      const { edits } = JSON.parse(toolCall.function.arguments) as { edits: SurgicalEdit[] };
      const result = applySurgicalEdits(currentCode, edits);

      if (result.success) {
        return { code: result.code!, editMode: 'surgical', editSummary: prompt };
      } else {
        console.warn(`Surgical attempt ${attempt} failed:`, result.error);
        lastError = result.error!;
      }
    } catch (e) {
      console.error(`Attempt ${attempt} error:`, e);
      lastError = e instanceof Error ? e.message : String(e);
    }
  }
  throw new Error(`Failed to apply updates after 3 attempts. Last error: ${lastError}`);
};

const syntaxHighlightHtml = (code: string): string => {
  if (!code) return "";
  const escape = (str: string) =>
    str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");

  let escaped = escape(code);
  escaped = escaped.replace(/&lt;!--([\s\S]*?)--&gt;/g, '<span class="token-comment">&lt;!--$1--&gt;</span>');
  escaped = escaped.replace(/(&lt;!DOCTYPE[\s\S]*?&gt;)/gi, '<span class="token-doctype">$1</span>');
  escaped = escaped.replace(/(&lt;\/?)([\w-:]+)([\s\S]*?)(&gt;)/g, (match, prefix, tagName, attrs, suffix) => {
    const highlightedTag = `${prefix}<span class="token-tag-name">${tagName}</span>`;
    const highlightedAttrs = attrs.replace(/\s+([\w-:]+)(?:=(&quot;[\s\S]*?&quot;|&#039;[\s\S]*?&#039;|[\w:-]+))?/g, (m: string, attrName: string, attrValue: string) => {
      let res = ` <span class="token-attr-name">${attrName}</span>`;
      if (attrValue) res += `=<span class="token-string">${attrValue}</span>`;
      return res;
    });
    return highlightedTag + highlightedAttrs + suffix;
  });

  const lines = escaped.split('\n');
  return lines.map((line, i) =>
    `<div class="orion-code-line"><span class="orion-line-number">${i + 1}</span><span class="orion-line-content">${line || ' '}</span></div>`
  ).join('');
};

const DEFAULT_MARQUEE_MESSAGE = 'Initializing generation... Preparing code workspace... Analyzing requirements... Writing components...';
const MARQUEE_SEPARATOR = '  //  ';
const MARQUEE_MIN_LOOP_LENGTH = 220;
const MARQUEE_MAX_BUFFER_LENGTH = 4000;

const PREVIEW_MODES = {
  mobile: { label: 'Mobile', width: 399, height: 820 },
  desktop: { label: 'Desktop', width: 1468, height: 1022 },
};

const buildMarqueeLoop = (value: string): string => {
  const normalized = (value || DEFAULT_MARQUEE_MESSAGE).replace(/\s+/g, ' ').trim();
  let loop = normalized;
  while (loop.length < MARQUEE_MIN_LOOP_LENGTH) {
    loop += `${MARQUEE_SEPARATOR}${normalized}`;
  }
  return loop;
};

// --- Component ---
export function OrionAppBuilder() {
  const supabase = createClient();
  const user = useAuthStore(s => s.user);

  const [prompt, setPrompt] = useState('');
  const [initialLayoutTarget, setInitialLayoutTarget] = useState('both');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [previewMode, setPreviewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [apiProvider, setApiProvider] = useState<ProviderId>(() => {
    if (typeof localStorage === 'undefined') return DEFAULT_PROVIDER;
    const storedProvider = localStorage.getItem('orion-api-provider') as ProviderId | null;
    return storedProvider && PROVIDER_OPTION_MAP[storedProvider] ? storedProvider : DEFAULT_PROVIDER;
  });
  const [zaiKey, setZaiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_zai_api_key') || '' : ''));
  const [zaiModel, setZaiModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_zai_model') || '' : ''));
  const [openrouterKey, setOpenrouterKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_openrouter_api_key') || '' : ''));
  const [openrouterModel, setOpenrouterModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_openrouter_model') || '' : ''));
  const [geminiKey, setGeminiKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_gemini_api_key') || '' : ''));
  const [geminiModel, setGeminiModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_gemini_model') || '' : ''));
  const [codingKey, setCodingKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_coding_assistant_key') || '' : ''));
  const [codingModel, setCodingModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_coding_assistant_model') || '' : ''));
  const [customKey, setCustomKey] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_api_key') || '' : ''));
  const [customBaseUrl, setCustomBaseUrl] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_base_url') || '' : ''));
  const [customModel, setCustomModel] = useState(() => (typeof window !== 'undefined' ? localStorage.getItem('mittenOS_custom_model') || '' : ''));
  const [streamingCode, setStreamingCode] = useState('');
  const [streamingGeneratedCode, setStreamingGeneratedCode] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  useEffect(() => {
    if (isSettingsOpen && typeof window !== 'undefined') {
      setZaiKey(localStorage.getItem('mittenOS_zai_api_key') || '');
      setZaiModel(localStorage.getItem('mittenOS_zai_model') || '');
      setOpenrouterKey(localStorage.getItem('mittenOS_openrouter_api_key') || '');
      setOpenrouterModel(localStorage.getItem('mittenOS_openrouter_model') || '');
      setGeminiKey(localStorage.getItem('mittenOS_gemini_api_key') || '');
      setGeminiModel(localStorage.getItem('mittenOS_gemini_model') || '');
      setCodingKey(localStorage.getItem('mittenOS_coding_assistant_key') || '');
      setCodingModel(localStorage.getItem('mittenOS_coding_assistant_model') || '');
      setCustomKey(localStorage.getItem('mittenOS_custom_api_key') || '');
      setCustomBaseUrl(localStorage.getItem('mittenOS_custom_base_url') || '');
      setCustomModel(localStorage.getItem('mittenOS_custom_model') || '');
    }
  }, [isSettingsOpen]);
  const [isNamingModalOpen, setIsNamingModalOpen] = useState(false);
  const [tempProjectName, setTempProjectName] = useState('');
  const [shouldGenerateAfterNaming, setShouldGenerateAfterNaming] = useState(false);
  const [projectName, setProjectName] = useState('Untitled App');
  const [myProjects, setMyProjects] = useState<Project[]>([]);
  const [isProjectsListOpen, setIsProjectsListOpen] = useState(false);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editingProjectName, setEditingProjectName] = useState('');
  const [renamingProjectId, setRenamingProjectId] = useState<string | null>(null);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [isNewChatConfirmOpen, setIsNewChatConfirmOpen] = useState(false);
  const marqueeSegment = buildMarqueeLoop(streamingCode);
  const [copied, setCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [expandedVersionIndex, setExpandedVersionIndex] = useState<number | null>(null);
  const [isAutoZoom, setIsAutoZoom] = useState(true);
  const [isHistoryOpen, setIsHistoryOpen] = useState(() => {
    if (typeof localStorage === 'undefined') return true;
    const stored = localStorage.getItem('orion-history-open');
    return stored !== null ? stored === 'true' : true;
  });

  const previewContainerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const handleGenerateRef = useRef<((e?: React.FormEvent) => Promise<void>) | null>(null);
  const streamingBufferRef = useRef('');
  const streamingGeneratedCodeRef = useRef('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const appWindow = useWindowStore(s => s.windows.find(w => w.appId === 'app-builder'));
  const appWindowSize = appWindow?.size;
  const updateWindowSize = useWindowStore(s => s.updateWindowSize);
  const isMaximized = appWindow?.state === 'maximized';

  const codePanelCode = isGenerating ? (streamingGeneratedCode || generatedCode) : generatedCode;
  const activePreviewPreset = PREVIEW_MODES[previewMode];
  const scaledPreviewWidth = activePreviewPreset.width * zoomLevel;
  const scaledPreviewHeight = activePreviewPreset.height * zoomLevel;

  useEffect(() => {
    localStorage.setItem('orion-history-open', String(isHistoryOpen));
  }, [isHistoryOpen]);

  useEffect(() => {
    if (!appWindow?.id || isMaximized || !generatedCode) return;

    const historyWidth = isHistoryOpen ? 256 : 0;
    const promptSidebarWidth = 340;
    const horizontalPadding = 48;

    const previewWidth = previewMode === 'desktop'
      ? PREVIEW_MODES.desktop.width
      : Math.max(PREVIEW_MODES.mobile.width, 540);

    const targetWidth = historyWidth + promptSidebarWidth + previewWidth + horizontalPadding;
    const clampedWidth = Math.min(targetWidth, (typeof window !== 'undefined' ? window.innerWidth : 1920) - 32);

    updateWindowSize(appWindow.id, {
      width: clampedWidth,
      height: appWindow.size?.height ?? 700,
    });
  }, [previewMode, isHistoryOpen, appWindow?.id, isMaximized, generatedCode, updateWindowSize]);

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  const clearStreamingState = () => {
    setStreamingCode('');
    setStreamingGeneratedCode('');
    streamingBufferRef.current = '';
    streamingGeneratedCodeRef.current = '';
  };

  // --- Dynamic Zoom Logic ---
  useEffect(() => {
    const calculateZoom = () => {
      if (!isAutoZoom || !previewContainerRef.current || activeTab !== 'preview') return;
      const container = previewContainerRef.current;
      const viewportHeight = (typeof window !== 'undefined' ? (window.visualViewport?.height ?? window.innerHeight) : 0);
      const viewportWidth = (typeof window !== 'undefined' ? (window.visualViewport?.width ?? window.innerWidth) : 0);
      const containerRect = container.getBoundingClientRect();
      const verticalPadding = previewMode === 'mobile' ? 16 : 32;
      const horizontalPadding = 32;
      const visibleHeight = Math.min(container.clientHeight, Math.max(0, viewportHeight - containerRect.top - 24));
      const visibleWidth = Math.min(container.clientWidth, Math.max(0, viewportWidth - containerRect.left - 24));
      const availableHeight = Math.max(0, visibleHeight - verticalPadding);
      const availableWidth = Math.max(0, visibleWidth - horizontalPadding);
      const preset = PREVIEW_MODES[previewMode];
      const scaleH = availableHeight / preset.height;
      const scaleW = availableWidth / preset.width;
      const newZoom = Math.min(scaleH, scaleW);
      const clampedZoom = Math.max(0.2, Math.min(newZoom, 2));
      setZoomLevel(clampedZoom);
    };
    calculateZoom();
    window.addEventListener('resize', calculateZoom);
    let resizeObserver: ResizeObserver | null = null;
    if (previewContainerRef.current) {
      resizeObserver = new ResizeObserver(() => calculateZoom());
      resizeObserver.observe(previewContainerRef.current);
    }
    return () => {
      window.removeEventListener('resize', calculateZoom);
      if (resizeObserver) resizeObserver.disconnect();
    };
  }, [isAutoZoom, activeTab, previewMode]);

  // --- Mobile Touch Scroll Simulation ---
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || previewMode !== 'mobile' || !generatedCode) return;

    let cleanupFn: (() => void) | null = null;

    const setupTouchSimulation = () => {
      const doc = iframe.contentDocument;
      const win = iframe.contentWindow;
      if (!doc || !win) return;

      let isDragging = false;
      let hasMoved = false;
      let startX = 0, startY = 0, lastX = 0, lastY = 0;
      let velocityX = 0, velocityY = 0;
      let momentumId: number | null = null;
      let suppressClick = false;

      const scrollbarStyle = doc.createElement('style');
      scrollbarStyle.textContent = '* { scrollbar-width: none !important; -ms-overflow-style: none !important; } *::-webkit-scrollbar { display: none !important; }';
      doc.head.appendChild(scrollbarStyle);

      const findMainScrollElement = (): Element => {
        const candidates: (Element | null)[] = [doc.scrollingElement, doc.documentElement, doc.body];
        for (const el of candidates) {
          if (el && el.scrollHeight > el.clientHeight + 1) return el;
        }
        if (doc.body) {
          for (const child of Array.from(doc.body.children)) {
            const style = win.getComputedStyle(child);
            const overflow = (style.overflowY || '') + (style.overflow || '');
            if (/(auto|scroll)/.test(overflow) && child.scrollHeight > child.clientHeight + 1) return child;
          }
        }
        return (doc.scrollingElement || doc.documentElement || doc.body) as Element;
      };

      const mainScrollEl = findMainScrollElement();

      const isFormControl = (el: EventTarget | null): boolean => {
        if (!el || !(el instanceof HTMLElement)) return false;
        const tag = el.tagName.toLowerCase();
        if (['input', 'textarea', 'select'].includes(tag)) return true;
        return (el as HTMLElement).isContentEditable;
      };

      const touchStyle = doc.createElement('style');
      touchStyle.textContent = 'html, body { touch-action: none !important; overscroll-behavior: none !important; }';
      doc.head.appendChild(touchStyle);

      let pointerCaptureTarget: Element | null = null;

      const onPointerDown = (e: PointerEvent) => {
        if ((e as MouseEvent).button !== 0 && e.pointerType === 'mouse') return;
        if (isFormControl(e.target)) return;
        isDragging = true; hasMoved = false; suppressClick = false;
        startX = e.clientX; startY = e.clientY;
        lastX = e.clientX; lastY = e.clientY;
        velocityX = 0; velocityY = 0;
        try { (e.target as Element).setPointerCapture(e.pointerId); pointerCaptureTarget = e.target as Element; } catch { /* */ }
        doc.body.style.userSelect = 'none'; doc.body.style.webkitUserSelect = 'none'; (doc.body.style as any).MozUserSelect = 'none';
        if (momentumId) { cancelAnimationFrame(momentumId); momentumId = null; }
        e.preventDefault();
      };

      const onPointerMove = (e: PointerEvent) => {
        if (!isDragging) return;
        const dx = e.clientX - startX; const dy = e.clientY - startY;
        if (!hasMoved && (Math.abs(dx) > 2 || Math.abs(dy) > 2)) {
          hasMoved = true; suppressClick = true;
          if (e.pointerType === 'mouse') doc.documentElement.style.cursor = 'grabbing';
        }
        if (!hasMoved) return;
        const moveX = e.clientX - lastX; const moveY = e.clientY - lastY;
        velocityX = velocityX * 0.6 + moveX * 0.4; velocityY = velocityY * 0.6 + moveY * 0.4;
        mainScrollEl.scrollTop -= moveY; mainScrollEl.scrollLeft -= moveX;
        lastX = e.clientX; lastY = e.clientY;
        e.preventDefault();
      };

      const onPointerUp = (e: PointerEvent) => {
        if (!isDragging) return;
        isDragging = false;
        try { if (pointerCaptureTarget) { pointerCaptureTarget.releasePointerCapture(e.pointerId); pointerCaptureTarget = null; } } catch { /* */ }
        doc.documentElement.style.cursor = '';
        doc.body.style.userSelect = ''; doc.body.style.webkitUserSelect = ''; (doc.body.style as any).MozUserSelect = '';
        if (!hasMoved) return;
        e.preventDefault(); e.stopPropagation();
        const applyMomentum = () => {
          if (Math.abs(velocityX) < 0.3 && Math.abs(velocityY) < 0.3) { momentumId = null; return; }
          velocityX *= 0.975; velocityY *= 0.975;
          mainScrollEl.scrollTop -= velocityY; mainScrollEl.scrollLeft -= velocityX;
          momentumId = requestAnimationFrame(applyMomentum);
        };
        momentumId = requestAnimationFrame(applyMomentum);
      };

      const onClick = (e: Event) => {
        if (suppressClick) { e.preventDefault(); e.stopPropagation(); suppressClick = false; }
      };

      const opts = { capture: true, passive: false } as AddEventListenerOptions;
      doc.addEventListener('pointerdown', onPointerDown, opts);
      doc.addEventListener('pointermove', onPointerMove, opts);
      doc.addEventListener('pointerup', onPointerUp, opts);
      doc.addEventListener('pointercancel', onPointerUp, opts);
      doc.addEventListener('click', onClick, true);
      doc.documentElement.style.cursor = 'grab';

      cleanupFn = () => {
        doc.removeEventListener('pointerdown', onPointerDown, opts);
        doc.removeEventListener('pointermove', onPointerMove, opts);
        doc.removeEventListener('pointerup', onPointerUp, opts);
        doc.removeEventListener('pointercancel', onPointerUp, opts);
        doc.removeEventListener('click', onClick, true);
        if (momentumId) cancelAnimationFrame(momentumId);
        if (scrollbarStyle.parentNode) scrollbarStyle.parentNode.removeChild(scrollbarStyle);
        if (touchStyle.parentNode) touchStyle.parentNode.removeChild(touchStyle);
        try {
          doc.documentElement.style.cursor = '';
          doc.body.style.userSelect = ''; doc.body.style.webkitUserSelect = ''; (doc.body.style as any).MozUserSelect = '';
        } catch { /* */ }
      };
    };

    const onLoad = () => {
      if (cleanupFn) cleanupFn();
      cleanupFn = null;
      setupTouchSimulation();
    };

    iframe.addEventListener('load', onLoad);
    try {
      if (iframe.contentDocument && iframe.contentDocument.readyState === 'complete') {
        setupTouchSimulation();
      }
    } catch { /* */ }

    return () => {
      iframe.removeEventListener('load', onLoad);
      if (cleanupFn) cleanupFn();
    };
  }, [generatedCode, previewMode]);

  const handleManualZoom = (multiplier: number) => {
    setIsAutoZoom(false);
    setZoomLevel(prev => Math.max(0.2, Math.min(prev + multiplier, 3)));
  };

  const resetZoom = () => { setIsAutoZoom(true); };

  // --- Data Persistence Helpers ---
  const loadUserProjects = useCallback(async (): Promise<Project[]> => {
    try {
      if (!user) return [];
      const { data, error: sbError } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (sbError) throw sbError;

      const projects: Project[] = (data || []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        name: (row.name as string) || 'Untitled App',
        versions: ((row.data as Record<string, unknown>)?.versions as Version[]) || [],
        currentVersionIndex: ((row.data as Record<string, unknown>)?.currentVersionIndex as number) ?? -1,
        lastModified: row.updated_at ? new Date(row.updated_at as string) : undefined,
      }));

      setMyProjects(projects);
      return projects;
    } catch (err) {
      console.error("Error loading projects:", err);
      return [];
    }
  }, [user, supabase]);

  const loadProjectById = useCallback(async (projectId: string) => {
    try {
      const { data, error: sbError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (sbError || !data) {
        localStorage.removeItem('orion-current-project-id');
        return;
      }

      clearStreamingState();
      const row = data as Record<string, unknown>;
      setProjectName((row.name as string) || 'Untitled App');
      const projectData = (row.data as Record<string, unknown>) || {};
      const vs = (projectData.versions as Version[]) || [];
      const idx = (projectData.currentVersionIndex as number) ?? -1;
      setVersions(vs);
      setCurrentVersionIndex(idx);
      if (vs && vs[idx]) {
        setGeneratedCode(vs[idx].code);
      }
      setCurrentProjectId(projectId);
      localStorage.setItem('orion-current-project-id', projectId);
    } catch (err) {
      console.error("Error loading project by ID:", err);
    }
  }, [supabase, clearStreamingState]);

  const saveProject = useCallback(async (params: {
    versionsToSave?: Version[];
    indexToSave?: number;
    nameToSave?: string;
    idToSave?: string | null;
  } = {}) => {
    const {
      versionsToSave = versions,
      indexToSave = currentVersionIndex,
      nameToSave = projectName,
      idToSave = currentProjectId,
    } = params;

    if (!versionsToSave.length && !(params as Record<string, unknown>).force) return;
    if (!user) return;

    const projectId = idToSave || currentProjectId || Date.now().toString();

    try {
      const projectData = { versions: versionsToSave, currentVersionIndex: indexToSave };
      await supabase.from('projects').upsert({
        id: projectId,
        user_id: user.id,
        name: nameToSave,
        data: projectData,
        updated_at: new Date().toISOString(),
      });

      if (!currentProjectId || currentProjectId !== projectId) {
        setCurrentProjectId(projectId);
        localStorage.setItem('orion-current-project-id', projectId);
      }
      loadUserProjects();
    } catch (err) {
      console.error("Error saving project:", err);
    }
  }, [versions, currentVersionIndex, projectName, currentProjectId, user, supabase, loadUserProjects]);

  // Auto-save name changes
  useEffect(() => {
    if (!currentProjectId) return;
    const timeoutId = setTimeout(() => {
      const currentProjData = myProjects.find(p => p.id === currentProjectId);
      if (currentProjData && currentProjData.name === projectName) return;
      saveProject({ nameToSave: projectName });
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [projectName, currentProjectId, myProjects, saveProject]);

  // Initial data load
  useEffect(() => {
    const fetchAndResume = async () => {
      const projects = await loadUserProjects();
      const lastProjectId = localStorage.getItem('orion-current-project-id');
      if (!currentProjectId) {
        const idToLoad = lastProjectId || (projects.length > 0 ? projects[0].id : null);
        if (idToLoad) {
          await loadProjectById(idToLoad);
        }
      }
    };
    fetchAndResume();
  }, [loadUserProjects, loadProjectById, currentProjectId]);

  const loadProject = (project: Project) => {
    clearStreamingState();
    setCurrentProjectId(project.id);
    setProjectName(project.name);
    setVersions(project.versions);
    setCurrentVersionIndex(project.currentVersionIndex);
    if (project.versions && project.versions[project.currentVersionIndex]) {
      setGeneratedCode(project.versions[project.currentVersionIndex].code);
    }
    setIsProjectsListOpen(false);
    localStorage.setItem('orion-current-project-id', project.id);
  };

  const suggestedPrompts = [
    "A sleek Pomodoro timer with start, pause, and reset buttons.",
    "A minimal weather app UI showing current temp and a 3-day forecast.",
    "A tip calculator with sliders for bill amount and tip percentage.",
    "A daily habit tracker with checkboxes for 5 custom habits."
  ];

  const handleSaveSettings = () => {
    localStorage.setItem('orion-api-provider', apiProvider);
    localStorage.setItem('mittenOS_zai_api_key', zaiKey.trim());
    localStorage.setItem('mittenOS_zai_model', zaiModel.trim());
    localStorage.setItem('mittenOS_openrouter_api_key', openrouterKey.trim());
    localStorage.setItem('mittenOS_openrouter_model', openrouterModel.trim());
    localStorage.setItem('mittenOS_gemini_api_key', geminiKey.trim());
    localStorage.setItem('mittenOS_gemini_model', geminiModel.trim());
    localStorage.setItem('mittenOS_coding_assistant_key', codingKey.trim());
    localStorage.setItem('mittenOS_coding_assistant_model', codingModel.trim());
    localStorage.setItem('mittenOS_custom_api_key', customKey.trim());
    localStorage.setItem('mittenOS_custom_base_url', customBaseUrl.trim());
    localStorage.setItem('mittenOS_custom_model', customModel.trim());
    setIsSettingsOpen(false);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!prompt.trim()) return;

    if ((projectName === 'Untitled App' || !projectName.trim()) && !currentProjectId) {
      setTempProjectName('');
      setShouldGenerateAfterNaming(true);
      setIsNamingModalOpen(true);
      return;
    }

    setIsGenerating(true);
    clearStreamingState();
    setError(null);
    abortControllerRef.current = new AbortController();

    const currentPrompt = prompt;
    setPrompt('');

    try {
      const generationResult = await generateAppCode(currentPrompt, generatedCode, apiProvider, (chunk) => {
        streamingBufferRef.current = `${streamingBufferRef.current}${chunk.replace(/\s+/g, ' ')}`.slice(-MARQUEE_MAX_BUFFER_LENGTH);
        setStreamingCode(streamingBufferRef.current.trim());
        streamingGeneratedCodeRef.current = `${streamingGeneratedCodeRef.current}${chunk}`;
        setStreamingGeneratedCode(sanitizeHtmlResponse(streamingGeneratedCodeRef.current));
      }, initialLayoutTarget, abortControllerRef.current.signal);

      setGeneratedCode(generationResult.code);

      const newVersion: Version = {
        id: Date.now(),
        prompt: currentPrompt,
        code: generationResult.code,
        timestamp: new Date().toLocaleTimeString(),
        editMode: generationResult.editMode,
        editSummary: generationResult.editSummary,
      };

      const updatedVersions = versions.slice(0, currentVersionIndex + 1);
      const finalVersions = [...updatedVersions, newVersion];
      setVersions(finalVersions);
      setCurrentVersionIndex(updatedVersions.length);

      saveProject({ versionsToSave: finalVersions, indexToSave: updatedVersions.length });
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError(err instanceof Error ? err.message : String(err));
      setPrompt(currentPrompt);
    } finally {
      setIsGenerating(false);
      clearStreamingState();
    }
  };

  useEffect(() => {
    handleGenerateRef.current = handleGenerate;
  });

  const handleDownload = () => {
    if (!generatedCode) return;
    const blob = new Blob([generatedCode], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miniapp-${Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const resetCurrentWorkspace = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
    clearStreamingState();
    setGeneratedCode('');
    setPrompt('');
    setInitialLayoutTarget('both');
    setError(null);
    setVersions([]);
    setCurrentVersionIndex(-1);
    setCurrentProjectId(null);
    setTempProjectName('');
    setShouldGenerateAfterNaming(false);
    setIsNamingModalOpen(false);
    setProjectName('Untitled App');
    localStorage.removeItem('orion-current-project-id');
  };

  const handleNewApp = () => {
    if (generatedCode || versions.length > 0 || isGenerating) {
      setIsNewChatConfirmOpen(true);
    } else {
      resetCurrentWorkspace();
    }
  };

  const handleConfirmNewChat = () => {
    resetCurrentWorkspace();
    setIsNewChatConfirmOpen(false);
  };

  const handleConfirmNaming = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmedName = tempProjectName.trim();
    if (!trimmedName) return;

    if (!shouldGenerateAfterNaming || (!currentProjectId && projectName === 'Untitled App')) {
      setGeneratedCode('');
      setPrompt(shouldGenerateAfterNaming ? prompt : '');
      setInitialLayoutTarget('both');
      setError(null);
      setVersions([]);
      setCurrentVersionIndex(-1);
    }

    setProjectName(trimmedName);
    setTempProjectName('');
    setCurrentProjectId(null);
    localStorage.removeItem('orion-current-project-id');
    setIsNamingModalOpen(false);
  };

  useEffect(() => {
    if (!shouldGenerateAfterNaming || isNamingModalOpen) return;
    if ((projectName === 'Untitled App' || !projectName.trim()) || !prompt.trim()) {
      setShouldGenerateAfterNaming(false);
      return;
    }
    setShouldGenerateAfterNaming(false);
    handleGenerateRef.current?.();
  }, [shouldGenerateAfterNaming, isNamingModalOpen, projectName, prompt]);

  const switchVersion = (index: number) => {
    if (index >= 0 && index < versions.length) {
      clearStreamingState();
      setCurrentVersionIndex(index);
      setGeneratedCode(versions[index].code);
      if (currentProjectId) {
        saveProject({ indexToSave: index });
      }
    }
  };

  const handleUndo = () => { if (currentVersionIndex > 0) switchVersion(currentVersionIndex - 1); };
  const handleRedo = () => { if (currentVersionIndex < versions.length - 1) switchVersion(currentVersionIndex + 1); };

  const handleCopyCode = async () => {
    if (!codePanelCode) return;
    try {
      await navigator.clipboard.writeText(codePanelCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy code:', err); }
  };

  const copyVersionCode = async (ver: Version) => {
    if (!ver?.code) return;
    try {
      await navigator.clipboard.writeText(ver.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error('Failed to copy version code:', err); }
  };

  const downloadVersion = (ver: Version) => {
    if (!ver?.code) return;
    const blob = new Blob([ver.code], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `miniapp-v${ver.id || Date.now()}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleExpandVersion = (idx: number) => {
    setExpandedVersionIndex(prev => prev === idx ? null : idx);
  };

  const startProjectRename = (project: Project) => {
    setEditingProjectId(project.id);
    setEditingProjectName(project.name || 'Untitled App');
    setProjectToDelete(null);
  };

  const cancelProjectRename = () => {
    setEditingProjectId(null);
    setEditingProjectName('');
    setRenamingProjectId(null);
  };

  const handleProjectRename = async (project: Project) => {
    const trimmedName = editingProjectName.trim();
    if (!trimmedName) return;
    if (trimmedName === (project.name || 'Untitled App')) { cancelProjectRename(); return; }

    setRenamingProjectId(project.id);
    try {
      await supabase.from('projects').update({ name: trimmedName, updated_at: new Date().toISOString() }).eq('id', project.id);
      setMyProjects(prev => prev.map(p => p.id === project.id ? { ...p, name: trimmedName } : p));
      if (currentProjectId === project.id) setProjectName(trimmedName);
      cancelProjectRename();
      loadUserProjects();
    } catch (err) {
      console.error('Error renaming project:', err);
      setRenamingProjectId(null);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    const projectId = projectToDelete.id;
    setDeletingProjectId(projectId);
    try {
      await supabase.from('projects').delete().eq('id', projectId);
      setMyProjects(prev => prev.filter(project => project.id !== projectId));
      if (editingProjectId === projectId) cancelProjectRename();
      if (currentProjectId === projectId) resetCurrentWorkspace();
      setProjectToDelete(null);
      setDeletingProjectId(null);
      loadUserProjects();
    } catch (err) {
      console.error('Error deleting project:', err);
      setDeletingProjectId(null);
    }
  };

  // --- Render ---
  return (
    <div className="h-full overflow-hidden bg-slate-50 flex flex-col" style={{ fontFamily: "'Inter', system-ui, -apple-system, sans-serif" }}>
      {/* Streaming Marquee */}
      {isGenerating && (
        <div className="orion-marquee-container shrink-0" aria-live="polite">
          <div className="orion-marquee-track">
            <span className="orion-marquee-segment">{marqueeSegment}</span>
            <span className="orion-marquee-segment" aria-hidden="true">{marqueeSegment}</span>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden orion-animate-scale-in">
            <div className="px-8 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-900">Settings</h2>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">AI Provider</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {PROVIDER_OPTIONS.map((providerOption) => {
                    const Icon = providerOption.icon;
                    return (
                      <button
                        key={providerOption.id}
                        onClick={() => setApiProvider(providerOption.id)}
                        className={`flex flex-col items-start p-4 rounded-2xl border-2 transition-all ${
                          apiProvider === providerOption.id
                            ? 'border-indigo-600 bg-indigo-50/50 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 bg-white'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-xl mb-3 flex items-center justify-center ${
                          apiProvider === providerOption.id ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon size={18} />
                        </div>
                        <span className={`text-sm font-semibold ${apiProvider === providerOption.id ? 'text-indigo-900' : 'text-slate-700'}`}>
                          {providerOption.label}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium">{providerOption.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* API Key Configuration depending on selected provider */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                {apiProvider === 'mittenai' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">DeepSeek API Key</label>
                      <input
                        type="password"
                        value={codingKey}
                        onChange={(e) => setCodingKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Model Name (Optional)</label>
                      <input
                        type="text"
                        value={codingModel}
                        onChange={(e) => setCodingModel(e.target.value)}
                        placeholder="deepseek-v4-pro"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">These settings are saved locally in your browser's localStorage.</p>
                  </div>
                )}

                {apiProvider === 'zai' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Z.ai API Key</label>
                      <input
                        type="password"
                        value={zaiKey}
                        onChange={(e) => setZaiKey(e.target.value)}
                        placeholder="Enter Z.ai API Key"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Z.ai Model Name (Optional)</label>
                      <input
                        type="text"
                        value={zaiModel}
                        onChange={(e) => setZaiModel(e.target.value)}
                        placeholder="glm-4-plus"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">These settings are saved locally in your browser's localStorage.</p>
                  </div>
                )}

                {apiProvider === 'openrouter' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OpenRouter API Key</label>
                      <input
                        type="password"
                        value={openrouterKey}
                        onChange={(e) => setOpenrouterKey(e.target.value)}
                        placeholder="sk-or-..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">OpenRouter Model Name (Optional)</label>
                      <input
                        type="text"
                        value={openrouterModel}
                        onChange={(e) => setOpenrouterModel(e.target.value)}
                        placeholder="anthropic/claude-3.5-sonnet"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">These settings are saved locally in your browser's localStorage.</p>
                  </div>
                )}

                {apiProvider === 'gemini' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gemini API Key</label>
                      <input
                        type="password"
                        value={geminiKey}
                        onChange={(e) => setGeminiKey(e.target.value)}
                        placeholder="Enter Gemini API Key"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gemini Model Name (Optional)</label>
                      <input
                        type="text"
                        value={geminiModel}
                        onChange={(e) => setGeminiModel(e.target.value)}
                        placeholder="gemini-2.5-flash"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">These settings are saved locally in your browser's localStorage.</p>
                  </div>
                )}

                {apiProvider === 'custom' && (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom API Key</label>
                      <input
                        type="password"
                        value={customKey}
                        onChange={(e) => setCustomKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Base URL</label>
                        <input
                          type="text"
                          value={customBaseUrl}
                          onChange={(e) => setCustomBaseUrl(e.target.value)}
                          placeholder="https://api.openai.com/v1"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Custom Model Name</label>
                        <input
                          type="text"
                          value={customModel}
                          onChange={(e) => setCustomModel(e.target.value)}
                          placeholder="gpt-4o"
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 px-8 py-5 flex justify-end gap-3">
              <button onClick={() => setIsSettingsOpen(false)} className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSaveSettings} className="rounded-lg px-5 py-2 bg-indigo-600 text-white font-semibold hover:bg-indigo-700 shadow-sm transition-colors active:scale-[0.98]">
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Projects List Modal */}
      {isProjectsListOpen && (
        <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] orion-animate-scale-in">
            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <FolderOpen size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Your Apps</h2>
                  <p className="text-slate-400 text-sm">Pick up where you left off</p>
                </div>
              </div>
              <button onClick={() => setIsProjectsListOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6 orion-custom-scrollbar">
              {myProjects.length === 0 ? (
                <div className="text-center py-16">
                  <div className="bg-slate-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FolderOpen size={28} className="text-slate-300" />
                  </div>
                  <h3 className="text-slate-900 font-semibold text-base">No apps yet</h3>
                  <p className="text-slate-500 mt-1 text-sm max-w-xs mx-auto">Create your first app to see it here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {myProjects.map((project) => (
                    <div key={project.id} className="text-left p-5 pr-16 rounded-xl border border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all group relative overflow-hidden bg-white hover:-translate-y-0.5 active:scale-[0.99] min-h-[100px]">
                      <div className="flex items-start">
                        <div className="flex-1 pr-6">
                          {editingProjectId === project.id ? (
                            <div className="space-y-3">
                              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Rename App</label>
                              <input
                                autoFocus
                                type="text"
                                value={editingProjectName}
                                onChange={(e) => setEditingProjectName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') { e.preventDefault(); handleProjectRename(project); }
                                  if (e.key === 'Escape') { e.preventDefault(); cancelProjectRename(); }
                                }}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                placeholder="App name"
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleProjectRename(project)}
                                  disabled={!editingProjectName.trim() || renamingProjectId === project.id}
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                                    !editingProjectName.trim() || renamingProjectId === project.id
                                      ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                  }`}
                                >
                                  <Check size={14} /> Save
                                </button>
                                <button type="button" onClick={cancelProjectRename} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 bg-slate-100">
                                  <X size={14} /> Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => loadProject(project)} className="w-full text-left">
                              <h4 className="font-semibold text-slate-900 mb-1.5 text-base truncate group-hover:text-indigo-600 transition-colors">{project.name}</h4>
                              <p className="text-xs text-slate-400 font-medium mb-3 flex items-center">
                                <Clock size={12} className="mr-1.5 text-slate-300" />
                                {project.lastModified ? project.lastModified.toLocaleString() : 'Just now'}
                              </p>
                              <div className="flex items-center mt-2">
                                <div className="flex -space-x-1.5 overflow-hidden mr-3">
                                  {[...Array(Math.min(3, project.versions?.length || 0))].map((_, i) => (
                                    <div key={i} className="inline-block h-6 w-6 rounded-lg ring-2 ring-white bg-indigo-100 border border-indigo-200 flex items-center justify-center">
                                      <span className="text-[10px] font-bold text-indigo-600">v{i + 1}</span>
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                                  {project.versions?.length || 1} version{(project.versions?.length || 1) !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </button>
                          )}
                        </div>
                        <div className="flex-shrink-0 ml-4 flex items-start gap-2 flex-wrap">
                          {editingProjectId !== project.id && (
                            <>
                              <button type="button" onClick={() => startProjectRename(project)} aria-label="Rename app" title="Rename app" className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-all hover:border-indigo-200 hover:text-indigo-600">
                                <Edit2 size={16} />
                              </button>
                              <button type="button" onClick={() => setProjectToDelete(project)} aria-label="Delete app" title="Delete app" className="h-9 w-9 flex items-center justify-center rounded-lg border border-red-100 bg-red-50 text-red-500 shadow-sm transition-all hover:border-red-200 hover:bg-red-100 hover:text-red-600">
                                <Trash2 size={16} />
                              </button>
                            </>
                          )}
                          {editingProjectId !== project.id && <ChevronRight className="text-indigo-600" size={24} />}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-50 border-t border-slate-100 p-5 flex justify-center">
              <button onClick={() => setIsProjectsListOpen(false)} className="text-slate-400 hover:text-slate-600 font-medium text-sm transition-colors">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {projectToDelete && (
        <div className="absolute inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden orion-animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Delete App</h2>
                <p className="text-sm text-slate-400 mt-0.5">This cannot be undone.</p>
              </div>
              <button type="button" onClick={() => setProjectToDelete(null)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-slate-600 leading-relaxed">
                Delete <span className="font-bold text-slate-900">{projectToDelete.name || 'Untitled App'}</span> from your saved applications?
              </div>
              {currentProjectId === projectToDelete.id && (
                <p className="text-xs font-medium text-slate-500">This app is currently open. Deleting it will clear the current workspace.</p>
              )}
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
              <button type="button" onClick={() => setProjectToDelete(null)} className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={deletingProjectId === projectToDelete.id}
                className={`inline-flex items-center gap-1.5 rounded-lg px-5 py-2 font-semibold transition-all ${
                  deletingProjectId === projectToDelete.id ? 'bg-red-200 text-white cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'
                }`}
              >
                <Trash2 size={14} />
                {deletingProjectId === projectToDelete.id ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New App Confirmation */}
      {isNewChatConfirmOpen && (
        <div className="absolute inset-0 z-[70] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden orion-animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-slate-900">Start a new app?</h2>
                <p className="text-sm text-slate-400 mt-0.5">This will clear your current workspace.</p>
              </div>
              <button type="button" onClick={() => setIsNewChatConfirmOpen(false)} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-slate-600 leading-relaxed flex items-start gap-3">
                <TriangleAlert size={18} className="text-amber-500 shrink-0 mt-0.5" />
                <span>You have unsaved changes. Starting a new app will discard your current work including any generated code and version history.</span>
              </div>
            </div>
            <div className="bg-slate-50 px-6 py-4 flex justify-end gap-3">
              <button type="button" onClick={() => setIsNewChatConfirmOpen(false)} className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors">
                Cancel
              </button>
              <button type="button" onClick={handleConfirmNewChat} className="inline-flex items-center gap-1.5 rounded-lg px-5 py-2 font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
                Start New
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Naming Modal */}
      {isNamingModalOpen && (
        <div className="absolute inset-0 z-[65] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden orion-animate-scale-in">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Name Your App</h2>
              <button onClick={() => { setShouldGenerateAfterNaming(false); setTempProjectName(''); setIsNamingModalOpen(false); }} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition-colors">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleConfirmNaming} className="p-6 space-y-5">
              <div className="space-y-3">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">App Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <Edit2 size={16} />
                  </div>
                  <input
                    autoFocus
                    type="text"
                    value={tempProjectName}
                    onChange={(e) => setTempProjectName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-10 pr-4 py-3 text-sm font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    placeholder="e.g. Recipe Assistant, Task Manager..."
                  />
                </div>
                <p className="text-xs text-slate-400">Helps you find this app later.</p>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setShouldGenerateAfterNaming(false); setTempProjectName(''); setIsNamingModalOpen(false); }} className="rounded-lg px-4 py-2 font-medium text-slate-600 hover:text-slate-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={!tempProjectName.trim()} className={`rounded-lg px-5 py-2 font-semibold transition-colors active:scale-[0.98] ${
                  !tempProjectName.trim() ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                }`}>
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center">
        <div className="flex items-center gap-1.5 shrink-0">
          <Layout size={20} className="text-indigo-600" />
          <span className="text-lg font-extrabold text-indigo-600 tracking-tight">Orion</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <h1 className="text-sm font-medium text-slate-500 tracking-tight">{projectName}</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={handleNewApp} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50/60 transition-colors text-xs" title="Start a new app">
            <Plus size={14} /> New
          </button>
          <button onClick={() => setIsProjectsListOpen(true)} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50/60 transition-colors text-xs">
            <FolderOpen size={14} /> Apps
          </button>
          <button onClick={() => setIsHistoryOpen(!isHistoryOpen)} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50/60 transition-colors text-xs" title={isHistoryOpen ? "Hide history panel" : "Show history panel"}>
            {isHistoryOpen ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            History
          </button>
          <button onClick={() => setIsSettingsOpen(true)} className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 font-medium px-2 py-1.5 rounded-lg hover:bg-indigo-50/60 transition-colors text-xs" title="Settings">
            <Settings size={14} /> Settings
          </button>

          <div className="flex items-center gap-1 ml-1 pl-1 border-l border-slate-200">
            {activeTab === 'preview' && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                <button onClick={() => setPreviewMode('mobile')} className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  previewMode === 'mobile' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                  <Smartphone size={12} className="mr-1" /> Mobile
                </button>
                <button onClick={() => setPreviewMode('desktop')} className={`flex items-center px-2 py-1 rounded-md text-xs font-medium transition-all ${
                  previewMode === 'desktop' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                  <Monitor size={12} className="mr-1" /> Desktop
                </button>
              </div>
            )}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
              <button onClick={() => handleManualZoom(-0.1)} disabled={zoomLevel <= 0.2} className={`p-1 rounded-md transition-all ${
                zoomLevel <= 0.2 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`} title="Zoom Out"><ZoomOut size={12} /></button>
              <button onClick={resetZoom} className={`px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                isAutoZoom ? 'text-indigo-600 bg-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}>{isAutoZoom ? 'Auto' : `${Math.round(zoomLevel * 100)}%`}</button>
              <button onClick={() => handleManualZoom(0.1)} disabled={zoomLevel >= 3} className={`p-1 rounded-md transition-all ${
                zoomLevel >= 3 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
              }`} title="Zoom In"><ZoomIn size={12} /></button>
            </div>
            {versions.length > 1 && (
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg">
                <button onClick={handleUndo} disabled={currentVersionIndex <= 0} className={`p-1 rounded-md transition-all ${
                  currentVersionIndex <= 0 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                }`} title="Previous Version"><Undo2 size={12} /></button>
                <button onClick={handleRedo} disabled={currentVersionIndex >= versions.length - 1} className={`p-1 rounded-md transition-all ${
                  currentVersionIndex >= versions.length - 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm'
                }`} title="Next Version"><Redo2 size={12} /></button>
              </div>
            )}
            {generatedCode && (
              <button onClick={handleDownload} className="text-slate-500 hover:text-slate-700 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm hover:shadow transition-all" title="Download HTML">
                <Download size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* History Sidebar */}
        <aside className={`flex-shrink-0 flex-col transition-all duration-300 ease-out relative orion-history-bg border-r-2 border-slate-300/60 shadow-[2px_0_12px_-2px_rgba(15,23,42,0.08)] ${
          isHistoryOpen ? 'w-64 flex' : 'w-0 border-r-0 shadow-none overflow-hidden opacity-0 hidden'
        }`}>
          <div className="shrink-0 px-4 py-3 orion-history-header-bg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-50 to-indigo-100 flex items-center justify-center text-indigo-500 flex-shrink-0 border border-indigo-100/80">
                  <History size={13} />
                </div>
                <h2 className="text-sm font-semibold text-slate-800 whitespace-nowrap tracking-tight">History</h2>
              </div>
              {versions.length > 0 && (
                <span className="text-[11px] font-semibold text-slate-400 bg-white/70 px-2 py-0.5 rounded-full border border-slate-200/70">
                  {versions.length} v{versions.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {currentVersionIndex >= 0 && versions[currentVersionIndex] && (
              <div className="mt-2 pl-9 flex items-center gap-1.5">
                <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                <span className="text-[11px] text-slate-500">
                  Viewing <span className="text-indigo-600 font-semibold">v{currentVersionIndex + 1}</span> of <span className="font-medium text-slate-600">{versions.length}</span>
                </span>
              </div>
            )}
          </div>
          <div className="orion-history-header-divider" />
          <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0 orion-chat-scrollbar relative">
            {versions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 px-4">
                <div className="relative mb-5">
                  <div className="w-16 h-16 rounded-2xl orion-history-empty-icon flex items-center justify-center">
                    <History size={24} className="text-slate-300" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-100 border-2 border-slate-200/80 flex items-center justify-center">
                    <Plus size={10} className="text-slate-400" />
                  </div>
                </div>
                <h3 className="text-slate-700 font-semibold text-sm mb-1.5">No versions yet</h3>
                <p className="text-slate-400 text-xs leading-relaxed text-center max-w-[14rem]">Each generation creates a version snapshot you can revisit anytime.</p>
              </div>
            ) : (
              <div className="relative pl-5">
                <div className="absolute left-[14px] top-3 bottom-3 w-px orion-history-timeline-line" />
                {[...versions].reverse().map((ver, reversedIdx) => {
                  const idx = versions.length - 1 - reversedIdx;
                  const isActive = currentVersionIndex === idx;
                  const isExpanded = expandedVersionIndex === idx;
                  const isSurgical = ver.editMode === 'surgical';
                  return (
                    <div key={ver.id} className="relative mb-0.5 orion-animate-fade-in" style={{ animationDelay: `${reversedIdx * 40}ms` }}>
                      <div className={`absolute left-[-17px] top-[15px] w-[10px] h-[10px] rounded-full border-2 z-[2] orion-history-dot ${
                        isActive ? 'border-indigo-500 bg-indigo-100 orion-history-dot-active' : 'border-slate-300 bg-slate-50'
                      }`} />
                      <div onClick={() => toggleExpandVersion(idx)} className={`orion-history-item-card rounded-lg border overflow-hidden ${
                        isActive ? 'bg-white border-indigo-300/70 orion-history-item-card-active' : 'bg-white/60 border-transparent hover:border-slate-200 hover:bg-white hover:shadow-sm'
                      }`}>
                        <div className="px-3 py-2.5">
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div className={`shrink-0 h-[22px] min-w-[30px] px-1.5 rounded-md flex items-center justify-center text-[10px] font-bold tracking-tight transition-all duration-200 orion-history-version-badge ${
                              isActive ? 'bg-indigo-600 text-white orion-history-version-badge-active' : 'bg-slate-100 text-slate-500'
                            }`}>{idx + 1}</div>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className={`text-xs leading-[1.4] transition-colors line-clamp-2 ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-600 font-medium'}`}>{ver.prompt}</p>
                              <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-medium">
                                <span className={`flex items-center gap-1 ${isActive ? 'text-indigo-500' : 'text-slate-400'}`}>
                                  {isSurgical ? <Edit2 size={10} /> : <Wand2 size={10} />}
                                  {isSurgical ? 'Edit' : 'Gen'}
                                </span>
                                <span className="text-slate-300 leading-none">·</span>
                                <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>{ver.timestamp}</span>
                                {idx === 0 && (
                                  <>
                                    <span className="text-slate-300 leading-none">·</span>
                                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100/80 px-1.5 py-px rounded-full border border-slate-200/60 uppercase tracking-wider">Initial</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <ChevronRight size={14} className={`shrink-0 mt-1 transition-all duration-200 ${
                              isExpanded ? 'rotate-90 text-indigo-500' : isActive ? 'text-indigo-400' : 'text-slate-300'
                            }`} />
                          </div>
                        </div>
                      </div>
                      {isExpanded && (
                        <div className="mt-2 ml-1 mr-0 mb-2 orion-version-expand-enter">
                          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
                            <div className="space-y-3">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-1.5 h-3 rounded-full bg-indigo-400" />
                                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.12em]">Prompt</span>
                                </div>
                                <div className="text-xs text-slate-700 font-medium leading-relaxed bg-slate-50/80 p-3 rounded-lg border border-slate-100/80">{ver.prompt}</div>
                              </div>
                              <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                                <div className="flex items-center gap-1.5">
                                  <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                                  <span className="text-[11px] text-slate-400">{ver.timestamp}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {isSurgical ? <Edit2 size={11} className="text-slate-400" /> : <Wand2 size={11} className="text-slate-400" />}
                                  <span className="text-[11px] text-slate-500 font-medium">{isSurgical ? 'Surgical edit' : 'Full generation'}</span>
                                </div>
                              </div>
                              {ver.editSummary && ver.editSummary !== ver.prompt && (
                                <div className="text-[11px] text-slate-500 bg-slate-50/60 rounded-lg p-2.5 border border-slate-100/80 leading-relaxed">
                                  <span className="font-semibold text-slate-400 block mb-0.5">Summary</span>
                                  {ver.editSummary}
                                </div>
                              )}
                              <div className="grid grid-cols-3 gap-2 pt-1">
                                <button onClick={(e) => { e.stopPropagation(); switchVersion(idx); }} className="orion-btn-premium orion-btn-premium-primary w-full py-2 text-[11px]">
                                  <Play size={12} /> Restore
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); copyVersionCode(ver); }} className="orion-btn-premium orion-btn-premium-secondary w-full py-2 text-[11px]">
                                  <Copy size={12} /> Copy
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); downloadVersion(ver); }} className="orion-btn-premium orion-btn-premium-secondary w-full py-2 text-[11px]">
                                  <Download size={12} /> Save
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 min-h-0 flex overflow-hidden">
          {/* Prompt/Chat Sidebar (Left) */}
          <div className="w-full md:w-[280px] lg:w-[340px] min-h-0 overflow-hidden flex flex-col bg-white border-r border-slate-200 flex-shrink-0 relative">
            <div className="absolute inset-0 pointer-events-none z-0 orion-prompt-atmosphere" />
            <div className="flex-1 min-h-0 overflow-y-auto px-4 lg:px-5 pt-5 pb-3 flex flex-col justify-start relative z-[1] orion-chat-scrollbar">
              <div className="max-w-2xl w-full mx-auto space-y-5 orion-animate-fade-in">
                <div className={generatedCode ? 'orion-refine-card' : ''}>
                  <div className="space-y-2">
                    {generatedCode && (
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-[0.12em]">Editing</span>
                      </div>
                    )}
                    <h2 className="text-lg lg:text-xl font-bold text-slate-900 tracking-tight leading-[1.2]">
                      {generatedCode ? "Refine your app" : "What do you want to build?"}
                    </h2>
                    <p className="text-slate-500 text-[12px] leading-relaxed">
                      {generatedCode ? "Describe what to change, add, or fix." : "Describe your app in natural language and Orion will generate a complete, working application."}
                    </p>
                  </div>
                </div>

                {!generatedCode && (
                  <div className="space-y-2 orion-animate-fade-in" style={{ animationDelay: '0.08s' }}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="w-2.5 h-[2px] rounded-full bg-slate-300" />
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.12em]">Try a starter</h3>
                    </div>
                    <div className="grid grid-cols-1 gap-1">
                      {suggestedPrompts.map((suggestion, idx) => (
                        <button key={idx} onClick={() => setPrompt(suggestion)} className={`text-left px-3 py-2 bg-white/90 border border-slate-200 rounded-xl transition-all group flex items-center justify-between orion-suggestion-card orion-stagger-${idx + 1}`}>
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-[11px] text-slate-600 group-hover:text-slate-900 leading-snug transition-colors truncate">{suggestion}</span>
                          </div>
                          <ChevronRight size={12} className="text-slate-300 group-hover:text-indigo-400 transition-all duration-200 flex-shrink-0 ml-2 group-hover:translate-x-0.5" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50/80 border border-red-100 p-3 rounded-xl backdrop-blur-sm orion-animate-fade-in">
                    <div className="flex items-start gap-2.5">
                      <div className="p-1 bg-red-100 rounded-lg text-red-500 flex-shrink-0"><RefreshCw size={13} /></div>
                      <div>
                        <p className="text-[10px] font-bold text-red-700 uppercase tracking-wider mb-0.5">Error</p>
                        <p className="text-[11px] text-red-800 font-medium leading-snug">{error}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Fixed Bottom Input Area */}
            <div className="shrink-0 p-3 border-t border-slate-200/60 bg-white/80 backdrop-blur-md relative z-[1]">
              <div className="bg-white rounded-xl orion-shadow-premium-md border border-slate-200 overflow-hidden transition-all orion-input-glow">
                <textarea
                  id="prompt"
                  name="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={generatedCode ? "e.g. Make the background dark, add a reset button..." : "e.g. A minimalist task manager with categories..."}
                  className="w-full h-20 px-3 pt-3 pb-2 outline-none resize-none text-slate-800 placeholder:text-slate-400 text-[12px] leading-5 bg-transparent"
                  disabled={isGenerating}
                />
                {!generatedCode && versions.length === 0 && (
                  <div className="px-3 pb-2.5">
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70 px-2.5 py-2">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.10em] mb-2">Optimize for</p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {INITIAL_LAYOUT_OPTIONS.map((option) => {
                          const Icon = option.icon;
                          const isSelected = initialLayoutTarget === option.id;
                          return (
                            <label key={option.id} className={`orion-layout-selector flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1.5 transition-all ${
                              isSelected ? 'orion-layout-selector-selected' : 'border-slate-200 bg-white/80 hover:border-slate-300'
                            }`}>
                              <input type="radio" name="initialLayoutTarget" value={option.id} checked={isSelected} onChange={() => setInitialLayoutTarget(option.id)} className="sr-only" disabled={isGenerating} />
                              <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${isSelected ? 'bg-indigo-500 shadow-[0_0_0_3px_rgba(99,102,241,0.2)]' : 'bg-slate-300'}`} />
                              <Icon size={11} className={isSelected ? 'text-indigo-600' : 'text-slate-400'} />
                              <span className={`text-[10px] font-semibold ${isSelected ? 'text-indigo-700' : 'text-slate-600'}`}>{option.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
                <div className="border-t border-slate-100 bg-gradient-to-b from-slate-50/80 to-white px-3 py-2.5 flex justify-between items-center">
                  <div className="flex space-x-1.5">
                    {isGenerating && (
                      <button
                        onClick={() => { if (abortControllerRef.current) { abortControllerRef.current.abort(); abortControllerRef.current = null; } }}
                        className="orion-btn-premium py-1.5 px-3 text-[11px] bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors rounded-lg font-semibold flex items-center gap-1"
                      >
                        <X size={13} /> Cancel
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className={`orion-btn-premium py-1.5 px-4 text-[11px] ${isGenerating ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'orion-btn-premium-primary'}`}
                  >
                    {isGenerating ? (
                      <><Loader2 className="animate-spin" size={13} />{generatedCode ? "Updating..." : "Building..."}</>
                    ) : (
                      <>{generatedCode ? <Edit2 size={13} /> : <Wand2 size={13} />}{generatedCode ? "Update" : "Build"}</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview/Device Area (Right) */}
          <div className="flex-1 min-h-0 bg-slate-200/60 flex flex-col relative z-0 orion-inset-shadow-preview">
            {/* View Toggles */}
            <div className="shrink-0 flex items-center justify-between px-3 py-2 border-b border-slate-200/80 bg-white">
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button onClick={() => setActiveTab('preview')} className={`flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'preview' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                  <Play size={12} className="mr-1" /> Preview
                </button>
                <button onClick={() => setActiveTab('code')} className={`flex items-center px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  activeTab === 'code' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}>
                  <TerminalSquare size={12} className="mr-1" /> Code
                </button>
              </div>
            </div>

            <div ref={previewContainerRef} className="flex-1 min-h-0 flex items-center justify-center p-4 overflow-auto relative orion-custom-scrollbar">
              <div className="absolute inset-0 opacity-50 pointer-events-none orion-workspace-grid" />

              {activeTab === 'preview' ? (
                <div className="relative shrink-0 flex items-center justify-center" style={{ width: scaledPreviewWidth, height: scaledPreviewHeight }}>
                  <div className={previewMode === 'mobile' ? 'orion-device-smartphone' : 'orion-device-desktop'} style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)' }}>
                    {previewMode === 'mobile' ? (
                      <div className="absolute top-0 inset-x-0 flex justify-center z-20 pt-2">
                        <div className="w-28 h-7 bg-[#0f172a] rounded-2xl flex items-center justify-center">
                          <div className="w-10 h-1 bg-slate-800 rounded-full" />
                          <div className="w-1.5 h-1.5 bg-slate-800 rounded-full ml-2" />
                        </div>
                      </div>
                    ) : (
                      <div className="orion-device-desktop-toolbar">
                        <div className="orion-device-desktop-lights">
                          <span className="orion-device-desktop-light orion-device-desktop-light-red" />
                          <span className="orion-device-desktop-light orion-device-desktop-light-amber" />
                          <span className="orion-device-desktop-light orion-device-desktop-light-green" />
                        </div>
                        <div className="orion-device-desktop-addressbar">
                          <span className="orion-device-desktop-address-pill" />
                          <span className="orion-device-desktop-address-text">app-preview.local</span>
                        </div>
                      </div>
                    )}

                    <div className={previewMode === 'mobile' ? 'orion-device-screen orion-device-screen-mobile' : 'orion-device-screen'}>
                      <div className={previewMode === 'mobile' ? 'orion-device-preview-surface orion-device-preview-surface-mobile' : 'orion-device-preview-surface'}>
                        {generatedCode ? (
                          <iframe ref={iframeRef} title="Generated App Preview" srcDoc={generatedCode} className="w-full h-full border-none" sandbox="allow-scripts allow-forms allow-same-origin allow-popups" />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
                            <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center mb-3">
                              {previewMode === 'mobile' ? <Smartphone size={20} className="text-slate-300" /> : <Monitor size={20} className="text-slate-300" />}
                            </div>
                            <h4 className="font-semibold text-slate-700 text-xs mb-1">{previewMode === 'mobile' ? 'Mobile Preview' : 'Desktop Preview'}</h4>
                            <p className="text-[10px] text-slate-400 max-w-[12rem] leading-relaxed">Your app will appear here after building.</p>
                          </div>
                        )}
                      </div>
                      {isGenerating && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 backdrop-blur-sm z-10 p-4 text-center">
                          <div className="relative w-12 h-12 mb-4">
                            <div className="absolute inset-0 border-4 border-indigo-100 rounded-full" />
                            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin" />
                            <Sparkles className="absolute inset-0 m-auto text-indigo-500" size={16} />
                          </div>
                          <h3 className="text-xs font-semibold text-slate-900 mb-0.5">Building...</h3>
                          <p className="text-[10px] text-slate-500 animate-pulse">Generating HTML, CSS & JavaScript</p>
                        </div>
                      )}
                    </div>

                    {previewMode === 'mobile' ? (
                      <>
                        <div className="absolute -left-1 top-24 w-1 h-12 bg-slate-700 rounded-r-sm shadow-sm" />
                        <div className="absolute -left-1 top-40 w-1 h-20 bg-slate-700 rounded-r-sm shadow-sm" />
                        <div className="absolute -right-1 top-36 w-1 h-20 bg-slate-700 rounded-l-sm shadow-sm" />
                        <div className="absolute bottom-3 inset-x-0 flex justify-center z-20">
                          <div className="w-32 h-1.5 rounded-full bg-slate-200/70" />
                        </div>
                      </>
                    ) : (
                      <div className="orion-device-desktop-stand" />
                    )}
                  </div>
                </div>
              ) : (
                /* Code View */
                <div className="w-full h-full bg-[#1a1b26] rounded-lg overflow-hidden shadow-lg border border-slate-800/50 flex flex-col">
                  <div className="bg-[#24253a] px-3 py-1.5 flex items-center border-b border-black/30">
                    <div className="flex space-x-1 mr-3">
                      <div className="w-2 h-2 rounded-full bg-[#ff5f56]" />
                      <div className="w-2 h-2 rounded-full bg-[#ffbd2e]" />
                      <div className="w-2 h-2 rounded-full bg-[#27c93f]" />
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">index.html</span>
                    <div className="flex-1" />
                    {codePanelCode && (
                      <button onClick={handleCopyCode} className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${
                        copied ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'text-slate-400 hover:text-white hover:bg-white/10'
                      }`} title="Copy to clipboard">
                        {copied ? <Check size={12} /> : <Copy size={12} />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                  <div className="flex-1 overflow-auto bg-[#1a1b26] orion-custom-scrollbar">
                    {codePanelCode ? (
                      <>
                        {isGenerating && (
                          <div className="sticky top-0 z-10 flex items-center gap-1.5 border-b border-indigo-500/10 bg-[#1a1b26]/95 px-3 py-1 text-[10px] font-medium uppercase tracking-wider text-indigo-300 backdrop-blur-sm">
                            <Loader2 className="animate-spin" size={10} />
                            <span>Streaming</span>
                          </div>
                        )}
                        <div className="py-3 font-mono text-[11px] leading-relaxed" dangerouslySetInnerHTML={{ __html: syntaxHighlightHtml(codePanelCode) }} />
                      </>
                    ) : isGenerating ? (
                      <div className="flex items-center justify-center h-full space-x-2 text-indigo-400/50 font-mono text-xs">
                        <Loader2 className="animate-spin" size={14} />
                        <span>Generating...</span>
                      </div>
                    ) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 font-mono text-xs opacity-40">
                        <Code2 size={28} className="mb-2 text-slate-700" />
                        <span>{`// No code yet`}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default OrionAppBuilder;
