import AsyncStorage from '@react-native-async-storage/async-storage';

import type { WeatherSnapshot } from '@/types';
import { haversineDistanceKm } from '@/utils/pollen-service';

export const WEATHER_SNAPSHOT_STORAGE_KEY = 'patterns.weatherSnapshot.v1';

const WEATHER_API_URL = 'https://api.insightio.co.uk';
const REFETCH_TTL_MS = 3 * 60 * 60 * 1000;
const ATTACH_TTL_MS = 6 * 60 * 60 * 1000;
const MOVE_THRESHOLD_KM = 1;

function toCelsius(degrees: number, unit: string): number {
  const normalizedUnit = unit.trim().toUpperCase();

  if (
    normalizedUnit.includes('FAHRENHEIT') ||
    normalizedUnit === 'F' ||
    normalizedUnit === '°F'
  ) {
    return ((degrees - 32) * 5) / 9;
  }

  return degrees;
}

function normalizeConditions(data: Record<string, unknown>): string {
  const condition = data.weatherCondition;

  if (condition && typeof condition === 'object') {
    const conditionRecord = condition as Record<string, unknown>;

    if (typeof conditionRecord.type === 'string') {
      return mapConditionType(conditionRecord.type);
    }

    const description = conditionRecord.description;

    if (description && typeof description === 'object') {
      const text = (description as Record<string, unknown>).text;

      if (typeof text === 'string') {
        return text.replace(/\s+/g, ' ').trim().toUpperCase();
      }
    }
  }

  if (typeof data.conditions === 'string') {
    return data.conditions.replace(/\s+/g, ' ').trim().toUpperCase();
  }

  return 'UNKNOWN';
}

function mapConditionType(type: string): string {
  const normalized = type.trim().toUpperCase();

  if (normalized === 'CLEAR') {
    return 'SUNNY';
  }

  if (normalized.includes('RAIN') || normalized.includes('SHOWER')) {
    return 'RAIN';
  }

  if (normalized.includes('CLOUD')) {
    return normalized.includes('MOSTLY') ? 'OVERCAST' : 'CLOUDY';
  }

  return normalized.replace(/\s+/g, '_');
}

function parseTemperatureC(data: Record<string, unknown>): number {
  const temperature = data.temperature;

  if (temperature && typeof temperature === 'object') {
    const temperatureRecord = temperature as Record<string, unknown>;
    const degrees =
      typeof temperatureRecord.degrees === 'number'
        ? temperatureRecord.degrees
        : typeof temperatureRecord.value === 'number'
          ? temperatureRecord.value
          : null;
    const unit =
      typeof temperatureRecord.unit === 'string'
        ? temperatureRecord.unit
        : 'CELSIUS';

    if (degrees === null) {
      return 0;
    }

    return toCelsius(degrees, unit);
  }

  if (typeof temperature === 'number') {
    return temperature;
  }

  return 0;
}

function parseHumidity(data: Record<string, unknown>): number {
  if (typeof data.relativeHumidity === 'number') {
    return data.relativeHumidity;
  }

  if (typeof data.humidity === 'number') {
    return data.humidity;
  }

  return 0;
}

function parseUvIndex(data: Record<string, unknown>): number | undefined {
  if (typeof data.uvIndex === 'number') {
    return data.uvIndex;
  }

  return undefined;
}

function parseWindSpeedKph(data: Record<string, unknown>): number | undefined {
  const wind = data.wind;

  if (!wind || typeof wind !== 'object') {
    if (typeof data.windSpeed === 'number') {
      return data.windSpeed;
    }

    return undefined;
  }

  const windRecord = wind as Record<string, unknown>;
  const speed = windRecord.speed;

  if (!speed || typeof speed !== 'object') {
    return undefined;
  }

  const speedRecord = speed as Record<string, unknown>;
  const value =
    typeof speedRecord.value === 'number'
      ? speedRecord.value
      : typeof speedRecord.kilometersPerHour === 'number'
        ? speedRecord.kilometersPerHour
        : null;

  if (value === null) {
    return undefined;
  }

  const unit =
    typeof speedRecord.unit === 'string'
      ? speedRecord.unit.toUpperCase()
      : 'KILOMETERS_PER_HOUR';

  if (unit.includes('MILE')) {
    return value * 1.60934;
  }

  return value;
}

function parseWeatherSnapshot(
  data: unknown,
  lat: number,
  lng: number,
): WeatherSnapshot | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const temperatureC = parseTemperatureC(record);

  return {
    fetchedAtTs: Date.now(),
    lat,
    lng,
    temperatureC,
    temperatureF: (temperatureC * 9) / 5 + 32,
    humidity: parseHumidity(record),
    conditions: normalizeConditions(record),
    uvIndex: parseUvIndex(record),
    windSpeedKph: parseWindSpeedKph(record),
  };
}

function parseStoredWeatherSnapshot(raw: unknown): WeatherSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (
    typeof record.fetchedAtTs !== 'number' ||
    typeof record.lat !== 'number' ||
    typeof record.lng !== 'number' ||
    typeof record.temperatureC !== 'number' ||
    typeof record.temperatureF !== 'number' ||
    typeof record.humidity !== 'number' ||
    typeof record.conditions !== 'string'
  ) {
    return null;
  }

  return {
    fetchedAtTs: record.fetchedAtTs,
    lat: record.lat,
    lng: record.lng,
    temperatureC: record.temperatureC,
    temperatureF: record.temperatureF,
    humidity: record.humidity,
    conditions: record.conditions,
    uvIndex:
      typeof record.uvIndex === 'number' ? record.uvIndex : undefined,
    windSpeedKph:
      typeof record.windSpeedKph === 'number'
        ? record.windSpeedKph
        : undefined,
  };
}

export function shouldRefetchWeather(
  cached: WeatherSnapshot | null,
  currentLat: number,
  currentLng: number,
): boolean {
  if (!cached) {
    return true;
  }

  if (Date.now() - cached.fetchedAtTs > REFETCH_TTL_MS) {
    return true;
  }

  return (
    haversineDistanceKm(cached.lat, cached.lng, currentLat, currentLng) >
    MOVE_THRESHOLD_KM
  );
}

export async function getWeatherSnapshot(): Promise<WeatherSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(WEATHER_SNAPSHOT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return parseStoredWeatherSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function fetchAndCacheWeather(
  lat: number,
  lng: number,
): Promise<WeatherSnapshot | null> {
  try {
    const response = await fetch(WEATHER_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'weather',
        location: { lat, lng },
      }),
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;
    const snapshot = parseWeatherSnapshot(data, lat, lng);

    if (!snapshot) {
      return null;
    }

    await AsyncStorage.setItem(
      WEATHER_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(snapshot),
    );

    return snapshot;
  } catch {
    return null;
  }
}

export async function attachWeatherToLog<T extends Record<string, unknown>>(
  logEntries: T[],
): Promise<T[]> {
  try {
    const snapshot = await getWeatherSnapshot();

    if (!snapshot) {
      return logEntries;
    }

    if (Date.now() - snapshot.fetchedAtTs > ATTACH_TTL_MS) {
      return logEntries;
    }

    return logEntries.map((entry) => ({
      ...entry,
      _weather: snapshot,
    }));
  } catch {
    return logEntries;
  }
}
