'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Zap, Bot, FolderOpen, ArrowRight } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface WelcomeWindowProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const WINDOW_WIDTH = 440;
const TASKBAR_HEIGHT = 48;

const getInitialPos = () => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  const effectiveWidth = Math.min(WINDOW_WIDTH, window.innerWidth * 0.92);
  const availableHeight = window.innerHeight - TASKBAR_HEIGHT;
  return {
    x: Math.max(0, (window.innerWidth - effectiveWidth) / 2),
    y: Math.max(0, (availableHeight - 440) / 2),
  };
};

export function WelcomeWindow({ open, onClose }: WelcomeWindowProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [hasBeenDragged, setHasBeenDragged] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(getInitialPos);
  const posRef = useRef(pos);

  const updatePosState = useCallback((newPos: { x: number; y: number }) => {
    posRef.current = newPos;
    setPos(newPos);
  }, []);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const el = modalRef.current;
    const modalWidth = el?.offsetWidth || Math.min(WINDOW_WIDTH, window.innerWidth * 0.92);
    const modalHeight = el?.offsetHeight || 440;

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
            maxWidth: '92vw',
            zIndex: 5000,
          }}
        >
          <div
            className="
              relative flex flex-col rounded-2xl overflow-hidden
              bg-white/85 dark:bg-slate-900/85
              backdrop-blur-2xl
              border border-white/50 dark:border-slate-700/60
              shadow-[0_20px_50px_rgba(0,0,0,0.3)]
              w-full max-h-[85vh]
            "
          >
            {/* Ambient Background Gradient Orbs */}
            <div className="absolute -top-20 -left-20 w-48 h-48 bg-blue-500/20 dark:bg-blue-500/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-20 -right-20 w-48 h-48 bg-purple-500/20 dark:bg-purple-500/15 rounded-full blur-3xl pointer-events-none" />

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

              <span className="text-[11px] font-semibold tracking-wide uppercase truncate flex-1 text-center text-slate-500 dark:text-slate-400">
                Welcome to MittenOS
              </span>

              <div className="w-[52px] shrink-0" />
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-6 flex flex-col items-center gap-4 sm:gap-5 overflow-y-auto custom-scrollbar">
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
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed max-w-xs mx-auto">
                  A next-generation web operating system crafted for speed, productivity, and fluid app workflows.
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
                      Build, test, and run mini-apps instantly
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
                      Intelligent assistant for desktop tasks
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-2.5 sm:p-3 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/50 dark:border-slate-700/50 hover:border-indigo-500/40 dark:hover:border-indigo-500/40 transition-colors group">
                  <div className="p-2 sm:p-2.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                    <FolderOpen className="w-4 h-4" />
                  </div>
                  <div className="flex flex-col text-left">
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      File & Workspaces
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Organize files, terminal, & preferences
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-3.5 bg-slate-100/50 dark:bg-slate-800/40 border-t border-black/5 dark:border-white/5 shrink-0">
              <div className="flex items-center gap-2">
                <Switch
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onCheckedChange={setDontShowAgain}
                />
                <label
                  htmlFor="dont-show-again"
                  className="text-xs text-slate-600 dark:text-slate-300 cursor-pointer select-none font-medium"
                >
                  Don&apos;t show again
                </label>
              </div>
              <button
                onClick={handleClose}
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
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WelcomeWindow;
