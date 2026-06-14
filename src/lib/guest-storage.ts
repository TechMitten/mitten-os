import type { FSNode, WindowPosition } from '@/types/os'
import { createClient } from '@/lib/supabase/client'

const GUEST_ID_KEY = 'mittenos:guest:id'
const GUEST_SETTINGS_KEY = 'mittenos:guest:settings:'
const GUEST_FS_KEY = 'mittenos:guest:filesystem:'
const GUEST_WINDOW_STATES_KEY = 'mittenos:guest:windowStates:'
const GUEST_ICON_POSITIONS_KEY = 'mittenos:guest:iconPositions:'
const PENDING_AUTH_ACTION_KEY = 'mittenos:pending_auth_action'
const PENDING_GUEST_ID_KEY = 'mittenos:pending_guest_id'

export type AuthAction = 'signup' | 'signin'

export interface GuestSettings {
  wallpaper: string
  theme: 'light' | 'dark'
  welcomeDismissed: boolean
  persistWindows: boolean
}

export interface GuestWindowState {
  appId: string
  windowId: string
  title: string
  x: number
  y: number
  width: number
  height: number
  state: string
}

function generateId(): string {
  return crypto.randomUUID()
}

export function getOrCreateGuestId(): string {
  try {
    let id = localStorage.getItem(GUEST_ID_KEY)
    if (!id) {
      id = generateId()
      localStorage.setItem(GUEST_ID_KEY, id)
    }
    return id
  } catch {
    return generateId()
  }
}

export function getGuestId(): string | null {
  try {
    return localStorage.getItem(GUEST_ID_KEY)
  } catch {
    return null
  }
}

export function saveGuestSettings(guestId: string, settings: GuestSettings): void {
  try {
    localStorage.setItem(GUEST_SETTINGS_KEY + guestId, JSON.stringify(settings))
  } catch {
    // localStorage may be full or unavailable
  }
}

export function loadGuestSettings(guestId: string): GuestSettings | null {
  try {
    const raw = localStorage.getItem(GUEST_SETTINGS_KEY + guestId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveGuestFilesystem(guestId: string, root: FSNode): void {
  try {
    localStorage.setItem(GUEST_FS_KEY + guestId, JSON.stringify(root))
  } catch {
    // localStorage may be full
  }
}

export function loadGuestFilesystem(guestId: string): FSNode | null {
  try {
    const raw = localStorage.getItem(GUEST_FS_KEY + guestId)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

export function saveGuestWindowStates(guestId: string, states: GuestWindowState[]): void {
  try {
    localStorage.setItem(GUEST_WINDOW_STATES_KEY + guestId, JSON.stringify(states))
  } catch {
    // localStorage may be full
  }
}

export function loadGuestWindowStates(guestId: string): GuestWindowState[] {
  try {
    const raw = localStorage.getItem(GUEST_WINDOW_STATES_KEY + guestId)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveGuestIconPositions(guestId: string, positions: Record<string, WindowPosition>): void {
  try {
    localStorage.setItem(GUEST_ICON_POSITIONS_KEY + guestId, JSON.stringify(positions))
  } catch {
    // localStorage may be full
  }
}

export function loadGuestIconPositions(guestId: string): Record<string, WindowPosition> {
  try {
    const raw = localStorage.getItem(GUEST_ICON_POSITIONS_KEY + guestId)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

export function clearGuestData(guestId: string): void {
  try {
    localStorage.removeItem(GUEST_SETTINGS_KEY + guestId)
    localStorage.removeItem(GUEST_FS_KEY + guestId)
    localStorage.removeItem(GUEST_WINDOW_STATES_KEY + guestId)
    localStorage.removeItem(GUEST_ICON_POSITIONS_KEY + guestId)
  } catch {
    // best effort
  }
}

export function setPendingAuthAction(action: AuthAction, guestId: string): void {
  try {
    localStorage.setItem(PENDING_AUTH_ACTION_KEY, action)
    localStorage.setItem(PENDING_GUEST_ID_KEY, guestId)
  } catch {
    // best effort
  }
}

export function getPendingAuthAction(): { action: AuthAction; guestId: string } | null {
  try {
    const action = localStorage.getItem(PENDING_AUTH_ACTION_KEY)
    const guestId = localStorage.getItem(PENDING_GUEST_ID_KEY)
    if (action && guestId) {
      return { action: action as AuthAction, guestId }
    }
    return null
  } catch {
    return null
  }
}

export function clearPendingAuthAction(): void {
  try {
    localStorage.removeItem(PENDING_AUTH_ACTION_KEY)
    localStorage.removeItem(PENDING_GUEST_ID_KEY)
  } catch {
    // best effort
  }
}

function flattenTree(node: FSNode): FSNode[] {
  const result: FSNode[] = []
  const stack: FSNode[] = [node]
  while (stack.length > 0) {
    const current = stack.pop()!
    result.push(current)
    if (current.children) {
      for (const child of current.children) {
        stack.push(child)
      }
    }
  }
  return result
}

export async function migrateGuestToSupabase(guestId: string, realUserId: string): Promise<void> {
  const settings = loadGuestSettings(guestId)
  const fsRoot = loadGuestFilesystem(guestId)
  const windowStates = loadGuestWindowStates(guestId)
  const iconPositions = loadGuestIconPositions(guestId)

  const supabase = createClient()

  if (settings) {
    await supabase.from('user_settings').upsert({
      user_id: realUserId,
      theme: settings.theme,
      wallpaper: settings.wallpaper,
      updated_at: new Date().toISOString(),
    })
  }

  if (fsRoot) {
    const flat = flattenTree(fsRoot)
    const now = new Date().toISOString()
    const rows = flat.map((node) => ({
      user_id: realUserId,
      parent_id: node.parentId,
      name: node.name,
      type: node.type,
      content: node.content ?? null,
      mime_type: node.mimeType ?? 'text/plain',
      sort_order: 0,
      created_at: now,
      updated_at: now,
    }))

    const { error } = await supabase.from('filesystem_nodes').insert(rows)
    if (error) {
      console.error('Failed to migrate filesystem:', error.message)
    }
  }

  if (windowStates.length > 0 || Object.keys(iconPositions).length > 0) {
    await supabase.from('user_settings').upsert({
      user_id: realUserId,
      window_states: windowStates,
      icon_positions: iconPositions,
      settings_json: {
        welcomeDismissed: settings?.welcomeDismissed ?? false,
        persistWindows: settings?.persistWindows ?? true,
      },
      updated_at: new Date().toISOString(),
    })
  }

  clearGuestData(guestId)
}
