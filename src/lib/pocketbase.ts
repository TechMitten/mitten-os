import PocketBase from 'pocketbase';

export const POCKETBASE_URL = 'https://db.techmitten.com';
export const COLLECTION_DATA = 'mitten_data';
export const COLLECTION_USERS = 'users';

let pbInstance: PocketBase | null = null;

export function getPB(): PocketBase {
  if (!pbInstance) {
    pbInstance = new PocketBase(POCKETBASE_URL);
  }
  return pbInstance;
}

export async function checkPocketBaseHealth(): Promise<{ ok: boolean; message: string }> {
  try {
    const res = await fetch(`${POCKETBASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: true, message: data.message || 'Healthy' };
    }
    return { ok: false, message: `Server responded with HTTP ${res.status}` };
  } catch (err: any) {
    return { ok: false, message: err.message || 'Failed to connect to backend' };
  }
}

export async function loginWithPassword(email: string, pass: string) {
  const pb = getPB();
  const authData = await pb.collection(COLLECTION_USERS).authWithPassword(email.trim(), pass);
  return authData;
}

export async function signUpWithPassword(email: string, pass: string, passConfirm: string, name?: string) {
  const pb = getPB();
  const newUser = await pb.collection(COLLECTION_USERS).create({
    email: email.trim(),
    password: pass,
    passwordConfirm: passConfirm,
    name: name?.trim() || '',
  });
  // Auto-authenticate after account creation
  const authData = await pb.collection(COLLECTION_USERS).authWithPassword(email.trim(), pass);
  return { user: newUser, authData };
}

export function logoutPB(): void {
  const pb = getPB();
  pb.authStore.clear();
}

export function isPBAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  const pb = getPB();
  return pb.authStore.isValid;
}

export function getCurrentPBUser() {
  if (typeof window === 'undefined') return null;
  const pb = getPB();
  return pb.authStore.record;
}

// ─── Data Sync Engine (VFS, Desktop State, Settings, Apps) ──────────────────

const debounceTimers = new Map<string, NodeJS.Timeout>();

export async function saveUserData(key: string, data: any): Promise<boolean> {
  const pb = getPB();
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return false;
  }

  const userId = pb.authStore.record.id;
  const payloadStr = typeof data === 'string' ? data : JSON.stringify(data);

  try {
    let existingRecordId: string | null = null;
    try {
      const existing = await pb.collection(COLLECTION_DATA).getFirstListItem(
        `user = "${userId}" && key = "${key}"`
      );
      if (existing) existingRecordId = existing.id;
    } catch (e: any) {
      if (e.status !== 404) {
        if (e.data?.message?.includes('Missing collection') || e.message?.includes('Missing collection')) {
          console.warn(`[MittenOS Cloud] Collection '${COLLECTION_DATA}' not found. Using local storage.`);
          return false;
        }
      }
    }

    if (existingRecordId) {
      await pb.collection(COLLECTION_DATA).update(existingRecordId, {
        payload: payloadStr,
        updated_at: new Date().toISOString(),
      });
    } else {
      await pb.collection(COLLECTION_DATA).create({
        user: userId,
        key,
        payload: payloadStr,
      });
    }
    return true;
  } catch (err: any) {
    console.warn(`[MittenOS Cloud] Could not sync '${key}':`, err.message || err);
    return false;
  }
}

export async function debouncedSaveUserData(key: string, data: any, delayMs = 1500): Promise<void> {
  const existingTimer = debounceTimers.get(key);
  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  const timer = setTimeout(async () => {
    try {
      await saveUserData(key, data);
    } finally {
      debounceTimers.delete(key);
    }
  }, delayMs);

  debounceTimers.set(key, timer);
}

export async function loadUserData<T = any>(key: string): Promise<T | null> {
  const pb = getPB();
  if (!pb.authStore.isValid || !pb.authStore.record) {
    return null;
  }

  const userId = pb.authStore.record.id;

  try {
    const record = await pb.collection(COLLECTION_DATA).getFirstListItem(
      `user = "${userId}" && key = "${key}"`
    );
    if (!record || !record.payload) return null;

    try {
      return JSON.parse(record.payload) as T;
    } catch {
      return record.payload as unknown as T;
    }
  } catch {
    return null;
  }
}

export async function deleteUserData(key: string): Promise<boolean> {
  const pb = getPB();
  if (!pb.authStore.isValid || !pb.authStore.record) return false;

  const userId = pb.authStore.record.id;
  try {
    const record = await pb.collection(COLLECTION_DATA).getFirstListItem(
      `user = "${userId}" && key = "${key}"`
    );
    if (record) {
      await pb.collection(COLLECTION_DATA).delete(record.id);
      return true;
    }
  } catch {
    // Ignore if not found
  }
  return false;
}
