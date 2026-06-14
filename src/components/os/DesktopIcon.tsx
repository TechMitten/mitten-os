'use client';

import React, { useState } from 'react';
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

// Icon mapping from string name to Lucide component
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

interface DesktopIconProps {
  icon: string;
  label: string;
  onDoubleClick: () => void;
  onClick?: (e: React.MouseEvent) => void;
  selected: boolean;
  darkBg: boolean;
}

export function DesktopIcon({ icon, label, onDoubleClick, onClick, selected, darkBg }: DesktopIconProps) {
  const [hovered, setHovered] = useState(false);
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
      className={`
        flex flex-col items-center justify-center
        w-20 h-20 rounded-lg cursor-pointer select-none
        transition-colors duration-150
        ${selected ? selBg : hovered ? hovBg : ''}
      `}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
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
  );
}

export { ICON_MAP };
