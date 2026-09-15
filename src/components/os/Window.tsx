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

const WINDOW_GEOMETRY_TRANSITION = 'width 280ms cubic-bezier(0.22, 1, 0.36, 1), height 280ms cubic-bezier(0.22, 1, 0.36, 1), left 280ms cubic-bezier(0.22, 1, 0.36, 1), top 280ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 280ms cubic-bezier(0.22, 1, 0.36, 1)';
const WINDOW_MOTION_TRANSITION = { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const };
const WINDOW_MINIMIZE_TRANSITION = { duration: 0.34, ease: [0.32, 0.72, 0, 1] as const };

interface WindowControlsProps {
  onMinimize?: () => void;
  onMaximize?: () => void;
  onClose: () => void;
  isMaximized?: boolean;
  className?: string;
  closeLabel?: string;
}

export function WindowControls({
  onMinimize,
  onMaximize,
  onClose,
  isMaximized = false,
  className = '',
  closeLabel = 'Close window',
}: WindowControlsProps) {
  return (
    <div
      className={`flex items-center gap-1.5 shrink-0 ${className}`}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        onClick={onMinimize}
        disabled={!onMinimize}
        className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200/80 text-gray-700 shadow-inner transition-colors duration-150 hover:bg-gray-300 active:bg-gray-400/80 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:active:bg-white/25 disabled:pointer-events-none disabled:opacity-50"
        aria-label="Minimize window"
        aria-disabled={!onMinimize}
      >
        <Minus className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>

      <button
        type="button"
        onClick={onMaximize}
        disabled={!onMaximize}
        className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200/80 text-gray-700 shadow-inner transition-colors duration-150 hover:bg-gray-300 active:bg-gray-400/80 dark:bg-white/10 dark:text-gray-200 dark:hover:bg-white/20 dark:active:bg-white/25 disabled:pointer-events-none disabled:opacity-50"
        aria-label={isMaximized ? 'Restore window' : 'Maximize window'}
        aria-disabled={!onMaximize}
      >
        {isMaximized ? (
          <Copy className="w-3 h-3" strokeWidth={2.25} />
        ) : (
          <Square className="w-3 h-3" strokeWidth={2.25} />
        )}
      </button>

      <button
        type="button"
        onClick={onClose}
        className="w-6 h-6 rounded-full flex items-center justify-center bg-gray-200/80 text-gray-700 shadow-inner transition-colors duration-150 hover:bg-[#e95420] hover:text-white active:bg-[#c34113] dark:bg-white/10 dark:text-gray-200 dark:hover:bg-[#e95420] dark:hover:text-white dark:active:bg-[#c34113]"
        aria-label={closeLabel}
      >
        <X className="w-3.5 h-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

export function Window({ window: win, children, isActive }: WindowProps) {
  const {
    closeWindow,
    minimizeWindow,
    focusWindow,
    toggleMaximize,
    updateWindowPosition,
    updateWindowSize,
    unmaximizeWindow,
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
  const [isMaximizing, setIsMaximizing] = useState(false);
  const [isUnmaximizing, setIsUnmaximizing] = useState(false);
  const maximizingTimeoutRef = useRef<any>(null);
  const unmaximizeTimeoutRef = useRef<any>(null);

  // Refs to always have the latest position/size available in mouseup
  // without reading them from setState callbacks (which run during render).
  const livePosRef = useRef({ x: 0, y: 0 });
  const liveSizeRef = useRef({ width: 0, height: 0 });

  const isMaximized = win.state === 'maximized';
  const isMinimized = win.state === 'minimized';

  const prevIsMaximizedRef = useRef(isMaximized);

  React.useEffect(() => {
    if (isMaximized !== prevIsMaximizedRef.current) {
      if (isMaximized) {
        setIsMaximizing(true);
        if (maximizingTimeoutRef.current) {
          clearTimeout(maximizingTimeoutRef.current);
        }
        maximizingTimeoutRef.current = setTimeout(() => {
          setIsMaximizing(false);
        }, 280);
      } else {
        if (!isInteracting) {
          setIsUnmaximizing(true);
          if (unmaximizeTimeoutRef.current) {
            clearTimeout(unmaximizeTimeoutRef.current);
          }
          unmaximizeTimeoutRef.current = setTimeout(() => {
            setIsUnmaximizing(false);
          }, 280);
        }
      }
      prevIsMaximizedRef.current = isMaximized;
    }
  }, [isMaximized, isInteracting]);

  React.useEffect(() => {
    return () => {
      if (maximizingTimeoutRef.current) {
        clearTimeout(maximizingTimeoutRef.current);
      }
      if (unmaximizeTimeoutRef.current) {
        clearTimeout(unmaximizeTimeoutRef.current);
      }
    };
  }, []);

  // Computed position: use live values during interaction, store values otherwise
  const currentPos = isInteracting ? livePos : win.position;
  const currentSize = isInteracting ? liveSize : win.size;

  // --- DRAG HANDLERS ---
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();

      focusWindow(win.id);

      const startX = e.clientX;
      const startY = e.clientY;

      let dragStarted = !isMaximized;
      let originX = win.position.x;
      let originY = win.position.y;

      if (!isMaximized) {
        const startPos = { x: win.position.x, y: win.position.y };
        const startSize = { width: win.size.width, height: win.size.height };

        setIsInteracting(true);
        setLivePos(startPos);
        setLiveSize(startSize);
        livePosRef.current = startPos;
        liveSizeRef.current = startSize;
      }

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!dragStarted) {
          if (Math.hypot(dx, dy) < 6) return;

          dragStarted = true;
          const restoreW = win.preMaximizeSize?.width ?? win.size.width;
          const restoreH = win.preMaximizeSize?.height ?? win.size.height;
          const clickRatio = startX / window.innerWidth;
          originX = startX - restoreW * clickRatio;
          originY = Math.max(0, startY - 18);

          unmaximizeWindow(win.id);
          setIsInteracting(true);
          setIsUnmaximizing(true);
          if (unmaximizeTimeoutRef.current) {
            clearTimeout(unmaximizeTimeoutRef.current);
          }
          unmaximizeTimeoutRef.current = setTimeout(() => {
            setIsUnmaximizing(false);
          }, 280);

          const initialPos = { x: originX, y: originY };
          const initialSize = { width: restoreW, height: restoreH };
          setLivePos(initialPos);
          setLiveSize(initialSize);
          livePosRef.current = initialPos;
          liveSizeRef.current = initialSize;
        }

        const newPos = {
          x: originX + dx,
          y: Math.max(0, originY + dy),
        };
        setLivePos(newPos);
        livePosRef.current = newPos;
      };

      const handleUp = () => {
        if (dragStarted) {
          updateWindowPosition(win.id, livePosRef.current);
          setIsInteracting(false);
        }
        setIsUnmaximizing(false);
        if (unmaximizeTimeoutRef.current) {
          clearTimeout(unmaximizeTimeoutRef.current);
          unmaximizeTimeoutRef.current = null;
        }
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [
      win.id,
      win.position.x,
      win.position.y,
      win.size.width,
      win.size.height,
      win.preMaximizePosition,
      win.preMaximizeSize,
      isMaximized,
      focusWindow,
      unmaximizeWindow,
      updateWindowPosition,
    ]
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

  const handleToggleMaximize = useCallback(() => {
    if (isMaximized) {
      setIsUnmaximizing(true);
      if (unmaximizeTimeoutRef.current) {
        clearTimeout(unmaximizeTimeoutRef.current);
      }
      unmaximizeTimeoutRef.current = setTimeout(() => {
        setIsUnmaximizing(false);
      }, 280);
    } else {
      setIsMaximizing(true);
      if (maximizingTimeoutRef.current) {
        clearTimeout(maximizingTimeoutRef.current);
      }
      maximizingTimeoutRef.current = setTimeout(() => {
        setIsMaximizing(false);
      }, 280);
    }

    toggleMaximize(win.id);
  }, [isMaximized, win.id, toggleMaximize]);

  // --- DOUBLE-CLICK TITLE BAR ---
  const handleTitleBarDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      handleToggleMaximize();
    },
    [handleToggleMaximize]
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
        ...(isMaximizing ? { transition: WINDOW_GEOMETRY_TRANSITION } : {}),
      }
    : {
        position: 'absolute',
        top: currentPos.y,
        left: currentPos.x,
        width: currentSize.width,
        height: currentSize.height,
        zIndex: win.zIndex,
        ...((isMaximizing || isUnmaximizing) && !isInteracting
          ? { transition: WINDOW_GEOMETRY_TRANSITION }
          : {}),
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
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={
            isMinimizing
              ? WINDOW_MINIMIZE_TRANSITION
              : isMinimized
                ? { duration: 0 }
                : WINDOW_MOTION_TRANSITION
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
            ${isMaximized ? 'rounded-none' : 'rounded-lg'}
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

            <WindowControls
              onMinimize={handleMinimize}
              onMaximize={handleToggleMaximize}
              onClose={handleClose}
              isMaximized={isMaximized}
            />


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
