'use client';

import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderPlus,
  FilePlus,
  Palette,
  Monitor,
  RefreshCw,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { type ContextMenuState, type ContextMenuItem } from '@/stores/desktop-store';

// Map icon string names to Lucide components for context menu items
const CONTEXT_ICON_MAP: Record<string, LucideIcon> = {
  FolderPlus,
  FilePlus,
  Palette,
  Monitor,
  RefreshCw,
  Info,
};

interface ContextMenuProps {
  contextMenu: ContextMenuState;
  onClose: () => void;
}

export function ContextMenu({ contextMenu, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Adjust position if menu would go off-screen
  useEffect(() => {
    if (!menuRef.current) return;

    const rect = menuRef.current.getBoundingClientRect();
    const { innerWidth, innerHeight } = window;

    let { x, y } = contextMenu;

    if (x + rect.width > innerWidth) {
      x = innerWidth - rect.width - 8;
    }
    if (y + rect.height > innerHeight) {
      y = innerHeight - rect.height - 8;
    }

    menuRef.current.style.left = `${x}px`;
    menuRef.current.style.top = `${y}px`;
  }, [contextMenu]);

  // Close on click outside or escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Delay adding listener to prevent immediate close from the right-click that opened it
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleItemClick = (item: ContextMenuItem) => {
    if (item.disabled) return;
    item.action();
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.92, transformOrigin: 'top left' }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.15, ease: 'easeOut' }}
        className="fixed z-[10000] min-w-[200px] py-1.5 rounded-xl shadow-2xl border border-white/[0.12]"
        style={{
          left: contextMenu.x,
          top: contextMenu.y,
          background: 'rgba(30, 30, 40, 0.82)',
          backdropFilter: 'blur(24px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.4)',
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {contextMenu.items.map((item, index) => {
          // Render separator
          if (item.separator) {
            return (
              <div
                key={`separator-${index}`}
                className="my-1.5 mx-3 h-px bg-white/[0.08]"
              />
            );
          }

          const IconComp = item.icon ? CONTEXT_ICON_MAP[item.icon] : null;

          return (
            <button
              key={`item-${index}`}
              className={`
                w-full flex items-center gap-3 px-3 py-2 text-left
                text-[13px] transition-colors duration-100
                ${item.disabled
                  ? 'text-white/30 cursor-not-allowed'
                  : 'text-white/80 hover:bg-white/[0.08] hover:text-white cursor-pointer'
                }
              `}
              onClick={() => handleItemClick(item)}
              disabled={item.disabled}
            >
              {IconComp && (
                <IconComp className="w-4 h-4 shrink-0 text-white/60" strokeWidth={1.5} />
              )}
              {!IconComp && item.icon && (
                <span className="w-4 h-4 shrink-0" />
              )}
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="text-[11px] text-white/30 ml-4">{item.shortcut}</span>
              )}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
