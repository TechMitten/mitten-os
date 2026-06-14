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
}

export function DesktopIcon({ icon, label, onDoubleClick, onClick, selected }: DesktopIconProps) {
  const [hovered, setHovered] = useState(false);
  const IconComponent = ICON_MAP[icon] || FileText;

  return (
    <div
      className={`
        flex flex-col items-center justify-center
        w-20 h-20 rounded-lg cursor-pointer select-none
        transition-colors duration-150
        ${selected
          ? 'bg-white/15 ring-1 ring-white/20'
          : hovered
            ? 'bg-white/10'
            : ''
        }
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
          className="w-8 h-8 text-white drop-shadow-lg"
          strokeWidth={1.5}
        />
      </div>
      <span
        className={`
          text-[11px] text-center leading-tight max-w-[72px] truncate
          drop-shadow-lg px-1
          ${selected ? 'text-white font-medium' : 'text-white/90'}
        `}
      >
        {label}
      </span>
    </div>
  );
}

export { ICON_MAP };
