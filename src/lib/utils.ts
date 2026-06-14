import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

function hexToLuminance(hex: string): number {
  const h = hex.replace("#", "")
  const r = parseInt(h.substring(0, 2), 16) / 255
  const g = parseInt(h.substring(2, 4), 16) / 255
  const b = parseInt(h.substring(4, 6), 16) / 255
  const linearize = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

export function getWallpaperLuminance(wallpaper: string): number {
  const hexes = wallpaper.match(/#[0-9a-fA-F]{6}/g)
  if (!hexes || hexes.length === 0) return 0
  const luminances = hexes.map(hexToLuminance)
  return luminances.reduce((a, b) => a + b, 0) / luminances.length
}

export function isWallpaperDark(wallpaper: string): boolean {
  return getWallpaperLuminance(wallpaper) < 0.5
}
