'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useWeatherStore } from '@/stores/weather-store';
import {
  Wind,
  Droplets,
  Eye,
  Thermometer,
  RefreshCw,
  Search,
  X,
  MapPin,
  ArrowLeft,
  AlertCircle,
  Loader2,
  Settings,
} from 'lucide-react';

type WeatherCondition = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'snowy';

interface WeatherData {
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

function SunnyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sunGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbde" />
          <stop offset="40%" stopColor="#ffdb3a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <filter id="sunShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#f59e0b" floodOpacity="0.4" />
        </filter>
      </defs>
      <circle cx="50%" cy="50%" r="24" fill="url(#sunGlow)" filter="url(#sunShadow)" />
      <g stroke="#ffdb3a" strokeWidth="6" strokeLinecap="round" opacity="0.9">
        <line x1="50" y1="12" x2="50" y2="2" />
        <line x1="50" y1="88" x2="50" y2="98" />
        <line x1="12" y1="50" x2="2" y2="50" />
        <line x1="88" y1="50" x2="98" y2="50" />
        <line x1="23" y1="23" x2="16" y2="16" />
        <line x1="77" y1="77" x2="84" y2="84" />
        <line x1="23" y1="77" x2="16" y2="84" />
        <line x1="77" y1="23" x2="84" y2="16" />
      </g>
    </svg>
  );
}

function PartlyCloudyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="sunMiniGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffbde" />
          <stop offset="100%" stopColor="#f59e0b" />
        </radialGradient>
        <linearGradient id="cloudGrad" x1="20" y1="30" x2="80" y2="90" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <filter id="cloudShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.15" />
        </filter>
      </defs>
      <circle cx="62" cy="38" r="18" fill="url(#sunMiniGlow)" />
      <g stroke="#ffdb3a" strokeWidth="4.5" strokeLinecap="round" opacity="0.8">
        <line x1="62" y1="14" x2="62" y2="7" />
        <line x1="86" y1="38" x2="93" y2="38" />
        <line x1="45" y1="21" x2="40" y2="16" />
        <line x1="79" y1="21" x2="84" y2="16" />
      </g>
      <path
        d="M25 68C25 57.5 33.5 49 44 49C45 49 46 49.1 47 49.3C50.9 41.5 59.2 36 68.5 36C81.5 36 92 46.5 92 59.5C92 70.8 84 80.3 73.2 82.5C71.8 82.8 30 82.8 28.8 82.5C26.6 82 25 75.2 25 68Z"
        fill="url(#cloudGrad)"
        filter="url(#cloudShadow)"
      />
    </svg>
  );
}

function CloudyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cloudBackGrad" x1="10" y1="20" x2="60" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id="cloudFrontGrad" x1="25" y1="35" x2="85" y2="95" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f8fafc" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#94a3b8" />
        </linearGradient>
        <filter id="cloudDoubleShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" floodColor="#0f172a" floodOpacity="0.25" />
        </filter>
      </defs>
      <path
        d="M15 55C15 46 22 39 31 39C32 39 33 39.1 34 39.3C37 32 44.5 27 53 27C64.5 27 74 36.5 74 48C74 58 66 66.5 56.5 68C55 68.2 20 68.2 18.5 68C16.5 67.5 15 62 15 55Z"
        fill="url(#cloudBackGrad)"
        opacity="0.8"
      />
      <path
        d="M25 68C25 57.5 33.5 49 44 49C45 49 46 49.1 47 49.3C50.9 41.5 59.2 36 68.5 36C81.5 36 92 46.5 92 59.5C92 70.8 84 80.3 73.2 82.5C71.8 82.8 30 82.8 28.8 82.5C26.6 82 25 75.2 25 68Z"
        fill="url(#cloudFrontGrad)"
        filter="url(#cloudDoubleShadow)"
      />
    </svg>
  );
}

function RainyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rainCloudGrad" x1="20" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#64748b" />
          <stop offset="70%" stopColor="#334155" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <linearGradient id="dropGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>
      <path
        d="M20 58C20 48 28 40 38 40C39 40 40 40.1 41 40.3C44.5 32.5 52.5 27 61.5 27C74 27 84.5 37 84.5 49.5C84.5 60 76.5 69 66 71C65 71.2 24.5 71.2 23 71C21 70.5 20 64.5 20 58Z"
        fill="url(#rainCloudGrad)"
      />
      <g stroke="url(#dropGrad)" strokeWidth="3.5" strokeLinecap="round">
        <line x1="33" y1="78" x2="28" y2="88" />
        <line x1="48" y1="80" x2="43" y2="90" />
        <line x1="63" y1="78" x2="58" y2="88" />
        <line x1="75" y1="78" x2="70" y2="88" />
      </g>
    </svg>
  );
}

function SnowyIcon({ className = 'w-16 h-16' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="snowCloudGrad" x1="20" y1="20" x2="80" y2="70" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#cbd5e1" />
          <stop offset="60%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
      </defs>
      <path
        d="M20 58C20 48 28 40 38 40C39 40 40 40.1 41 40.3C44.5 32.5 52.5 27 61.5 27C74 27 84.5 37 84.5 49.5C84.5 60 76.5 69 66 71C65 71.2 24.5 71.2 23 71C21 70.5 20 64.5 20 58Z"
        fill="url(#snowCloudGrad)"
      />
      <g stroke="#e2e8f0" strokeWidth="2.5" strokeLinecap="round" opacity="0.9">
        <g transform="translate(30, 80)">
          <line x1="0" y1="-5" x2="0" y2="5" />
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
          <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
        </g>
        <g transform="translate(50, 84)">
          <line x1="0" y1="-5" x2="0" y2="5" />
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
          <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
        </g>
        <g transform="translate(70, 80)">
          <line x1="0" y1="-5" x2="0" y2="5" />
          <line x1="-5" y1="0" x2="5" y2="0" />
          <line x1="-3.5" y1="-3.5" x2="3.5" y2="3.5" />
          <line x1="-3.5" y1="3.5" x2="3.5" y2="-3.5" />
        </g>
      </g>
    </svg>
  );
}

function getConditionIconJsx(condition: WeatherCondition, className = 'w-6 h-6') {
  switch (condition) {
    case 'sunny':
      return <SunnyIcon className={className} />;
    case 'partly-cloudy':
      return <PartlyCloudyIcon className={className} />;
    case 'cloudy':
      return <CloudyIcon className={className} />;
    case 'rainy':
      return <RainyIcon className={className} />;
    case 'snowy':
      return <SnowyIcon className={className} />;
  }
}

function getGradient(condition: WeatherCondition) {
  switch (condition) {
    case 'sunny':
      return 'bg-gradient-to-br from-sky-600 to-blue-800';
    case 'partly-cloudy':
      return 'bg-gradient-to-br from-sky-700 to-slate-700';
    case 'cloudy':
      return 'bg-gradient-to-br from-slate-600 to-slate-800';
    case 'rainy':
      return 'bg-gradient-to-br from-slate-700 to-indigo-900';
    case 'snowy':
      return 'bg-gradient-to-br from-slate-400 to-blue-800';
  }
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
  return 'sunny'; // default
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

function formatTime(date: Date | null): string {
  if (!date) return '--:--';
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 === 0 ? 12 : hours % 12;
  const displayMinutes = minutes < 10 ? `0${minutes}` : minutes;
  return `${displayHours}:${displayMinutes} ${ampm}`;
}

export default function Weather() {
  const data = useWeatherStore((s) => s.data);
  const savedLoc = useWeatherStore((s) => s.savedLoc);
  const tempUnit = useWeatherStore((s) => s.tempUnit);
  const isLoading = useWeatherStore((s) => s.isLoading);
  const error = useWeatherStore((s) => s.error);
  const lastUpdatedRaw = useWeatherStore((s) => s.lastUpdated);
  const lastUpdated = lastUpdatedRaw ? new Date(lastUpdatedRaw) : null;
  const showInTaskbar = useWeatherStore((s) => s.showInTaskbar);
  const refreshInterval = useWeatherStore((s) => s.refreshInterval);

  const setShowInTaskbar = useWeatherStore((s) => s.setShowInTaskbar);
  const setRefreshInterval = useWeatherStore((s) => s.setRefreshInterval);
  const setWeatherLocation = useWeatherStore((s) => s.setWeatherLocation);
  const setTempUnit = useWeatherStore((s) => s.setTempUnit);
  const fetchWeather = useWeatherStore((s) => s.fetchWeather);

  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isGeocodingLoading, setIsGeocodingLoading] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isSearching) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearching]);

  const refresh = useCallback(() => {
    fetchWeather(savedLoc.latitude, savedLoc.longitude, savedLoc.name, tempUnit);
  }, [fetchWeather, savedLoc, tempUnit]);

  const changeUnit = (newUnit: 'celsius' | 'fahrenheit') => {
    setTempUnit(newUnit);
  };

  // Debounced search for geocoding
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    
    const fetchGeocoding = async (query: string) => {
      setIsGeocodingLoading(true);
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=6&language=en&format=json`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Geocoding search failed');
        const searchData = await res.json();
        setSearchResults(searchData.results || []);
      } catch (err) {
        console.error(err);
      } finally {
        setIsGeocodingLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      fetchGeocoding(searchQuery);
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const selectLocation = (result: any) => {
    const locName = `${result.name}${result.admin1 ? `, ${result.admin1}` : result.country ? `, ${result.country}` : ''}`;
    setWeatherLocation(locName, result.latitude, result.longitude);
    setIsSearching(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  return (
    <div className={`${getGradient(data ? data.condition : 'sunny')} text-white h-full overflow-y-auto select-none weather-scrollbar relative flex flex-col`}>
      {/* Search Overlay */}
      <div className={`absolute inset-0 z-50 backdrop-blur-md bg-black/60 text-white flex flex-col p-4 transition-all duration-300 ease-out ${
        isSearching
          ? 'opacity-100 scale-100 pointer-events-auto'
          : 'opacity-0 scale-95 pointer-events-none'
      }`}>
        <div className="flex items-center gap-2 mb-4">
          <button
            onClick={() => {
              setIsSearching(false);
              setSearchQuery('');
              setSearchResults([]);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 relative">
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search city or zip code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg py-1.5 pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-white placeholder-white/50"
            />
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 opacity-50" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-2 p-0.5 rounded-full hover:bg-white/10"
              >
                <X className="w-3 h-3 opacity-50 hover:opacity-100" />
              </button>
            )}
          </div>
        </div>
        
        {/* Temperature Unit Settings Toggle */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 mb-3 shrink-0">
          <span className="text-xs font-semibold opacity-80">Temperature Unit</span>
          <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/5">
            <button
              onClick={() => changeUnit('celsius')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${
                tempUnit === 'celsius'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              °C
            </button>
            <button
              onClick={() => changeUnit('fahrenheit')}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-all active:scale-95 ${
                tempUnit === 'fahrenheit'
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              °F
            </button>
          </div>
        </div>

        {/* Taskbar Temp Toggle */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 mb-3 shrink-0">
          <span className="text-xs font-semibold opacity-80">Show Temp in Taskbar</span>
          <button
            onClick={() => setShowInTaskbar(!showInTaskbar)}
            className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              showInTaskbar ? 'bg-blue-500' : 'bg-white/15'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                showInTaskbar ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Polling Interval Setting */}
        <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-xl p-3 mb-4 shrink-0">
          <span className="text-xs font-semibold opacity-80">Auto Refresh</span>
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="bg-white/10 border border-white/20 text-white rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer max-w-[120px]"
          >
            <option value={0} className="bg-slate-800 text-white">Manual</option>
            <option value={5} className="bg-slate-800 text-white">Every 5 min</option>
            <option value={15} className="bg-slate-800 text-white">Every 15 min</option>
            <option value={30} className="bg-slate-800 text-white">Every 30 min</option>
            <option value={60} className="bg-slate-800 text-white">Every 1 hour</option>
            <option value={120} className="bg-slate-800 text-white">Every 2 hours</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 weather-scrollbar pr-1">
          {isGeocodingLoading ? (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Loader2 className="w-6 h-6 animate-spin opacity-60" />
              <span className="text-xs opacity-60">Searching cities...</span>
            </div>
          ) : searchResults.length > 0 ? (
            searchResults.map((result: any, i) => (
              <button
                key={i}
                onClick={() => selectLocation(result)}
                className="w-full text-left bg-white/5 hover:bg-white/10 active:bg-white/15 border border-white/10 rounded-xl p-3 flex items-start gap-3 transition-colors"
              >
                <MapPin className="w-4 h-4 mt-0.5 opacity-60 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">{result.name}</div>
                  <div className="text-xs opacity-60 truncate">
                    {result.admin1 ? `${result.admin1}, ` : ''}{result.country}
                  </div>
                </div>
              </button>
            ))
          ) : searchQuery.trim().length >= 2 ? (
            <div className="text-center py-10 text-xs opacity-50">No locations found.</div>
          ) : (
            <div className="text-center py-10 text-xs opacity-50 flex flex-col items-center gap-2">
              <MapPin className="w-8 h-8 opacity-30" />
              <span>Type city name or zip code to search.</span>
            </div>
          )}
        </div>
      </div>

      {/* Header with refresh */}
      <div className="flex items-center justify-between px-4 pt-3 shrink-0">
        <span className="text-xs font-medium opacity-60">Weather</span>
        <div className="flex items-center gap-0.5">
          <button
            onClick={refresh}
            disabled={isLoading}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
            aria-label="Refresh weather"
          >
            <RefreshCw className={`w-3.5 h-3.5 opacity-60 hover:opacity-100 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsSearching(true)}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Search location"
          >
            <Settings className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
          </button>
        </div>
      </div>


      {/* Error banner */}
      {error && (
        <div className="mx-4 mt-2 bg-red-500/20 border border-red-500/30 rounded-xl p-3 flex items-start gap-2 text-xs shrink-0">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-300" />
          <div className="flex-1">
            <p className="font-semibold text-red-200">Error loading weather</p>
            <p className="opacity-80">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="p-0.5 hover:bg-white/10 rounded-full">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Weather content or Loading State */}
      {!data ? (
        <div className="flex-1 flex items-center justify-center min-h-[300px]">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-6 h-6 animate-spin opacity-40" />
            <span className="text-white/40 text-xs">Loading weather...</span>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto weather-scrollbar">
          {/* Current weather */}
          <div className="text-center py-6 px-4">
            <div className="flex justify-center mb-2">
              {getConditionIconJsx(data.condition, 'w-28 h-28')}
            </div>
            <div className="text-7xl font-thin leading-none mb-1">
              {data.temperature}°
            </div>
            
            <div className="flex justify-center mt-2">
              <button
                onClick={() => setIsSearching(true)}
                className="group inline-flex items-center gap-1.5 text-sm font-medium opacity-80 hover:opacity-100 bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full border border-white/10 transition-all active:scale-95 shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                <span>{data.location}</span>
              </button>
            </div>
            
             <div className="text-sm opacity-60 mt-2">{data.description}</div>
            <div className="flex justify-center gap-4 mt-2 text-xs opacity-70">
              <span>H: {data.high}°</span>
              <span>L: {data.low}°</span>
            </div>
            {lastUpdated && (
              <div className="text-[9px] opacity-40 mt-3 select-none">
                Updated at {formatTime(lastUpdated)}
              </div>
            )}
          </div>

          {/* Hourly forecast */}
          <div className="px-4 pb-3">
            <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3">
              <div className="flex gap-4 overflow-x-auto py-1 px-1 weather-scrollbar">
                {data.hourly.map((hour, i) => (
                  <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <span className="text-[10px] opacity-60">{hour.time}</span>
                    {getConditionIconJsx(hour.condition, 'w-8 h-8')}
                    <span className="text-xs font-medium">{hour.temp}°</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5-day forecast */}
          <div className="px-4 pb-3">
            <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3">
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">5-Day Forecast</div>
              <div className="space-y-3">
                {(() => {
                  const allLows = data.daily.map(d => d.low);
                  const allHighs = data.daily.map(d => d.high);
                  const minTemp = Math.min(...allLows);
                  const maxTemp = Math.max(...allHighs);
                  const tempRange = maxTemp - minTemp || 1;

                  return data.daily.map((day, i) => {
                    const leftPercent = ((day.low - minTemp) / tempRange) * 100;
                    const rightPercent = 100 - (((day.high - minTemp) / tempRange) * 100);

                    return (
                      <div key={i} className="grid grid-cols-[2.8rem_1.5rem_1fr_4rem] items-center gap-2 text-sm">
                        <span className="opacity-70 font-medium">{day.day}</span>
                        <div className="flex justify-center">
                          {getConditionIconJsx(day.condition, 'w-5 h-5')}
                        </div>
                        <div className="h-1.5 bg-black/20 dark:bg-white/10 rounded-full overflow-hidden mx-2 flex-1 relative">
                          <div
                            className="absolute inset-y-0 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full"
                            style={{ left: `${leftPercent}%`, right: `${rightPercent}%` }}
                          />
                        </div>
                        <div className="flex gap-2 text-xs justify-end text-right font-mono min-w-[4rem]">
                          <span className="opacity-50 w-6">{day.low}°</span>
                          <span className="font-semibold w-6">{day.high}°</span>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Weather details */}
          <div className="px-4 pb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Droplets className="w-4 h-4 text-sky-300 opacity-90" />
                  <span className="text-[10px] uppercase tracking-wider opacity-50 font-medium">Humidity</span>
                </div>
                <div className="text-lg font-medium">{data.humidity}%</div>
              </div>
              <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Wind className="w-4 h-4 text-teal-200 opacity-90" />
                  <span className="text-[10px] uppercase tracking-wider opacity-50 font-medium">Wind</span>
                </div>
                <div className="text-lg font-medium">{data.windSpeed} km/h</div>
              </div>
              <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Thermometer className="w-4 h-4 text-amber-300 opacity-90" />
                  <span className="text-[10px] uppercase tracking-wider opacity-50 font-medium">UV Index</span>
                </div>
                <div className="text-lg font-medium">{data.uvIndex}</div>
              </div>
              <div className="bg-black/10 dark:bg-white/10 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Eye className="w-4 h-4 text-indigo-200 opacity-90" />
                  <span className="text-[10px] uppercase tracking-wider opacity-50 font-medium">Visibility</span>
                </div>
                <div className="text-lg font-medium">{data.visibility} km</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

