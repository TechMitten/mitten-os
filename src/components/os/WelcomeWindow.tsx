'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface WelcomeWindowProps {
  open: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const WINDOW_WIDTH = 420;
const TASKBAR_HEIGHT = 48;

const getInitialPos = () => {
  if (typeof window === 'undefined') return { x: 0, y: 0 };
  return {
    x: Math.max(0, (window.innerWidth - WINDOW_WIDTH) / 2),
    y: Math.max(0, (window.innerHeight - 300) / 2 - TASKBAR_HEIGHT),
  };
};

export function WelcomeWindow({ open, onClose }: WelcomeWindowProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const [pos, setPos] = useState(getInitialPos);
  const posRef = useRef(pos);

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
        setPos(newPos);
        posRef.current = newPos;
      };

      const handleUp = () => {
        setIsDragging(false);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    []
  );

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            position: 'absolute',
            top: pos.y,
            left: pos.x,
            width: WINDOW_WIDTH,
            maxWidth: '90vw',
            zIndex: 5000,
          }}
        >
          <div
            className="
              flex flex-col rounded-lg overflow-hidden
              bg-white/90 dark:bg-gray-800/90
              backdrop-blur-2xl
              border border-white/40 dark:border-white/25
              shadow-2xl
              w-full
            "
          >
            <div
              className="
                h-9 flex items-center px-3 gap-2 select-none
                bg-white/50 dark:bg-white/[0.07]
                border-b border-black/5 dark:border-white/5
                cursor-grab active:cursor-grabbing
              "
              onMouseDown={handleDragStart}
            >
              <div className="w-[52px] shrink-0" />

              <span className="text-xs font-medium truncate flex-1 text-center text-gray-800 dark:text-gray-200">
                Welcome to MittenOS
              </span>

              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <button
                  onClick={handleClose}
                  onMouseDown={(e) => e.stopPropagation()}
                  className="
                    w-3 h-3 rounded-full flex items-center justify-center
                    bg-red-500 hover:bg-red-600
                    transition-colors duration-150
                    group cursor-pointer
                  "
                  aria-label="Close welcome window"
                >
                  <X
                    className="w-[7px] h-[7px] text-red-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    strokeWidth={3}
                  />
                </button>
              </div>
            </div>

            <div className="p-6 flex flex-col items-center gap-4">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                Welcome to MittenOS
              </h2>
              <p className="text-sm text-center text-gray-500 dark:text-gray-300 leading-relaxed">
                Your personal browser-based operating system. Explore apps,
                manage files, and customize your desktop experience.
              </p>
            </div>

            <div className="flex items-center justify-between px-6 py-3 border-t border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2">
                <Switch
                  id="dont-show-again"
                  checked={dontShowAgain}
                  onCheckedChange={setDontShowAgain}
                />
                <label
                  htmlFor="dont-show-again"
                  className="text-xs text-gray-500 dark:text-gray-300 cursor-pointer select-none"
                >
                  Don&apos;t show again
                </label>
              </div>
              <button
                onClick={handleClose}
                className="
                  px-3 py-1.5 rounded-md text-xs font-medium
                  bg-gray-100 dark:bg-white/[0.12]
                  text-gray-600 dark:text-gray-200
                  hover:bg-gray-200 dark:hover:bg-white/[0.18]
                  transition-colors duration-150
                  cursor-pointer
                "
              >
                Get Started
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default WelcomeWindow;
