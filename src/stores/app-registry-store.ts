import { create } from 'zustand';
import { APP_REGISTRY, type AppDefinition, type UserAppDefinition, type UserAppRow, type AppCategory } from '@/types/os';

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
    sourceFiles: row.source_files ?? null,
    compiledHtml: row.compiled_html ?? null,
    appType: row.app_type ?? 'html',
  };
}

export const useAppRegistryStore = create<AppRegistryStore>((set, get) => ({
  userApps: [],
  loaded: false,

  loadApprovedApps: async () => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('mittenos:user_apps');
      if (saved) {
        try {
          const rows = JSON.parse(saved) as UserAppRow[];
          const userAppDefs = rows.map(toUserAppDef);
          set({ userApps: userAppDefs, loaded: true });
          return;
        } catch (e) {
          console.error('Failed to load user apps from local storage:', e);
        }
      }
    }
    set({ userApps: [], loaded: true });
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

