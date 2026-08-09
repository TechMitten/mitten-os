export interface KeyProfile {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface AIPreset {
  id: string;
  name: string;
  endpoint: string;
  defaultModel: string;
  placeholderKey?: string;
  description: string;
}

export const AI_PRESETS: AIPreset[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    placeholderKey: 'sk-proj-...',
    description: 'Standard GPT-4o / GPT-4o-mini models',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    endpoint: 'https://openrouter.ai/api/v1',
    defaultModel: 'anthropic/claude-3.5-sonnet',
    placeholderKey: 'sk-or-v1-...',
    description: 'Universal gateway for Claude, Llama, DeepSeek',
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    endpoint: 'https://api.deepseek.com/v1',
    defaultModel: 'deepseek-chat',
    placeholderKey: 'sk-...',
    description: 'DeepSeek V3 / R1 reasoning models',
  },
  {
    id: 'groq',
    name: 'Groq',
    endpoint: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    placeholderKey: 'gsk_...',
    description: 'Ultra-low latency inference engine',
  },
  {
    id: 'gemini',
    name: 'Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/openai/',
    defaultModel: 'gemini-2.5-flash',
    placeholderKey: 'AIzaSy...',
    description: 'Official Google Gemini API (2.5 Flash / Pro)',
  },
  {
    id: 'custom',
    name: 'Custom Endpoint',
    endpoint: '',
    defaultModel: '',
    placeholderKey: 'sk-...',
    description: 'Any OpenAI-compatible API endpoint',
  },
];

export const STORAGE_KEYS = {
  PROFILES: 'mittenOS_keys_profiles',
  ACTIVE_PROFILE_ID: 'mittenOS_keys_active_profile_id',
  ENDPOINT: 'mittenOS_keys_endpoint',
  API_KEY: 'mittenOS_keys_apikey',
  MODEL: 'mittenOS_keys_model',
} as const;

export function loadKeyProfiles(): {
  profiles: KeyProfile[];
  activeProfileId: string;
  activeProfile: KeyProfile | null;
} {
  if (typeof window === 'undefined') {
    return { profiles: [], activeProfileId: '', activeProfile: null };
  }

  const savedProfiles = localStorage.getItem(STORAGE_KEYS.PROFILES);
  const activeId = localStorage.getItem(STORAGE_KEYS.ACTIVE_PROFILE_ID);

  let loadedProfiles: KeyProfile[] = [];
  if (savedProfiles) {
    try {
      loadedProfiles = JSON.parse(savedProfiles);
    } catch (e) {
      console.error('Failed to parse profiles', e);
    }
  }

  // Migration check: if no profiles exist but legacy keys exist, migrate them
  if (loadedProfiles.length === 0) {
    const legacyEndpoint = localStorage.getItem(STORAGE_KEYS.ENDPOINT) || '';
    const legacyApiKey = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    const legacyModel = localStorage.getItem(STORAGE_KEYS.MODEL) || '';

    if (legacyEndpoint || legacyApiKey || legacyModel) {
      const defaultProfile: KeyProfile = {
        id: 'default',
        name: 'Default Config',
        endpoint: legacyEndpoint,
        apiKey: legacyApiKey,
        model: legacyModel,
      };
      loadedProfiles = [defaultProfile];
      localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(loadedProfiles));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, 'default');
    }
  }

  const currentActiveId = activeId || loadedProfiles[0]?.id || '';
  const activeProfile = loadedProfiles.find((p) => p.id === currentActiveId) || loadedProfiles[0] || null;

  return {
    profiles: loadedProfiles,
    activeProfileId: currentActiveId,
    activeProfile,
  };
}

export function saveActiveProfile(profile: KeyProfile): void {
  if (typeof window === 'undefined') return;

  const { profiles } = loadKeyProfiles();
  const index = profiles.findIndex((p) => p.id === profile.id);

  let updatedProfiles: KeyProfile[];
  if (index >= 0) {
    updatedProfiles = profiles.map((p) => (p.id === profile.id ? profile : p));
  } else {
    updatedProfiles = [...profiles, profile];
  }

  localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(updatedProfiles));
  localStorage.setItem(STORAGE_KEYS.ACTIVE_PROFILE_ID, profile.id);
  localStorage.setItem(STORAGE_KEYS.ENDPOINT, profile.endpoint.trim());
  localStorage.setItem(STORAGE_KEYS.API_KEY, profile.apiKey.trim());
  localStorage.setItem(STORAGE_KEYS.MODEL, profile.model.trim());
}

export async function testKeyConnection(
  endpoint: string,
  apiKey: string,
  model: string
): Promise<{ success: boolean; message: string }> {
  if (!endpoint.trim() || !model.trim()) {
    return {
      success: false,
      message: 'Please fill in endpoint and model before testing connection.',
    };
  }

  const cleanedUrl = endpoint.trim();
  const targetUrl = cleanedUrl.endsWith('/chat/completions')
    ? cleanedUrl
    : `${cleanedUrl.replace(/\/$/, '')}/chat/completions`;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey.trim()) {
      headers['Authorization'] = `Bearer ${apiKey.trim()}`;
    }

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model.trim(),
        messages: [{ role: 'user', content: 'Ping' }],
        max_tokens: 5,
      }),
    });

    if (response.ok) {
      return {
        success: true,
        message: 'Connection successful! Model responded correctly.',
      };
    } else {
      const text = await response.text();
      let errMsg = `HTTP Error ${response.status}`;
      try {
        const json = JSON.parse(text);
        errMsg = json.error?.message || errMsg;
      } catch {
        if (text) errMsg += ` - ${text.substring(0, 100)}`;
      }
      return {
        success: false,
        message: `Failed: ${errMsg}`,
      };
    }
  } catch (err) {
    return {
      success: false,
      message: `Failed: ${err instanceof Error ? err.message : 'Network error'}`,
    };
  }
}
