import AsyncStorage from '@react-native-async-storage/async-storage';

import { fetchPollenSnapshot, type PollenSnapshot } from '@/components/EnvironmentModule';

export const POLLEN_SNAPSHOT_STORAGE_KEY = 'patterns.pollenSnapshot.v1';

const REFETCH_TTL_MS = 3 * 60 * 60 * 1000;
const MOVE_THRESHOLD_KM = 1;

export interface StoredPollenSnapshot extends PollenSnapshot {
  fetchedAtTs: number;
  lat: number;
  lng: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const earthRadiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLng / 2) ** 2;

  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function parseStoredPollenSnapshot(raw: unknown): StoredPollenSnapshot | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const record = raw as Record<string, unknown>;

  if (
    typeof record.fetchedAtTs !== 'number' ||
    typeof record.lat !== 'number' ||
    typeof record.lng !== 'number' ||
    typeof record.tree !== 'string' ||
    typeof record.grass !== 'string' ||
    typeof record.weed !== 'string' ||
    typeof record.dominantPollen !== 'string'
  ) {
    return null;
  }

  return {
    fetchedAtTs: record.fetchedAtTs,
    lat: record.lat,
    lng: record.lng,
    tree: record.tree as PollenSnapshot['tree'],
    grass: record.grass as PollenSnapshot['grass'],
    weed: record.weed as PollenSnapshot['weed'],
    dominantPollen: record.dominantPollen,
  };
}

export function shouldRefetchPollen(
  cached: StoredPollenSnapshot | null,
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

export async function getPollenSnapshot(): Promise<StoredPollenSnapshot | null> {
  try {
    const raw = await AsyncStorage.getItem(POLLEN_SNAPSHOT_STORAGE_KEY);

    if (!raw) {
      return null;
    }

    return parseStoredPollenSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return null;
  }
}

export async function fetchAndCachePollen(
  lat: number,
  lng: number,
): Promise<StoredPollenSnapshot | null> {
  try {
    const snapshot = await fetchPollenSnapshot(lat, lng);

    if (!snapshot) {
      return null;
    }

    const stored: StoredPollenSnapshot = {
      ...snapshot,
      fetchedAtTs: Date.now(),
      lat,
      lng,
    };

    await AsyncStorage.setItem(
      POLLEN_SNAPSHOT_STORAGE_KEY,
      JSON.stringify(stored),
    );

    return stored;
  } catch {
    return null;
  }
}
