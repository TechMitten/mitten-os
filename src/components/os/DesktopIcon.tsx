'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FolderOpen,
  TerminalSquare,
  Globe,
  FileText,
  Settings,
  Calculator,
  Image,
  Store,
  CloudSun,
  Info,
  type LucideIcon,
} from 'lucide-react';
import { DESKTOP_GRID_CELL, DESKTOP_GRID_OFFSET_X, DESKTOP_GRID_OFFSET_Y, DRAG_THRESHOLD, type WindowPosition } from '@/types/os';

const ICON_MAP: Record<string, LucideIcon> = {
  FolderOpen,
  TerminalSquare,
  Globe,
  FileText,
  Settings,
  Calculator,
  Image,
  Store,
  CloudSun,
  Info,
};

function snapToGrid(pos: WindowPosition): WindowPosition {
  return {
    x: Math.round((pos.x - DESKTOP_GRID_OFFSET_X) / DESKTOP_GRID_CELL) * DESKTOP_GRID_CELL + DESKTOP_GRID_OFFSET_X,
    y: Math.round((pos.y - DESKTOP_GRID_OFFSET_Y) / DESKTOP_GRID_CELL) * DESKTOP_GRID_CELL + DESKTOP_GRID_OFFSET_Y,
  };
}

interface DesktopIconProps {
  icon: string;
  label: string;
  onDoubleClick: () => void;
  onClick?: (e: React.MouseEvent) => void;
  selected: boolean;
  darkBg: boolean;
  position: WindowPosition;
  onDragEnd: (id: string, position: WindowPosition) => void;
  iconId: string;
}

export function DesktopIcon({
  icon,
  label,
  onDoubleClick,
  onClick,
  selected,
  darkBg,
  position,
  onDragEnd,
  iconId,
}: DesktopIconProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [livePos, setLivePos] = useState(position);
  const livePosRef = useRef(position);
  const draggingRef = useRef(false);
  const prevPositionRef = useRef(position);

  useEffect(() => {
    if (!isDragging) {
      livePosRef.current = position;
    }
    prevPositionRef.current = position;
  }, [position, isDragging]);

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

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;

      onClick?.(e);

      const startX = e.clientX;
      const startY = e.clientY;
      const originX = position.x;
      const originY = position.y;
      let moved = false;

      const handleMove = (ev: MouseEvent) => {
        const dx = ev.clientX - startX;
        const dy = ev.clientY - startY;

        if (!moved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;

        if (!moved) {
          moved = true;
          e.preventDefault();
          draggingRef.current = true;
          setIsDragging(true);
        }

        const newPos = {
          x: originX + dx,
          y: Math.max(-DESKTOP_GRID_OFFSET_Y, originY + dy),
        };
        setLivePos(newPos);
        livePosRef.current = newPos;
      };

      const handleUp = () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleUp);

        if (moved) {
          const snapped = snapToGrid(livePosRef.current);
          onDragEnd(iconId, snapped);
          setIsDragging(false);
          setTimeout(() => { draggingRef.current = false; }, 0);
        }
      };

      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleUp);
    },
    [iconId, position.x, position.y, onClick, onDragEnd]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (draggingRef.current) return;
      e.stopPropagation();
      onClick?.(e);
    },
    [onClick]
  );

  const currentPos = isDragging ? livePos : position;

  return (
    <div
      className="absolute"
      style={{ left: currentPos.x, top: currentPos.y, zIndex: isDragging ? 9999 : 'auto' }}
    >
      <div
        className={`
          flex flex-col items-center justify-center
          w-20 h-20 rounded-lg cursor-pointer select-none
          transition-colors duration-150
          ${selected ? selBg : hovered ? hovBg : ''}
          ${isDragging ? 'opacity-70 scale-105' : ''}
        `}
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onDoubleClick={(e) => {
          e.stopPropagation();
          onDoubleClick();
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="flex items-center justify-center w-10 h-10 mb-1">
          <IconComponent
            className={`w-8 h-8 ${iconColor} ${iconFilter} drop-shadow-lg`}
            strokeWidth={1.5}
          />
        </div>
        <span
          className={`
            text-[11px] text-center leading-tight max-w-[72px] truncate
            px-1 ${labelShadow}
            ${labelColor}
          `}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

export { ICON_MAP };
