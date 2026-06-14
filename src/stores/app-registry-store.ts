import { create } from 'zustand';
import { APP_REGISTRY, type AppDefinition, type UserAppDefinition, type UserAppRow, type AppCategory } from '@/types/os';
import { createClient } from '@/lib/supabase/client';

interface AppRegistryStore {
  userApps: UserAppDefinition[];
  loaded: boolean;

  loadApprovedApps: () => Promise<void>;
  getUserApp: (id: string) => UserAppDefinition | undefined;
  getAllAppDefinitions: () => (AppDefinition | UserAppDefinition)[];
  reset: () => void;
}

function toUserAppDef(row: UserAppRow): UserAppDefinition {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon,
    description: row.description,
    category: (row.category || 'utilities') as AppCategory,
    defaultWindowSize: row.default_window_size || { width: 700, height: 500 },
    minWindowSize: row.min_window_size || { width: 400, height: 300 },
    singleton: row.singleton || false,
    htmlContent: row.html_content,
  };
}

export const useAppRegistryStore = create<AppRegistryStore>((set, get) => ({
  userApps: [],
  loaded: false,

  loadApprovedApps: async () => {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_apps')
      .select('*')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to load approved apps:', error.message);
      set({ loaded: true });
      return;
    }

    const userAppDefs = ((data || []) as UserAppRow[]).map(toUserAppDef);
    set({ userApps: userAppDefs, loaded: true });
  },

  getUserApp: (id: string) => {
    return get().userApps.find((app) => app.id === id);
  },

  getAllAppDefinitions: () => {
    const builtIn = Object.values(APP_REGISTRY) as AppDefinition[];
    const user = get().userApps;
    return [...builtIn, ...user];
  },

  reset: () => {
    set({ userApps: [], loaded: false });
  },
}));
