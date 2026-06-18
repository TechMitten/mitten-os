'use client';

import React, { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Square, Copy } from 'lucide-react';
import { useWindowStore } from '@/stores/window-store';
import type { OSWindow } from '@/types/os';

interface WindowProps {
  window: OSWindow;
  children: React.ReactNode;
  isActive: boolean;
}

type ResizeDirection = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

export function Window({ window: win, children, isActive }: WindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMaximize,
    updateWindowPosition,
    updateWindowSize,
  } = useWindowStore();

  // Track whether we're actively dragging/resizing
  const [isInteracting, setIsInteracting] = useState(false);

  // Live position/size overrides during drag/resize
  const [livePos, setLivePos] = useState({ x: 0, y: 0 });
  const [liveSize, setLiveSize] = useState({ width: 0, height: 0 });
  const [isClosing, setIsClosing] = useState(false);
  const [isMinimizing, setIsMinimizing] = useState(false);
  const isMinimizingRef = useRef(false);
  const [minimizeTarget, setMinimizeTarget] = useState({ x: 0, y: 0, scale: 0.15 });
  const windowRef = useRef<HTMLDivElement>(null);

  // Refs to always have the latest position/size available in mouseup
  // without reading them from setState callbacks (which run during render).
  const livePosRef = useRef({ x: 0, y: 0 });
  const liveSizeRef = useRef({ width: 0, height: 0 });

  const isMaximized = win.state === 'maximized';
  const isMinimized = win.state === 'minimized';

  // Computed position: use live values during interaction, store values otherwise
  const currentPos = isInteracting ? livePos : win.position;
  const currentSize = isInteracting ? liveSize : win.size;

  // --- DRAG HANDLERS ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (isMaximized || e.button !== 0) return;
      e.preventDefault();

      focusWindow(win.id);

      const startPos = { x: win.position.x, y: win.position.y };
      const startSize = { width: win.size.width, height: win.size.height };

      setIsInteracting(true);
      setLivePos(startPos);
      setLiveSize(startSize);
      livePosRef.current = startPos;
      liveSizeRef.current = startSize;

      const startX = e.clientX;
      const startY = e.clientY;
      const originX = win.position.x;
      const originY = win.position.y;

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;
        const newPos = {
          x: originX + dx,
          y: Math.max(0, originY + dy),
        };
        setLivePos(newPos);
        livePosRef.current = newPos;
      };

      const handleUp = () => {
        // Read the final position from the ref and commit to the store directly.
        // Do NOT call store updates inside a setState callback — that triggers
        // "Cannot update a component while rendering a different component".
        updateWindowPosition(win.id, livePosRef.current);
        setIsInteracting(false);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [win.id, win.position.x, win.position.y, win.size.width, win.size.height, isMaximized, focusWindow, updateWindowPosition]
  );

  // --- RESIZE HANDLERS ---
  const handleResizeStart = useCallback(
    (direction: ResizeDirection) => (e: React.MouseEvent) => {
      if (isMaximized || e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();

      focusWindow(win.id);

      const startPos = { x: win.position.x, y: win.position.y };
      const startSize = { width: win.size.width, height: win.size.height };

      setIsInteracting(true);
      setLivePos(startPos);
      setLiveSize(startSize);
      livePosRef.current = startPos;
      liveSizeRef.current = startSize;

      const startX = e.clientX;
      const startY = e.clientY;
      const originX = win.position.x;
      const originY = win.position.y;
      const originW = win.size.width;
      const originH = win.size.height;

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        let newX = originX;
        let newY = originY;
        let newW = originW;
        let newH = originH;

        if (direction.includes('e')) newW = originW + dx;
        if (direction.includes('w')) {
          newW = originW - dx;
          newX = originX + dx;
        }
        if (direction.includes('s')) newH = originH + dy;
        if (direction.includes('n')) {
          newH = originH - dy;
          newY = originY + dy;
        }

        // Enforce minimum size
        if (newW < win.minSize.width) {
          if (direction.includes('w')) {
            newX = originX + (originW - win.minSize.width);
          }
          newW = win.minSize.width;
        }
        if (newH < win.minSize.height) {
          if (direction.includes('n')) {
            newY = originY + (originH - win.minSize.height);
          }
          newH = win.minSize.height;
        }

        if (newY < 0) {
          newH = originH + originY;
          newY = 0;
        }

        const newPos = { x: newX, y: newY };
        const newSize = { width: newW, height: newH };
        setLivePos(newPos);
        setLiveSize(newSize);
        livePosRef.current = newPos;
        liveSizeRef.current = newSize;
      };

      const handleUp = () => {
        // Read the final values from refs and commit to the store directly.
        updateWindowPosition(win.id, livePosRef.current);
        updateWindowSize(win.id, liveSizeRef.current);
        setIsInteracting(false);
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      win.id, win.position.x, win.position.y, win.size.width, win.size.height,
      win.minSize, isMaximized, focusWindow, updateWindowPosition, updateWindowSize,
    ]
  );

  // --- DOUBLE-CLICK TITLE BAR ---
  const handleTitleBarDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      toggleMaximize(win.id);
    },
    [win.id, toggleMaximize]
  );

  // --- CLOSE WITH ANIMATION ---
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => closeWindow(win.id), 200);
  }, [win.id, closeWindow]);

  // --- MINIMIZE WITH ANIMATION ---
  const handleMinimize = useCallback(() => {
    const icon = document.querySelector(`[data-taskbar-app="${win.appId}"]`);
    const winEl = windowRef.current;

    if (icon && winEl) {
      const iconRect = icon.getBoundingClientRect();
      const winRect = winEl.getBoundingClientRect();

      const winCenterX = winRect.left + winRect.width / 2;
      const winCenterY = winRect.top + winRect.height / 2;
      const iconCenterX = iconRect.left + iconRect.width / 2;
      const iconCenterY = iconRect.top + iconRect.height / 2;

      setMinimizeTarget({
        x: iconCenterX - winCenterX,
        y: iconCenterY - winCenterY,
        scale: Math.max(iconRect.width / winRect.width, 0.08),
      });
    }

    isMinimizingRef.current = true;
    setIsMinimizing(true);
  }, [win.appId]);

  // --- BRING TO FRONT ---
  const handleWindowMouseDown = useCallback(() => {
    if (!isActive) focusWindow(win.id);
  }, [isActive, win.id, focusWindow]);

  // --- COMPUTE STYLES ---
  const windowStyle: React.CSSProperties = isMaximized
    ? {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100vh - 48px)',
        zIndex: win.zIndex,
      }
    : {
        position: 'absolute',
        top: currentPos.y,
        left: currentPos.x,
        width: currentSize.width,
        height: currentSize.height,
        zIndex: win.zIndex,
      };

  // --- RESIZE HANDLES CONFIG ---
  const resizeHandles: { direction: ResizeDirection; className: string }[] = [
    { direction: 'n', className: 'absolute top-0 left-3 right-3 h-1 cursor-n-resize' },
    { direction: 's', className: 'absolute bottom-0 left-3 right-3 h-1 cursor-s-resize' },
    { direction: 'e', className: 'absolute top-3 right-0 bottom-3 w-1 cursor-e-resize' },
    { direction: 'w', className: 'absolute top-3 left-0 bottom-3 w-1 cursor-w-resize' },
    { direction: 'ne', className: 'absolute top-0 right-0 w-4 h-4 cursor-ne-resize' },
    { direction: 'nw', className: 'absolute top-0 left-0 w-4 h-4 cursor-nw-resize' },
    { direction: 'se', className: 'absolute bottom-0 right-0 w-4 h-4 cursor-se-resize' },
    { direction: 'sw', className: 'absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize' },
  ];

  return (
    <AnimatePresence>
      {!isClosing && (
        <motion.div
          ref={windowRef}
          initial={{ opacity: 0, scale: 0.92, y: 10 }}
          animate={
            isMinimizing
              ? {
                  opacity: 0,
                  x: minimizeTarget.x,
                  y: minimizeTarget.y,
                  scale: minimizeTarget.scale,
                }
              : isMinimized
                ? { opacity: 0, x: 0, y: 0, scale: 1 }
                : { opacity: 1, x: 0, y: 0, scale: 1 }
          }
          exit={{ opacity: 0, scale: 0.92, y: 10 }}
          transition={
            isMinimizing
              ? { duration: 0.3, ease: [0.4, 0, 1, 1] }
              : isMinimized
                ? { duration: 0 }
                : { duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }
          }
          onAnimationComplete={() => {
            if (isMinimizingRef.current) {
              minimizeWindow(win.id);
              setIsMinimizing(false);
              isMinimizingRef.current = false;
            }
          }}
          style={{
            ...windowStyle,
            ...(isMinimized ? { pointerEvents: 'none' as const } : {}),
          }}
          className={`
            flex flex-col
            ${isMaximized ? '' : 'rounded-lg'}
            overflow-hidden
            bg-white/80 dark:bg-gray-900/80
            backdrop-blur-xl
            border
            ${isActive ? 'border-white/30 dark:border-white/20' : 'border-white/10 dark:border-white/10'}
            shadow-2xl
            transition-[border-color] duration-200
          `}
          onMouseDown={handleWindowMouseDown}
        >
          {/* Title Bar */}
          <div
            className={`
              h-9 flex items-center px-3 gap-2 cursor-default select-none
              ${isActive
                ? 'bg-white/40 dark:bg-white/5'
                : 'bg-white/20 dark:bg-white/[0.02]'
              }
              border-b border-black/5 dark:border-white/5
              transition-colors duration-200
            `}
            onMouseDown={handleDragStart}
            onDoubleClick={handleTitleBarDoubleClick}
          >
            {/* Spacer to visually balance the control buttons */}
            <div className="w-[52px] shrink-0" />

            {/* Title Text */}
            <span
              className={`
                text-xs font-medium truncate flex-1 text-center
                ${isActive ? 'text-gray-800 dark:text-gray-200' : 'text-gray-500 dark:text-gray-500'}
                transition-colors duration-200
              `}
            >
              {win.title}
            </span>

            {/* macOS-style Window Control Buttons */}
            <div
              className="flex items-center gap-1.5 ml-2 shrink-0"
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Minimize - Orange */}
              <button
                onClick={handleMinimize}
                className="
                  w-3 h-3 rounded-full flex items-center justify-center
                  bg-orange-500 hover:bg-orange-600
                  transition-colors duration-150
                  group
                "
                aria-label="Minimize window"
              >
                <Minus
                  className="w-[7px] h-[7px] text-orange-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  strokeWidth={3}
                />
              </button>

              {/* Maximize/Restore - Green */}
              <button
                onClick={() => toggleMaximize(win.id)}
                className="
                  w-3 h-3 rounded-full flex items-center justify-center
                  bg-green-500 hover:bg-green-600
                  transition-colors duration-150
                  group
                "
                aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
              >
                {isMaximized ? (
                  <Copy
                    className="w-[7px] h-[7px] text-green-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    strokeWidth={2.5}
                  />
                ) : (
                  <Square
                    className="w-[6px] h-[6px] text-green-900 opacity-0 group-hover:opacity-100 transition-opacity"
                    strokeWidth={2.5}
                  />
                )}
              </button>

              {/* Close - Red */}
              <button
                onClick={handleClose}
                className="
                  w-3 h-3 rounded-full flex items-center justify-center
                  bg-red-500 hover:bg-red-600
                  transition-colors duration-150
                  group
                "
                aria-label="Close window"
              >
                <X
                  className="w-[7px] h-[7px] text-red-900 opacity-0 group-hover:opacity-100 transition-opacity"
                  strokeWidth={3}
                />
              </button>
            </div>


          </div>

          {/* Window Content Area */}
          <div className="flex-1 overflow-hidden">
            {children}
          </div>

          {/* Resize Handles - only visible when not maximized */}
          {!isMaximized &&
            resizeHandles.map(({ direction, className }) => (
              <div
                key={direction}
                className={`${className} z-50 hover:bg-blue-400/20 transition-colors duration-75`}
                onMouseDown={handleResizeStart(direction)}
              />
            ))}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Window;
