export interface SavedAccount {
  id: string
  email: string
  avatarUrl?: string
  displayName?: string
  lastLogin: string
}

const STORAGE_KEY = 'mittenos:saved_accounts'

export function getSavedAccounts(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveAccount(account: SavedAccount): void {
  const accounts = getSavedAccounts().filter((a) => a.id !== account.id)
  accounts.unshift(account)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function removeSavedAccount(id: string): void {
  const accounts = getSavedAccounts().filter((a) => a.id !== id)
  if (accounts.length > 0) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
  } else {
    localStorage.removeItem(STORAGE_KEY)
  }
}
