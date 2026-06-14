'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  CloudSun,
  Cloud,
  Sun,
  CloudRain,
  CloudSnow,
  Wind,
  Droplets,
  Eye,
  Thermometer,
  RefreshCw,
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

const LOCATIONS = [
  'San Francisco, CA',
  'New York, NY',
  'London, UK',
  'Tokyo, JP',
  'Paris, FR',
  'Sydney, AU',
  'Berlin, DE',
  'Toronto, CA',
];

const CONDITIONS: WeatherCondition[] = ['sunny', 'partly-cloudy', 'cloudy', 'rainy', 'snowy'];
const DESCRIPTIONS: Record<WeatherCondition, string[]> = {
  sunny: ['Clear Sky', 'Bright & Sunny', 'Beautiful Day'],
  'partly-cloudy': ['Partly Cloudy', 'Some Clouds', 'Mixed Skies'],
  cloudy: ['Overcast', 'Mostly Cloudy', 'Heavy Clouds'],
  rainy: ['Light Rain', 'Showers', 'Rainy Day'],
  snowy: ['Light Snow', 'Snowfall', 'Winter Storm'],
};

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getConditionIconJsx(condition: WeatherCondition, className = 'w-6 h-6') {
  switch (condition) {
    case 'sunny':
      return <Sun className={className} />;
    case 'partly-cloudy':
      return <CloudSun className={className} />;
    case 'cloudy':
      return <Cloud className={className} />;
    case 'rainy':
      return <CloudRain className={className} />;
    case 'snowy':
      return <CloudSnow className={className} />;
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

function generateWeatherData(): WeatherData {
  const condition = pick(CONDITIONS);
  const temp = condition === 'snowy' ? rand(-5, 5) : condition === 'rainy' ? rand(8, 20) : rand(15, 38);
  const high = temp + rand(2, 6);
  const low = temp - rand(2, 6);

  const hours = ['Now', '1PM', '2PM', '3PM', '4PM', '5PM', '6PM', '7PM'];
  const hourly = hours.map((time, i) => ({
    time,
    temp: temp + rand(-3, 3) - i,
    condition: pick(CONDITIONS.slice(0, condition === 'snowy' ? 5 : condition === 'rainy' ? 4 : 3)),
  }));

  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  const daily = days.map((day) => ({
    day,
    high: temp + rand(0, 8),
    low: temp - rand(2, 8),
    condition: pick(CONDITIONS),
  }));

  return {
    condition,
    temperature: temp,
    high,
    low,
    location: pick(LOCATIONS),
    description: pick(DESCRIPTIONS[condition]),
    humidity: rand(30, 90),
    windSpeed: rand(3, 35),
    uvIndex: rand(1, 11),
    visibility: rand(5, 20),
    hourly,
    daily,
  };
}

export default function Weather() {
  const [data, setData] = useState<WeatherData | null>(null);

  useEffect(() => {
    const rafId = requestAnimationFrame(() => {
      setData(generateWeatherData());
    });
    return () => cancelAnimationFrame(rafId);
  }, []);

  const refresh = useCallback(() => {
    setData(generateWeatherData());
  }, []);

  if (!data) {
    return (
      <div className="bg-gradient-to-br from-sky-600 to-blue-800 text-white h-full flex items-center justify-center">
        <span className="text-white/40 text-sm">Loading...</span>
      </div>
    );
  }

  return (
    <div className={`${getGradient(data.condition)} text-white h-full overflow-y-auto select-none`}>
      {/* Header with refresh */}
      <div className="flex items-center justify-between px-4 pt-3">
        <span className="text-xs font-medium opacity-60">Weather</span>
        <button
          onClick={refresh}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Refresh weather"
        >
          <RefreshCw className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
        </button>
      </div>

      {/* Current weather */}
      <div className="text-center py-6 px-4">
        <div className="flex justify-center mb-2">
          {getConditionIconJsx(data.condition, 'w-14 h-14')}
        </div>
        <div className="text-7xl font-thin leading-none mb-1">
          {data.temperature}°
        </div>
        <div className="text-sm font-medium opacity-80 mt-2">{data.location}</div>
        <div className="text-sm opacity-60 mt-0.5">{data.description}</div>
        <div className="flex justify-center gap-4 mt-2 text-xs opacity-70">
          <span>H: {data.high}°</span>
          <span>L: {data.low}°</span>
        </div>
      </div>

      {/* Hourly forecast */}
      <div className="px-4 pb-3">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="flex gap-4 overflow-x-auto py-1 px-1 scrollbar-thin">
            {data.hourly.map((hour, i) => (
              <div key={i} className="flex flex-col items-center gap-1 min-w-[60px]">
                <span className="text-[10px] opacity-60">{hour.time}</span>
                {getConditionIconJsx(hour.condition, 'w-4 h-4')}
                <span className="text-xs font-medium">{hour.temp}°</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="px-4 pb-3">
        <div className="bg-white/10 rounded-xl p-3">
          <div className="text-[10px] uppercase tracking-wider opacity-50 mb-2">5-Day Forecast</div>
          <div className="space-y-2">
            {data.daily.map((day, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="w-10 opacity-70">{day.day}</span>
                {getConditionIconJsx(day.condition, 'w-4 h-4')}
                <div className="flex gap-3 text-xs">
                  <span className="opacity-50">{day.low}°</span>
                  <span>{day.high}°</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Weather details */}
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Droplets className="w-3.5 h-3.5 opacity-50" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">Humidity</span>
            </div>
            <div className="text-lg font-medium">{data.humidity}%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Wind className="w-3.5 h-3.5 opacity-50" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">Wind</span>
            </div>
            <div className="text-lg font-medium">{data.windSpeed} km/h</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Thermometer className="w-3.5 h-3.5 opacity-50" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">UV Index</span>
            </div>
            <div className="text-lg font-medium">{data.uvIndex}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Eye className="w-3.5 h-3.5 opacity-50" />
              <span className="text-[10px] uppercase tracking-wider opacity-50">Visibility</span>
            </div>
            <div className="text-lg font-medium">{data.visibility} km</div>
          </div>
        </div>
      </div>
    </div>
  );
}
