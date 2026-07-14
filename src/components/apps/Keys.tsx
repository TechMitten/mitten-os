'use client';

import React, { useState, useEffect } from 'react';
import { Key, Globe, Cpu, Eye, EyeOff, Save, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function KeysApp() {
  const { toast } = useToast();

  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load saved keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setEndpoint(localStorage.getItem('mittenOS_keys_endpoint') || '');
      setApiKey(localStorage.getItem('mittenOS_keys_apikey') || '');
      setModel(localStorage.getItem('mittenOS_keys_model') || '');
    }
  }, []);

  const handleSave = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('mittenOS_keys_endpoint', endpoint.trim());
      localStorage.setItem('mittenOS_keys_apikey', apiKey.trim());
      localStorage.setItem('mittenOS_keys_model', model.trim());

      toast({
        title: 'Keys Saved',
        description: 'Global AI API configurations have been updated successfully.',
      });
    }
  };

  const handleTestConnection = async () => {
    if (!endpoint.trim() || !apiKey.trim() || !model.trim()) {
      setTestResult({
        success: false,
        message: 'Please fill in all fields before testing connection.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Clean up base URL for endpoint
      const cleanedUrl = endpoint.trim();
      const targetUrl = cleanedUrl.endsWith('/chat/completions')
        ? cleanedUrl
        : `${cleanedUrl.replace(/\/$/, '')}/chat/completions`;

      const response = await fetch(targetUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify({
          model: model.trim(),
          messages: [{ role: 'user', content: 'Ping' }],
          max_tokens: 5,
        }),
      });

      if (response.ok) {
        setTestResult({
          success: true,
          message: 'Connection successful! Model responded correctly.',
        });
      } else {
        const text = await response.text();
        let errMsg = `HTTP Error ${response.status}`;
        try {
          const json = JSON.parse(text);
          errMsg = json.error?.message || errMsg;
        } catch {
          if (text) errMsg += ` - ${text.substring(0, 100)}`;
        }
        setTestResult({
          success: false,
          message: `Failed: ${errMsg}`,
        });
      }
    } catch (err) {
      setTestResult({
        success: false,
        message: `Failed: ${err instanceof Error ? err.message : 'Network error'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-card dark:bg-zinc-900 text-card-foreground h-full overflow-y-auto p-6 select-none flex flex-col justify-between">
      <div className="space-y-6 max-w-md mx-auto w-full">
        {/* Header */}
        <div className="flex flex-col items-center text-center pb-2 border-b border-border">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md mb-3">
            <Key className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-lg font-semibold tracking-tight">AI API Keys</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Centralize your OpenAI-compatible endpoint configurations for all OS apps.
          </p>
        </div>

        {/* Inputs */}
        <div className="space-y-4">
          {/* Endpoint */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-amber-500" />
              API Endpoint URL
            </label>
            <input
              type="text"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://api.openai.com/v1"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 font-mono"
            />
            <p className="text-[10px] text-muted-foreground/60 leading-normal">
              The base URL of your OpenAI-compatible service (e.g. OpenRouter, DeepSeek, or local Ollama).
            </p>
          </div>

          {/* API Key */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Key className="w-3.5 h-3.5 text-amber-500" />
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-..."
                className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 pr-10 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground/60 leading-normal">
              Your secret key for authentication. This remains solely in browser local storage.
            </p>
          </div>

          {/* Model */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-amber-500" />
              Model Name
            </label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gpt-4o"
              className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 font-mono"
            />
            <p className="text-[10px] text-muted-foreground/60 leading-normal">
              The identifier for the model you want to use (e.g. gpt-4o, deepseek-chat, llama3).
            </p>
          </div>
        </div>

        {/* Test Result Alert */}
        {testResult && (
          <div
            className={`p-3 rounded-lg border flex gap-2 text-xs items-start ${
              testResult.success
                ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
            }`}
          >
            {testResult.success ? (
              <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}
      </div>

      {/* Buttons */}
      <div className="flex gap-3 justify-end pt-4 mt-6 border-t border-border max-w-md mx-auto w-full">
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="px-4 py-2 rounded-lg bg-muted hover:bg-accent text-sm font-semibold text-foreground transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          Test Connection
        </button>
        <button
          onClick={handleSave}
          className="px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-sm font-semibold text-white transition-colors active:scale-[0.98] flex items-center gap-2 cursor-pointer"
        >
          <Save className="w-4 h-4" />
          Save Keys
        </button>
      </div>
    </div>
  );
}
