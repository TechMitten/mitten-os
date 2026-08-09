export interface AccentColorOption {
  name: string;
  value: string;
}

export const ACCENT_COLORS: AccentColorOption[] = [
  { name: 'Amber', value: '#f59e0b' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Rose', value: '#f43f5e' },
  { name: 'Emerald', value: '#10b981' },
  { name: 'Cyan', value: '#06b6d4' },
  { name: 'Violet', value: '#8b5cf6' },
  { name: 'Orange', value: '#f97316' },
  { name: 'Pink', value: '#ec4899' },
  { name: 'Teal', value: '#14b8a6' },
];

export const DEFAULT_ACCENT_COLOR = 'Orange';

export function getAccentColor(nameOrValue?: string | null): AccentColorOption {
  const fallback = ACCENT_COLORS.find((c) => c.name === DEFAULT_ACCENT_COLOR) ?? ACCENT_COLORS[0];
  if (!nameOrValue) return fallback;
  const normalized = nameOrValue.toLowerCase();
  const found = ACCENT_COLORS.find(
    (c) => c.name.toLowerCase() === normalized || c.value.toLowerCase() === normalized
  );
  if (found) return found;
  if (nameOrValue.startsWith('#')) {
    return { name: 'Custom', value: nameOrValue };
  }
  return fallback;
}

export function applyAccentColorToDocument(accentColorNameOrValue?: string | null) {
  if (typeof document === 'undefined') return;
  const accent = getAccentColor(accentColorNameOrValue);
  const root = document.documentElement;
  root.style.setProperty('--primary', accent.value);
  root.style.setProperty('--color-primary', accent.value);
  root.style.setProperty('--ring', accent.value);
  root.style.setProperty('--color-ring', accent.value);
  root.style.setProperty('--sidebar-primary', accent.value);
  root.style.setProperty('--sidebar-ring', accent.value);
  root.style.setProperty('--accent-color', accent.value);
}
