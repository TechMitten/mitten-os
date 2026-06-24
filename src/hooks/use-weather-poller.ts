import { useEffect, useRef } from 'react';
import { useWeatherStore } from '@/stores/weather-store';

export function useWeatherPoller() {
  const initialized = useWeatherStore((s) => s.initialized);
  const initialize = useWeatherStore((s) => s.initialize);
  const fetchWeather = useWeatherStore((s) => s.fetchWeather);
  const savedLoc = useWeatherStore((s) => s.savedLoc);
  const tempUnit = useWeatherStore((s) => s.tempUnit);
  const refreshInterval = useWeatherStore((s) => s.refreshInterval);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize store on mount
  useEffect(() => {
    if (!initialized) {
      initialize();
    }
  }, [initialized, initialize]);

  // Fetch weather on load/location/unit change
  useEffect(() => {
    if (initialized) {
      fetchWeather(savedLoc.latitude, savedLoc.longitude, savedLoc.name, tempUnit);
    }
  }, [initialized, savedLoc.latitude, savedLoc.longitude, savedLoc.name, tempUnit, fetchWeather]);

  // Setup interval polling
  useEffect(() => {
    if (!initialized) return;

    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // If refreshInterval is 0 (Manual) or less, do not auto refresh
    if (refreshInterval <= 0) return;

    // Start interval timer
    timerRef.current = setInterval(() => {
      fetchWeather(savedLoc.latitude, savedLoc.longitude, savedLoc.name, tempUnit);
    }, refreshInterval * 60 * 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [initialized, refreshInterval, savedLoc, tempUnit, fetchWeather]);
}
