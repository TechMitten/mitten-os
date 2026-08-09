'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Sparkles,
  Zap,
  Bot,
  FolderOpen,
  ArrowRight,
  ArrowLeft,
  Key,
  Globe,
  Cpu,
  Eye,
  EyeOff,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldCheck,
  Check,
  Wand2,
  HardDrive,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { useWindowStore } from '@/stores/window-store';
import {
  loadKeyProfiles,
  saveActiveProfile,
  testKeyConnection,
  AI_PRESETS,
  type KeyProfile,
  type AIPreset,
} from '@/lib/keys';

interface WelcomeWindowProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const WINDOW_WIDTH = 500;
const TASKBAR_HEIGHT = 48;

const getInitialPos = () => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const effectiveWidth = Math.min(WINDOW_WIDTH, window.innerWidth * 0.94);
  const availableHeight = window.innerHeight - TASKBAR_HEIGHT;
  return {
    x: Math.max(0, (window.innerWidth - effectiveWidth) / 2),
    y: Math.max(0, (availableHeight - 500) / 2),
  };
};

export function WelcomeWindow({ open, onClose }: WelcomeWindowProps) {
  const openWindow = useWindowStore((s) => s.openWindow);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  // Key form states
  const [selectedPresetId, setSelectedPresetId] = useState<string>('openai');
  const [profileName, setProfileName] = useState('OpenAI Config');
  const [endpoint, setEndpoint] = useState('https://api.openai.com/v1');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('gpt-4o');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [keyConfigured, setKeyConfigured] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(getInitialPos);
  const posRef = useRef(pos);

  // Load existing key config when window opens
  useEffect(() => {
    if (!open) return;

    const { activeProfile } = loadKeyProfiles();
    if (activeProfile && (activeProfile.apiKey || activeProfile.endpoint)) {
      setProfileName(activeProfile.name || 'Default Config');
      setEndpoint(activeProfile.endpoint || 'https://api.openai.com/v1');
      setApiKey(activeProfile.apiKey || '');
      setModel(activeProfile.model || 'gpt-4o');
      setKeyConfigured(Boolean(activeProfile.apiKey && activeProfile.endpoint));

      // Match preset if exists
      const matchedPreset = AI_PRESETS.find(
        (p) => p.endpoint === activeProfile.endpoint && p.defaultModel === activeProfile.model
      );
      if (matchedPreset) {
        setSelectedPresetId(matchedPreset.id);
      } else {
        setSelectedPresetId('custom');
      }
    }
  }, [open]);

  const updatePosState = useCallback((newPos: { x: number; y: number }) => {
    posRef.current = newPos;
    setPos(newPos);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const el = modalRef.current;
    const modalWidth = el?.offsetWidth || Math.min(WINDOW_WIDTH, window.innerWidth * 0.94);
    const modalHeight = el?.offsetHeight || 500;

    const availableHeight = window.innerHeight - TASKBAR_HEIGHT;
    const newPos = {
      x: Math.max(0, (window.innerWidth - modalWidth) / 2),
      y: Math.max(0, (availableHeight - modalHeight) / 2),
    };

    updatePosState(newPos);
  }, [updatePosState]);

  useEffect(() => {
    if (!open) return;

    if (!hasBeenDragged) {
      updatePosition();
      const timer = requestAnimationFrame(() => {
        if (!hasBeenDragged) updatePosition();
      });
      return () => cancelAnimationFrame(timer);
    }
  }, [open, hasBeenDragged, updatePosition]);

  useEffect(() => {
    if (!open) return;

    const handleResize = () => {
      if (!hasBeenDragged) {
        updatePosition();
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [open, hasBeenDragged, updatePosition]);

  const handleClose = useCallback(() => {
    onClose(dontShowAgain);
  }, [dontShowAgain, onClose]);

  useEffect(() => {
    if (!open) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [open, handleClose]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      setIsDragging(true);
      setHasBeenDragged(true);

      const startX = e.clientX;
      const startY = e.clientY;
      const originX = posRef.current.x;
      const originY = posRef.current.y;

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newPos = {
          x: originX + dx,
          y: Math.max(0, originY + dy),
        };
        updatePosState(newPos);
      };

      const handleUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [updatePosState]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length !== 1) return;

      setIsDragging(true);
      setHasBeenDragged(true);

      const touch = e.touches[0];
      const startX = touch.clientX;
      const startY = touch.clientY;
      const originX = posRef.current.x;
      const originY = posRef.current.y;

      const handleTouchMove = (ev: TouchEvent) => {
        if (ev.touches.length !== 1) return;
        const t = ev.touches[0];
        const dx = t.clientX - startX;
        const dy = t.clientY - startY;
        const newPos = {
          x: originX + dx,
          y: Math.max(0, originY + dy),
        };
        updatePosState(newPos);
      };

      const handleTouchEnd = () => {
        setIsDragging(false);
        document.removeEventListener('touchmove', handleTouchMove);
        document.removeEventListener('touchend', handleTouchEnd);
      };

      document.addEventListener('touchmove', handleTouchMove, { passive: true });
      document.addEventListener('touchend', handleTouchEnd);
    },
    [updatePosState]
  );

  const handleSelectPreset = (preset: AIPreset) => {
    setSelectedPresetId(preset.id);
    if (preset.id !== 'custom') {
      setEndpoint(preset.endpoint);
      setModel(preset.defaultModel);
      setProfileName(`${preset.name} Config`);
    } else {
      if (selectedPresetId !== 'custom') {
        setEndpoint('');
        setModel('');
        setProfileName('Custom API');
      }
    }
    setTestResult(null);
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testKeyConnection(endpoint, apiKey, model);
    setTestResult(res);
    setTesting(false);
  };

  const handleSaveAndContinue = () => {
    const profileId = 'default';
    const profileToSave: KeyProfile = {
      id: profileId,
      name: profileName.trim() || 'Default Config',
      endpoint: endpoint.trim(),
      apiKey: apiKey.trim(),
      model: model.trim(),
    };

    saveActiveProfile(profileToSave);
    if (apiKey.trim() || endpoint.trim()) {
      setKeyConfigured(true);
    }
    setStep(3);
  };

  const handleSkipKeySetup = () => {
    setStep(3);
  };

  const handleOpenAppAndClose = (appId: string) => {
    handleClose();
    setTimeout(() => {
      openWindow(appId);
    }, 150);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.94, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 12 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          style={{
            position: 'absolute',
            top: pos.y,
            left: pos.x,
            width: WINDOW_WIDTH,
            maxWidth: '94vw',
            zIndex: 5000,
          }}
        >
          <div
            className="
              relative flex flex-col rounded-2xl overflow-hidden
              bg-white/90 dark:bg-slate-900/90
              backdrop-blur-2xl
              border border-white/50 dark:border-slate-700/60
              shadow-[0_20px_50px_rgba(0,0,0,0.35)]
              w-full max-h-[88vh]
            "
          >
            {/* Ambient Background Gradient Orbs */}
            <div className="absolute -top-20 -left-20 w-52 h-52 bg-blue-500/20 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-52 h-52 bg-purple-500/20 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-500/10 dark:bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Window Header Bar */}
            <div
              className="
                relative h-10 flex items-center px-4 gap-2 select-none touch-none
                bg-white/40 dark:bg-slate-800/40
                border-b border-black/5 dark:border-white/5
                cursor-grab active:cursor-grabbing shrink-0
              "
              onMouseDown={handleDragStart}
              onTouchStart={handleTouchStart}
            >
              {/* Window Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleClose}
                  onMouseDown={(e) => e.stopPropagation()}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="
                    w-3 h-3 rounded-full flex items-center justify-center
                    bg-red-500/90 hover:bg-red-600
                    transition-colors duration-150
                    group cursor-pointer shadow-sm
                  "
                  aria-label="Close welcome window"
                >
                  <X
                    className="w-[7px] h-[7px] text-red-950 opacity-0 group-hover:opacity-100 transition-opacity"
                    strokeWidth={3.5}
                  />
                </button>
                <div className="w-3 h-3 rounded-full bg-yellow-400/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>

              {/* Title & Progress Stepper */}
              <div className="flex-1 flex items-center justify-center gap-2">
                <span className="text-[11px] font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400">
                  {step === 1 && 'Welcome to MittenOS'}
                  {step === 2 && 'Step 2: AI Engine Setup'}
                  {step === 3 && 'Step 3: Ready to Explore'}
                </span>
              </div>

              {/* Step indicator dots */}
              <div className="flex items-center gap-1 shrink-0">
                {[1, 2, 3].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStep(s as 1 | 2 | 3)}
                    className={`h-1.5 rounded-full transition-all duration-200 cursor-pointer ${
                      step === s
                        ? 'w-4 bg-indigo-600 dark:bg-indigo-400'
                        : step > s
                        ? 'w-1.5 bg-indigo-400/60 dark:bg-indigo-400/40'
                        : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                    }`}
                    title={`Go to step ${s}`}
                  />
                ))}
              </div>
            </div>

            {/* Modal Body with Animated Step Transitions */}
            <div className="p-5 sm:p-6 overflow-y-auto custom-scrollbar flex-1">
              <AnimatePresence mode="wait">
                {/* ─── STEP 1: WELCOME & OVERVIEW ─── */}
                {step === 1 && (
                  <motion.div
                    key="step-1"
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-4 sm:gap-5"
                  >
                    {/* Hero Icon Badge */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 blur-lg opacity-40 animate-pulse" />
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/30 border border-white/20">
                        <Sparkles className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>

                    {/* Title & Subtitle */}
                    <div className="text-center space-y-1 px-2">
                      <h2 className="text-xl sm:text-2xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-white dark:via-slate-100 dark:to-slate-300 bg-clip-text text-transparent">
                        Welcome to MittenOS
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-sm mx-auto">
                        A next-generation local-first web operating system crafted for speed, productivity, and fluid app workflows.
                      </p>
                    </div>

                    {/* Feature Cards Grid */}
                    <div className="w-full grid grid-cols-1 gap-2.5 pt-1">
                      <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-colors group">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 group-hover:scale-105 transition-transform">
                          <Zap className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Orion App Builder
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Generate, test, and run full-stack mini-apps instantly
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-colors group">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-purple-500/10 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400 group-hover:scale-105 transition-transform">
                          <Bot className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            MittenAI Assistant
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Intelligent desktop companion for coding and tasks
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-colors group">
                        <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                          <FolderOpen className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            Local-First File System
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            100% private, offline browser storage with virtual directory structure
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP 2: API KEY SETUP ─── */}
                {step === 2 && (
                  <motion.div
                    key="step-2"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-4"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-3.5 pb-2 border-b border-black/5 dark:border-white/5">
                      <div className="w-11 h-11 shrink-0 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/25 border border-white/20">
                        <Key className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-slate-900 dark:text-white">
                          Configure AI Engine
                        </h2>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Power AI features throughout the entire OS across all applications.
                        </p>
                      </div>
                    </div>
                    {/* Quick Preset Selector */}
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        Choose Provider Preset
                      </label>
                      <div className="grid grid-cols-3 gap-1.5">
                        {AI_PRESETS.map((preset) => {
                          const isSelected = selectedPresetId === preset.id;
                          return (
                            <button
                              key={preset.id}
                              type="button"
                              onClick={() => handleSelectPreset(preset)}
                              className={`
                                flex items-center justify-between px-2.5 py-2 rounded-xl text-left transition-all text-xs font-medium border cursor-pointer
                                ${
                                  isSelected
                                    ? 'bg-amber-500/10 dark:bg-amber-500/20 border-amber-500/40 text-amber-900 dark:text-amber-300 ring-1 ring-amber-500/30'
                                    : 'bg-slate-100/70 dark:bg-slate-800/50 border-slate-200/50 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
                                }
                              `}
                            >
                              <span className="truncate">{preset.name}</span>
                              {isSelected && <Check className="w-3 h-3 text-amber-500 shrink-0 ml-1" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Form Inputs */}
                    <div className="space-y-2.5">
                      {/* Endpoint URL */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Globe className="w-3.5 h-3.5 text-amber-500" />
                          API Endpoint URL
                        </label>
                        <input
                          type="text"
                          value={endpoint}
                          onChange={(e) => setEndpoint(e.target.value)}
                          placeholder="https://api.openai.com/v1"
                          className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono text-slate-800 dark:text-slate-200 transition-all"
                        />
                      </div>

                      {/* API Key */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-amber-500" />
                          API Key
                        </label>
                        <div className="relative">
                          <input
                            type={showKey ? 'text' : 'password'}
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder={AI_PRESETS.find((p) => p.id === selectedPresetId)?.placeholderKey || 'sk-...'}
                            className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono text-slate-800 dark:text-slate-200 pr-9 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                          >
                            {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      {/* Model */}
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-amber-500" />
                          Model Name
                        </label>
                        <input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="gpt-4o"
                          className="w-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 font-mono text-slate-800 dark:text-slate-200 transition-all"
                        />
                      </div>
                    </div>

                    {/* Test Result Alert */}
                    {testResult && (
                      <div
                        className={`p-2.5 rounded-xl border flex gap-2 text-xs items-start ${
                          testResult.success
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                            : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300'
                        }`}
                      >
                        {testResult.success ? (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                        ) : (
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                        )}
                        <span className="leading-tight">{testResult.message}</span>
                      </div>
                    )}

                    {/* Storage Security Callout & Test Button */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                        <span>Stored 100% locally in browser</span>
                      </div>

                      <button
                        type="button"
                        onClick={handleTestKey}
                        disabled={testing}
                        className="
                          px-3 py-1.5 rounded-lg text-xs font-semibold
                          bg-slate-200/80 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700
                          text-slate-800 dark:text-slate-200 transition-colors
                          flex items-center gap-1.5 cursor-pointer disabled:opacity-50
                        "
                      >
                        {testing && <Loader2 className="w-3 h-3 animate-spin" />}
                        Test Connection
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* ─── STEP 3: READY TO EXPLORE ─── */}
                {step === 3 && (
                  <motion.div
                    key="step-3"
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -12 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col items-center gap-4 text-center"
                  >
                    {/* Hero Icon */}
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-emerald-500 to-indigo-600 blur-lg opacity-40 animate-pulse" />
                      <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-emerald-500/25 border border-white/20">
                        <CheckCircle2 className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
                      </div>
                    </div>

                    {/* Title & Setup Summary */}
                    <div className="space-y-1">
                      <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                        You&apos;re All Set!
                      </h2>
                      <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xs mx-auto">
                        MittenOS is primed and ready. Discover powerful built-in apps or jump straight into creation.
                      </p>
                    </div>

                    {/* Status Summary Cards */}
                    <div className="w-full space-y-2">
                      {/* Local Storage Status Card */}
                      <div className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-left flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
                            <HardDrive className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                Local-First Storage
                              </span>
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                100% Offline & Private
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              Files, desktop layout, custom apps, and AI keys are saved directly in your browser.
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* AI Configuration Status Card */}
                      <div className="w-full p-2.5 sm:p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 text-left flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              keyConfigured
                                ? 'bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400'
                                : 'bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400'
                            }`}
                          >
                            <Key className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                {keyConfigured ? 'AI Engine Ready' : 'AI Setup Skipped'}
                              </span>
                              <span
                                className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                                  keyConfigured
                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                                }`}
                              >
                                {keyConfigured ? 'Configured' : 'Optional'}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                              {keyConfigured
                                ? `Model: ${model || 'gpt-4o'} (${profileName || 'Active Profile'})`
                                : 'You can add or update your API keys anytime from the Keys app.'}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setStep(2)}
                          className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline shrink-0 cursor-pointer"
                        >
                          {keyConfigured ? 'Edit' : 'Setup'}
                        </button>
                      </div>
                    </div>

                    {/* Quick Launch Suggestions */}
                    <div className="w-full grid grid-cols-2 gap-2 pt-1 text-left">
                      <button
                        type="button"
                        onClick={() => handleOpenAppAndClose('app-builder')}
                        className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/40 transition-all flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform">
                          <Wand2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                            Orion App Builder
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">Create AI mini-apps</div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleOpenAppAndClose('coding-assistant')}
                        className="p-2.5 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/40 transition-all flex items-center gap-2 group cursor-pointer"
                      >
                        <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:scale-105 transition-transform">
                          <Bot className="w-3.5 h-3.5" />
                        </div>
                        <div className="truncate">
                          <div className="text-[11px] font-semibold text-slate-800 dark:text-slate-200 truncate">
                            MittenAI Assistant
                          </div>
                          <div className="text-[9px] text-slate-400 truncate">Chat & code helper</div>
                        </div>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Modal Footer Controls */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 bg-slate-100/60 dark:bg-slate-800/50 border-t border-black/5 dark:border-white/5 shrink-0">
              {/* Step 1 Footer */}
              {step === 1 && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="dont-show-again-1"
                      checked={dontShowAgain}
                      onCheckedChange={setDontShowAgain}
                    />
                    <label
                      htmlFor="dont-show-again-1"
                      className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none font-medium"
                    >
                      Don&apos;t show again
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="
                      inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                      bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                      hover:from-blue-500 hover:to-purple-500
                      text-white shadow-md shadow-indigo-500/25
                      active:scale-[0.98] transition-all duration-150
                      cursor-pointer
                    "
                  >
                    <span>Get Started</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Step 2 Footer */}
              {step === 2 && (
                <>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="
                      inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold
                      text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white
                      hover:bg-slate-200/50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer
                    "
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSkipKeySetup}
                      className="
                        px-3 py-1.5 rounded-xl text-xs font-semibold
                        text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200
                        transition-colors cursor-pointer
                      "
                    >
                      Skip for now
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveAndContinue}
                      className="
                        inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold
                        bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500
                        text-white shadow-md shadow-amber-500/25
                        active:scale-[0.98] transition-all duration-150
                        cursor-pointer
                      "
                    >
                      <span>Save & Continue</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}

              {/* Step 3 Footer */}
              {step === 3 && (
                <>
                  <div className="flex items-center gap-2">
                    <Switch
                      id="dont-show-again-3"
                      checked={dontShowAgain}
                      onCheckedChange={setDontShowAgain}
                    />
                    <label
                      htmlFor="dont-show-again-3"
                      className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none font-medium"
                    >
                      Don&apos;t show again
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={handleClose}
                    className="
                      inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold
                      bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600
                      hover:from-blue-500 hover:to-purple-500
                      text-white shadow-md shadow-indigo-500/25
                      active:scale-[0.98] transition-all duration-150
                      cursor-pointer
                    "
                  >
                    <span>Launch MittenOS</span>
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WelcomeWindow;
