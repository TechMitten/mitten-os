'use client';

import React, { useState, useEffect } from 'react';
import { Key, Globe, Cpu, Eye, EyeOff, Save, CheckCircle, XCircle, Loader2, Plus, Trash2, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface KeyProfile {
  id: string;
  name: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export default function KeysApp() {
  const { toast } = useToast();

  const [profiles, setProfiles] = useState<KeyProfile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string>('');
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');

  // Form states
  const [profileName, setProfileName] = useState('');
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');

  // UI States
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Load saved keys on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedProfiles = localStorage.getItem('mittenOS_keys_profiles');
      const activeId = localStorage.getItem('mittenOS_keys_active_profile_id');

      let loadedProfiles: KeyProfile[] = [];
      if (savedProfiles) {
        try {
          loadedProfiles = JSON.parse(savedProfiles);
        } catch (e) {
          console.error('Failed to parse profiles', e);
        }
      }

      // Migration check: if no profiles exist but they have some legacy keys, migrate them!
      if (loadedProfiles.length === 0) {
        const legacyEndpoint = localStorage.getItem('mittenOS_keys_endpoint') || '';
        const legacyApiKey = localStorage.getItem('mittenOS_keys_apikey') || '';
        const legacyModel = localStorage.getItem('mittenOS_keys_model') || '';

        const defaultProfile: KeyProfile = {
          id: 'default',
          name: 'Default Config',
          endpoint: legacyEndpoint,
          apiKey: legacyApiKey,
          model: legacyModel,
        };
        loadedProfiles = [defaultProfile];
        localStorage.setItem('mittenOS_keys_profiles', JSON.stringify(loadedProfiles));
        localStorage.setItem('mittenOS_keys_active_profile_id', 'default');
      }

      setProfiles(loadedProfiles);

      const currentActiveId = activeId || loadedProfiles[0]?.id || 'default';
      setActiveProfileId(currentActiveId);
      setSelectedProfileId(currentActiveId);

      const activeProfile = loadedProfiles.find((p) => p.id === currentActiveId) || loadedProfiles[0];
      if (activeProfile) {
        setProfileName(activeProfile.name);
        setEndpoint(activeProfile.endpoint);
        setApiKey(activeProfile.apiKey);
        setModel(activeProfile.model);
      }
    }
  }, []);

  const handleProfileSelect = (profileId: string) => {
    const profile = profiles.find((p) => p.id === profileId);
    if (!profile) return;

    setSelectedProfileId(profileId);
    setProfileName(profile.name);
    setEndpoint(profile.endpoint);
    setApiKey(profile.apiKey);
    setModel(profile.model);
    setTestResult(null);
  };

  const handleAddProfile = () => {
    const newProfile: KeyProfile = {
      id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: `Profile ${profiles.length + 1}`,
      endpoint: '',
      apiKey: '',
      model: '',
    };

    const updatedProfiles = [...profiles, newProfile];
    setProfiles(updatedProfiles);
    localStorage.setItem('mittenOS_keys_profiles', JSON.stringify(updatedProfiles));

    // Select the new profile
    setSelectedProfileId(newProfile.id);
    setProfileName(newProfile.name);
    setEndpoint(newProfile.endpoint);
    setApiKey(newProfile.apiKey);
    setModel(newProfile.model);
    setTestResult(null);

    toast({
      title: 'Profile Created',
      description: `New profile "${newProfile.name}" created.`,
    });
  };

  const handleDeleteProfile = (profileId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (profiles.length <= 1) {
      toast({
        title: 'Delete Failed',
        description: 'You must keep at least one profile.',
        variant: 'destructive',
      });
      return;
    }

    const updatedProfiles = profiles.filter((p) => p.id !== profileId);
    setProfiles(updatedProfiles);
    localStorage.setItem('mittenOS_keys_profiles', JSON.stringify(updatedProfiles));

    // If we deleted the selected profile, load another one
    if (selectedProfileId === profileId) {
      const fallback = updatedProfiles[0];
      handleProfileSelect(fallback.id);
    }

    // If we deleted the active profile, make another one active
    if (activeProfileId === profileId) {
      const fallbackActive = updatedProfiles[0];
      setActiveProfileId(fallbackActive.id);
      localStorage.setItem('mittenOS_keys_active_profile_id', fallbackActive.id);
      localStorage.setItem('mittenOS_keys_endpoint', fallbackActive.endpoint);
      localStorage.setItem('mittenOS_keys_apikey', fallbackActive.apiKey);
      localStorage.setItem('mittenOS_keys_model', fallbackActive.model);
    }

    toast({
      title: 'Profile Deleted',
      description: 'The profile has been removed.',
    });
  };

  const handleSave = () => {
    if (!profileName.trim()) {
      toast({
        title: 'Save Failed',
        description: 'Profile name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    const updatedProfiles = profiles.map((p) => {
      if (p.id === selectedProfileId) {
        return {
          ...p,
          name: profileName.trim(),
          endpoint: endpoint.trim(),
          apiKey: apiKey.trim(),
          model: model.trim(),
        };
      }
      return p;
    });

    setProfiles(updatedProfiles);
    localStorage.setItem('mittenOS_keys_profiles', JSON.stringify(updatedProfiles));

    // If the saved profile is the currently active one, sync global storage
    if (selectedProfileId === activeProfileId) {
      localStorage.setItem('mittenOS_keys_endpoint', endpoint.trim());
      localStorage.setItem('mittenOS_keys_apikey', apiKey.trim());
      localStorage.setItem('mittenOS_keys_model', model.trim());
    }

    toast({
      title: 'Profile Saved',
      description: `"${profileName.trim()}" has been updated.`,
    });
  };

  const handleSetActive = () => {
    setActiveProfileId(selectedProfileId);
    localStorage.setItem('mittenOS_keys_active_profile_id', selectedProfileId);
    localStorage.setItem('mittenOS_keys_endpoint', endpoint.trim());
    localStorage.setItem('mittenOS_keys_apikey', apiKey.trim());
    localStorage.setItem('mittenOS_keys_model', model.trim());

    toast({
      title: 'Active Profile Switched',
      description: `"${profileName}" is now the active configuration globally.`,
    });
  };

  const handleTestConnection = async () => {
    if (!endpoint.trim() || !apiKey.trim() || !model.trim()) {
      setTestResult({
        success: false,
        message: 'Please fill in all endpoint fields before testing connection.',
      });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
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

  const selectedProfile = profiles.find((p) => p.id === selectedProfileId);
  const isActive = selectedProfileId === activeProfileId;

  return (
    <div className="flex h-full bg-card dark:bg-zinc-900 text-card-foreground select-none overflow-hidden">
      {/* Sidebar Profiles List */}
      <div className="w-48 bg-muted/40 dark:bg-zinc-950/20 border-r border-border p-3 flex flex-col justify-between shrink-0 h-full">
        <div className="space-y-4 overflow-y-auto pr-1 flex-1 settings-scrollbar">
          <div className="px-1.5 flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">
              Profiles
            </span>
          </div>

          <div className="space-y-1">
            {profiles.map((p) => {
              const isSelected = p.id === selectedProfileId;
              const isProfileActive = p.id === activeProfileId;
              return (
                <button
                  key={p.id}
                  onClick={() => handleProfileSelect(p.id)}
                  className={`group w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-all relative ${
                    isSelected
                      ? 'bg-accent dark:bg-white/10 text-foreground font-medium border border-border'
                      : 'text-muted-foreground hover:bg-accent/40 hover:text-foreground border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {isProfileActive ? (
                      <Check className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ) : (
                      <Key className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
                    )}
                    <span className="truncate">{p.name}</span>
                  </div>

                  {profiles.length > 1 && (
                    <button
                      onClick={(e) => handleDeleteProfile(p.id, e)}
                      className="opacity-0 group-hover:opacity-100 hover:text-red-500 p-0.5 rounded transition-all ml-1.5 shrink-0"
                      title="Delete profile"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleAddProfile}
          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border border-dashed border-border hover:border-foreground/30 hover:bg-accent/50 text-xs font-semibold transition-all mt-4 cursor-pointer text-muted-foreground hover:text-foreground"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Profile
        </button>
      </div>

      {/* Main Details Panel */}
      <div className="flex-1 p-6 flex flex-col justify-between h-full overflow-y-auto settings-scrollbar font-sans">
        <div className="space-y-5 max-w-md mx-auto w-full">
          {/* Header */}
          <div className="flex items-center gap-4 pb-4 border-b border-border">
            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-md">
              <Key className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 font-sans">
                <h1 className="text-sm font-semibold tracking-tight">Profile Details</h1>
                {isActive && (
                  <span className="bg-green-500/10 text-green-600 dark:text-green-400 text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-green-500/20 font-sans">
                    Active
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-sans">
                Configure OpenAI-compatible endpoint combinations.
              </p>
            </div>
          </div>

          {/* Storage Info */}
          <div className="p-3.5 rounded-xl border border-border bg-muted/20 text-[10px] text-muted-foreground/80 leading-relaxed font-sans">
            <span className="font-semibold text-foreground">Storage Info:</span> All configuration profiles and API keys are stored strictly in your browser's local storage. They are never sent to our servers or synced to the Virtual File System (VFS), keeping your credentials private and secure on this device.
          </div>

          {/* Form */}
          <div className="space-y-4">
            {/* Profile Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground font-sans">
                Profile Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="e.g. Work DeepSeek"
                className="w-full bg-muted dark:bg-zinc-800/60 border border-border rounded-lg px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500 font-semibold font-sans"
              />
            </div>

            {/* Endpoint */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 font-sans">
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
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 font-sans">
                <Key className="w-3.5 h-3.5 text-amber-500" />
                API Key
              </label>
              <div className="relative font-sans">
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
            </div>

            {/* Model */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 font-sans">
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
            </div>
          </div>

          {/* Test Result Alert */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border flex gap-2 text-xs items-start font-sans ${
                testResult.success
                  ? 'bg-green-500/10 border-green-500/30 text-green-600 dark:text-green-400'
                  : 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5 text-green-500" />
              ) : (
                <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              )}
              <span className="leading-relaxed">{testResult.message}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex gap-2.5 justify-end pt-4 mt-6 border-t border-border max-w-md mx-auto w-full font-sans">
          <button
            onClick={handleTestConnection}
            disabled={testing}
            className="px-3.5 py-2 rounded-lg bg-muted hover:bg-accent text-xs font-semibold text-foreground transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 font-sans"
          >
            {testing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Test Connection
          </button>

          {!isActive && (
            <button
              onClick={handleSetActive}
              className="px-3.5 py-2 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-foreground transition-colors active:scale-[0.98] cursor-pointer font-sans"
            >
              Use Profile
            </button>
          )}

          <button
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-xs font-semibold text-white transition-colors active:scale-[0.98] flex items-center gap-1.5 cursor-pointer font-sans"
          >
            <Save className="w-3.5 h-3.5" />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
