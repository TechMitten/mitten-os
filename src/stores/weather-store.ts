import { create } from 'zustand';

export type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'snowy';

export interface WeatherData {
  condition: WeatherCondition;
  temperature: number;
  high: number;
  low: number;
  location: string;
  description: string;
  humidity: number;
  windSpeed: number;
  uvIndex: number;
  visibility: number;
  hourly: { time: string; temp: number; condition: WeatherCondition }[];
  daily: { day: string; high: number; low: number; condition: WeatherCondition }[];
}

export interface WeatherStore {
  initialized: boolean;
  showInTaskbar: boolean;
  refreshInterval: number; // in minutes (0 for manual)
  data: WeatherData | null;
  savedLoc: {
    name: string;
    latitude: number;
    longitude: number;
  };
  tempUnit: 'celsius' | 'fahrenheit';
  windVisibilityUnit: 'metric' | 'imperial';
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null; // ISO string

  initialize: () => void;
  setShowInTaskbar: (show: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  setWeatherLocation: (name: string, lat: number, lon: number) => void;
  setTempUnit: (unit: 'celsius' | 'fahrenheit') => void;
  setWindVisibilityUnit: (unit: 'metric' | 'imperial') => void;
  fetchWeather: (
    lat: number,
    lon: number,
    locationName: string,
    unit?: 'celsius' | 'fahrenheit'
  ) => Promise<void>;
}

function getConditionFromWmo(code: number): WeatherCondition {
  if (code === 0 || code === 1) return 'sunny';
  if (code === 2) return 'partly-cloudy';
  if (code === 3 || code === 45 || code === 48) return 'cloudy';
  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code === 95 ||
    code === 96 ||
    code === 99
  ) {
    return 'rainy';
  }
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) {
    return 'snowy';
  }
  return 'sunny';
}

function getDescriptionFromWmo(code: number): string {
  switch (code) {
    case 0: return 'Clear Sky';
    case 1: return 'Mainly Clear';
    case 2: return 'Partly Cloudy';
    case 3: return 'Overcast';
    case 45: return 'Foggy';
    case 48: return 'Depositing Rime Fog';
    case 51: return 'Light Drizzle';
    case 53: return 'Moderate Drizzle';
    case 55: return 'Dense Drizzle';
    case 56: return 'Light Freezing Drizzle';
    case 57: return 'Dense Freezing Drizzle';
    case 61: return 'Slight Rain';
    case 63: return 'Moderate Rain';
    case 65: return 'Heavy Rain';
    case 66: return 'Light Freezing Rain';
    case 67: return 'Heavy Freezing Rain';
    case 71: return 'Slight Snowfall';
    case 73: return 'Moderate Snowfall';
    case 75: return 'Heavy Snowfall';
    case 77: return 'Snow Grains';
    case 80: return 'Slight Rain Showers';
    case 81: return 'Moderate Rain Showers';
    case 82: return 'Violent Rain Showers';
    case 85: return 'Slight Snow Showers';
    case 86: return 'Heavy Snow Showers';
    case 95: return 'Thunderstorm';
    case 96: return 'Thunderstorm with Hail';
    case 99: return 'Severe Thunderstorm with Hail';
    default: return 'Clear Sky';
  }
}

async function writeVFSFile(path: string, content: string, mimeType = 'application/json') {
  try {
    const { useFileSystemStore } = await import("./filesystem-store");
    const fsStore = useFileSystemStore.getState();
    const node = fsStore.getNode(path);
    if (node) {
      await fsStore.updateFileContent(node.id, content);
    } else {
      const lastSlash = path.lastIndexOf('/');
      const parentPath = path.substring(0, lastSlash) || "/";
      const name = path.substring(lastSlash + 1);
      
      const parentNode = fsStore.getNode(parentPath);
      const parentId = parentNode ? parentNode.id : 'root';
      await fsStore.createFile(parentId, name, content, mimeType);
    }
  } catch (e) {
    console.error(`Failed to write file to VFS: ${path}`, e);
  }
}

async function saveSettingsToVFS(state: WeatherStore) {
  try {
    const { useFileSystemStore } = await import("./filesystem-store");
    const fsStore = useFileSystemStore.getState();
    if (!fsStore.loaded) return;

    const settings = {
      showInTaskbar: state.showInTaskbar,
      refreshInterval: state.refreshInterval,
      savedLoc: state.savedLoc,
      tempUnit: state.tempUnit,
      windVisibilityUnit: state.windVisibilityUnit,
    };
    await writeVFSFile("/.system/.settings", JSON.stringify(settings));
  } catch (e) {
    console.error("Failed to save weather settings to VFS:", e);
  }
}

export const useWeatherStore = create<WeatherStore>((set, get) => ({
  initialized: false,
  showInTaskbar: false,
  refreshInterval: 30,
  data: null,
  savedLoc: {
    name: 'San Francisco, CA',
    latitude: 37.7749,
    longitude: -122.4194,
  },
  tempUnit: 'celsius',
  windVisibilityUnit: 'metric',
  isLoading: false,
  error: null,
  lastUpdated: null,

  initialize: () => {
    if (typeof window === 'undefined') return;

    const loadFromVFS = async () => {
      try {
        const { useFileSystemStore } = await import("./filesystem-store");
        const fsStore = useFileSystemStore.getState();
        
        let node = fsStore.getNode("/.system/.settings");
        let oldNode = null;
        let content = null;
        
        if (node) {
          content = await fsStore.fetchFileContentIfNeeded(node.id);
        } else {
          // Check for the older filename weather_settings.json for migration
          oldNode = fsStore.getNode("/.system/weather_settings.json");
          if (oldNode) {
            content = await fsStore.fetchFileContentIfNeeded(oldNode.id);
          }
        }

        if (content) {
          const settings = JSON.parse(content);
          set({
            showInTaskbar: settings.showInTaskbar ?? false,
            refreshInterval: settings.refreshInterval ?? 30,
            savedLoc: settings.savedLoc || {
              name: 'San Francisco, CA',
              latitude: 37.7749,
              longitude: -122.4194,
            },
            tempUnit: settings.tempUnit || 'celsius',
            windVisibilityUnit: settings.windVisibilityUnit || 'metric',
            initialized: true,
          });

          // Migrate to the new .settings path and delete the old one
          if (oldNode) {
            await writeVFSFile("/.system/.settings", content);
            await fsStore.deleteNode(oldNode.id);
          }
          return;
        }
      } catch (e) {
        console.error("Failed to load weather settings from VFS:", e);
      }

      // Migration / Fallback from localStorage
      const showInTaskbar = localStorage.getItem('mittenOS_weather_showInTaskbar') === 'true';
      const refreshInterval = Number(localStorage.getItem('mittenOS_weather_refreshInterval') || '30');

      let loc = { name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 };
      const storedLoc = localStorage.getItem('mittenOS_weather_location');
      if (storedLoc) {
        try {
          const parsed = JSON.parse(storedLoc);
          if (parsed && parsed.name && typeof parsed.latitude === 'number') {
            loc = parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }

      let unit: 'celsius' | 'fahrenheit' = 'celsius';
      const storedUnit = localStorage.getItem('mittenOS_weather_unit');
      if (storedUnit === 'fahrenheit' || storedUnit === 'celsius') {
        unit = storedUnit;
      }

      let windVisibilityUnit: 'metric' | 'imperial' = 'metric';
      const storedWindVisibilityUnit = localStorage.getItem('mittenOS_weather_windVisibilityUnit');
      if (storedWindVisibilityUnit === 'imperial' || storedWindVisibilityUnit === 'metric') {
        windVisibilityUnit = storedWindVisibilityUnit;
      }

      set({
        showInTaskbar,
        refreshInterval,
        savedLoc: loc,
        tempUnit: unit,
        windVisibilityUnit,
        initialized: true,
      });

      // Write migrated settings to VFS
      const settings = {
        showInTaskbar,
        refreshInterval,
        savedLoc: loc,
        tempUnit: unit,
        windVisibilityUnit,
      };
      await writeVFSFile("/.system/.settings", JSON.stringify(settings));
    };

    // Load from localStorage first to initialize UI immediately (with fallback settings)
    const initLocal = () => {
      const showInTaskbar = localStorage.getItem('mittenOS_weather_showInTaskbar') === 'true';
      const refreshInterval = Number(localStorage.getItem('mittenOS_weather_refreshInterval') || '30');

      let loc = { name: 'San Francisco, CA', latitude: 37.7749, longitude: -122.4194 };
      const storedLoc = localStorage.getItem('mittenOS_weather_location');
      if (storedLoc) {
        try {
          const parsed = JSON.parse(storedLoc);
          if (parsed && parsed.name && typeof parsed.latitude === 'number') {
            loc = parsed;
          }
        } catch (e) {
          console.error(e);
        }
      }

      let unit: 'celsius' | 'fahrenheit' = 'celsius';
      const storedUnit = localStorage.getItem('mittenOS_weather_unit');
      if (storedUnit === 'fahrenheit' || storedUnit === 'celsius') {
        unit = storedUnit;
      }

      let windVisibilityUnit: 'metric' | 'imperial' = 'metric';
      const storedWindVisibilityUnit = localStorage.getItem('mittenOS_weather_windVisibilityUnit');
      if (storedWindVisibilityUnit === 'imperial' || storedWindVisibilityUnit === 'metric') {
        windVisibilityUnit = storedWindVisibilityUnit;
      }

      set({
        showInTaskbar,
        refreshInterval,
        savedLoc: loc,
        tempUnit: unit,
        windVisibilityUnit,
        initialized: false, // remain uninitialized so weather poller doesn't trigger until VFS finishes sync
      });
    };

    initLocal();

    // Check VFS status
    import("./filesystem-store").then(({ useFileSystemStore }) => {
      const fsStore = useFileSystemStore.getState();
      if (fsStore.loaded) {
        loadFromVFS();
      } else {
        const unsubscribe = useFileSystemStore.subscribe((state) => {
          if (state.loaded) {
            loadFromVFS();
            unsubscribe();
          }
        });
      }
    });
  },

  setShowInTaskbar: (show: boolean) => {
    set({ showInTaskbar: show });
    saveSettingsToVFS(get());
  },

  setRefreshInterval: (interval: number) => {
    set({ refreshInterval: interval });
    saveSettingsToVFS(get());
  },

  setWeatherLocation: (name: string, lat: number, lon: number) => {
    const newLoc = { name, latitude: lat, longitude: lon };
    set({ savedLoc: newLoc });
    saveSettingsToVFS(get());
    get().fetchWeather(lat, lon, name, get().tempUnit);
  },

  setTempUnit: (unit: 'celsius' | 'fahrenheit') => {
    set({ tempUnit: unit });
    saveSettingsToVFS(get());
    const { savedLoc } = get();
    get().fetchWeather(savedLoc.latitude, savedLoc.longitude, savedLoc.name, unit);
  },

  setWindVisibilityUnit: (unit: 'metric' | 'imperial') => {
    set({ windVisibilityUnit: unit });
    saveSettingsToVFS(get());
  },

  fetchWeather: async (
    lat: number,
    lon: number,
    locationName: string,
    unit?: 'celsius' | 'fahrenheit'
  ) => {
    const activeUnit = unit || get().tempUnit;
    set({ isLoading: true, error: null });
    try {
      const unitParam = activeUnit === 'fahrenheit' ? '&temperature_unit=fahrenheit' : '';
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code,visibility,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max${unitParam}&timezone=auto&forecast_days=10`;
      
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to fetch weather data');
      }
      const apiData = await res.json();

      const current = apiData.current;
      const hourly = apiData.hourly;
      const daily = apiData.daily;

      if (!current || !hourly || !daily) {
        throw new Error('Invalid response data from weather service');
      }

      const currentWmo = current.weather_code;
      const condition = getConditionFromWmo(currentWmo);
      const description = getDescriptionFromWmo(currentWmo);

      // Find current hour index
      const currentHourTimeStr = current.time.slice(0, 13) + ':00';
      let currentHourIndex = hourly.time.findIndex((t: string) => t.startsWith(currentHourTimeStr));
      if (currentHourIndex === -1) {
        currentHourIndex = hourly.time.findIndex((t: string) => t >= current.time);
      }
      if (currentHourIndex === -1) currentHourIndex = 0;

      // Process hourly (next 8 hours)
      const hourlyForecasts = [];
      for (let i = 0; i < 8; i++) {
        const idx = currentHourIndex + i;
        if (idx < hourly.time.length) {
          const timeStr = hourly.time[idx];
          const hourNum = parseInt(timeStr.slice(11, 13), 10);
          const ampm = hourNum >= 12 ? 'PM' : 'AM';
          const displayHour = hourNum % 12 === 0 ? 12 : hourNum % 12;
          const displayTime = i === 0 ? 'Now' : `${displayHour}${ampm}`;
          hourlyForecasts.push({
            time: displayTime,
            temp: Math.round(hourly.temperature_2m[idx]),
            condition: getConditionFromWmo(hourly.weather_code[idx]),
          });
        }
      }

      // Process daily (next 8 days, starting from tomorrow as index 1)
      const dailyForecasts = [];
      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      for (let i = 1; i <= 8; i++) {
        const idx = i;
        if (idx < daily.time.length) {
          const date = new Date(daily.time[idx] + 'T00:00:00');
          const dayName = daysOfWeek[date.getDay()];
          dailyForecasts.push({
            day: dayName,
            high: Math.round(daily.temperature_2m_max[idx]),
            low: Math.round(daily.temperature_2m_min[idx]),
            condition: getConditionFromWmo(daily.weather_code[idx]),
          });
        }
      }

      const visibilityKm = Math.round((hourly.visibility[currentHourIndex] || 10000) / 1000);
      const uvIndex = Math.round(daily.uv_index_max[0] || 0);

      set({
        data: {
          condition,
          temperature: Math.round(current.temperature_2m),
          high: Math.round(daily.temperature_2m_max[0]),
          low: Math.round(daily.temperature_2m_min[0]),
          location: locationName,
          description,
          humidity: Math.round(current.relative_humidity_2m),
          windSpeed: Math.round(current.wind_speed_10m),
          uvIndex,
          visibility: visibilityKm,
          hourly: hourlyForecasts,
          daily: dailyForecasts,
        },
        lastUpdated: new Date().toISOString(),
        isLoading: false,
        error: null,
      });
    } catch (err: any) {
      console.error(err);
      set({
        error: err.message || 'Error fetching weather',
        isLoading: false,
      });
    }
  },
}));
