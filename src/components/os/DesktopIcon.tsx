'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDesktopStore } from '@/stores/desktop-store';
import { FileText } from 'lucide-react';
import { ICON_MAP } from '@/lib/icon-map';
import { DESKTOP_GRID_CELL, DESKTOP_GRID_OFFSET_X, DESKTOP_GRID_OFFSET_Y, DRAG_THRESHOLD, type WindowPosition } from '@/types/os';





interface DesktopIconProps {
  icon: string;
  label: string;
  onDoubleClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent) => void;
  selected: boolean;
  isDragging?: boolean;
  darkBg: boolean;
  position: WindowPosition;
  iconId: string;
  isRenaming?: boolean;
  onRenameComplete?: (newLabel: string) => void;
  onRenameCancel?: () => void;
}

export function DesktopIcon({
  icon,
  label,
  onDoubleClick,
  onMouseDown,
  onContextMenu,
  selected,
  isDragging = false,
  darkBg,
  position,
  iconId,
  isRenaming = false,
  onRenameComplete,
  onRenameCancel,
}: DesktopIconProps) {
  const iconSize = useDesktopStore((s) => s.iconSize) || 'medium';

  const gridCellSize = {
    small: 72,
    medium: 84,
    large: 96,
  }[iconSize];

  const snapToGrid = useCallback((pos: WindowPosition): WindowPosition => {
    return {
      x: Math.round((pos.x - DESKTOP_GRID_OFFSET_X) / gridCellSize) * gridCellSize + DESKTOP_GRID_OFFSET_X,
      y: Math.round((pos.y - DESKTOP_GRID_OFFSET_Y) / gridCellSize) * gridCellSize + DESKTOP_GRID_OFFSET_Y,
    };
  }, [gridCellSize]);

  const sizeStyles = {
    small: {
      container: 'w-16 h-16',
      iconWrapper: 'w-8 h-8 mb-0.5',
      iconSize: 'w-6 h-6',
      labelSize: 'text-[10px] max-w-[60px]',
    },
    medium: {
      container: 'w-20 h-20',
      iconWrapper: 'w-10 h-10 mb-1',
      iconSize: 'w-8 h-8',
      labelSize: 'text-[11px] max-w-[72px]',
    },
    large: {
      container: 'w-24 h-24',
      iconWrapper: 'w-12 h-12 mb-1.5',
      iconSize: 'w-10 h-10',
      labelSize: 'text-[12px] max-w-[88px]',
    },
  }[iconSize];

  const [hovered, setHovered] = useState(false);
  const [tempLabel, setTempLabel] = useState(label);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isRenaming) {
      setTempLabel(label);
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 50);
    }
  }, [isRenaming, label]);

  const handleComplete = () => {
    const trimmed = tempLabel.trim();
    if (trimmed && trimmed !== label) {
      onRenameComplete?.(trimmed);
    } else {
      onRenameCancel?.();
    }
  };

  const handleCancel = () => {
    onRenameCancel?.();
  };

  const IconComponent = ICON_MAP[icon] || FileText;

  const iconColor = darkBg ? 'text-white' : 'text-black';
  const iconFilter = darkBg
    ? '[filter:drop-shadow(0_0_4px_rgba(0,0,0,0.7))_drop-shadow(0_0_8px_rgba(0,0,0,0.4))]'
    : '[filter:drop-shadow(0_0_4px_rgba(255,255,255,0.8))_drop-shadow(0_0_8px_rgba(255,255,255,0.4))]';
  const labelShadow = darkBg
    ? '[text-shadow:0_0_4px_rgba(0,0,0,0.8),0_0_8px_rgba(0,0,0,0.5)]'
    : '[text-shadow:0_0_4px_rgba(255,255,255,0.9),0_0_8px_rgba(255,255,255,0.6)]';
  const labelColor = darkBg
    ? selected ? 'text-white font-medium' : 'text-white/90'
    : selected ? 'text-black font-medium' : 'text-black/90';
  const selBg = darkBg ? 'bg-white/15 ring-1 ring-white/20' : 'bg-black/10 ring-1 ring-black/10';
  const hovBg = darkBg ? 'bg-white/10' : 'bg-black/5';

  return (
    <div
      className="absolute"
      style={{ left: position.x, top: position.y, zIndex: isDragging || isRenaming ? 9999 : 'auto' }}
      onContextMenu={onContextMenu}
    >
      <div
        className={`
          flex flex-col items-center justify-center
          ${sizeStyles.container} rounded-lg cursor-pointer select-none
          transition-colors duration-150
          ${selected ? selBg : hovered ? hovBg : ''}
          ${isDragging ? 'opacity-70 scale-105' : ''}
        `}
        onMouseDown={isRenaming ? undefined : onMouseDown}
        onDoubleClick={(e) => {
          if (isRenaming) return;
          e.stopPropagation();
          onDoubleClick();
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className={`flex items-center justify-center ${sizeStyles.iconWrapper}`}>
          <IconComponent
            className={`${sizeStyles.iconSize} ${iconColor} ${iconFilter} drop-shadow-lg`}
            strokeWidth={1.5}
          />
        </div>
        {isRenaming ? (
          <input
            ref={inputRef}
            type="text"
            value={tempLabel}
            onChange={(e) => setTempLabel(e.target.value)}
            onBlur={handleComplete}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter') handleComplete();
              if (e.key === 'Escape') handleCancel();
            }}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            className="w-full text-center bg-black/60 text-white rounded px-1 py-0.5 border border-blue-500 outline-none text-[11px] font-normal z-50 select-text cursor-text"
          />
        ) : (
          <span
            className={`
              ${sizeStyles.labelSize} text-center leading-tight truncate
              px-1 ${labelShadow}
              ${labelColor}
            `}
          >
            {label}
          </span>
        )}
      </div>
    </div>
  );
}

