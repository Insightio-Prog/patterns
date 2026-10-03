import AsyncStorage from '@react-native-async-storage/async-storage';



import type { CachedInsight, LogEntry, TrackerConfig } from '@/types';

import { attachWeatherToLog } from '@/utils/weatherService';



export const FALLBACK_CONFIG: TrackerConfig = {

  profile: 'general',

  subject: 'you',

  trackingGoal: 'Track daily patterns',

  modules: [

    { type: 'scale', props: { label: 'DAILY RATING' } },

    { type: 'note', props: { label: 'NOTES' } },

  ],

  terminology: {

    subject: 'you',

    event: 'entry',

    mealDraft: 'MEAL',

    timerSession: 'SESSION',

    pdfRecipient: 'GP',

  },

  aiContext: 'General daily pattern tracking.',

};



export const STORAGE_KEYS = {

  config: 'patterns.config.v1',

  onboarding: 'patterns.onboarding.v1',

  insight: 'patterns.insight.v1',

} as const;



function getTodayDateKey(): string {

  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, '0');

  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;

}



export function getDayLogsKey(date?: string): string {

  const dateKey = date ?? getTodayDateKey();

  return `patterns.logs.v1.${dateKey}`;

}



export async function saveTrackerConfig(config: TrackerConfig): Promise<void> {

  await AsyncStorage.setItem(STORAGE_KEYS.config, JSON.stringify(config));

}



export async function setOnboardingComplete(): Promise<void> {

  await AsyncStorage.setItem(STORAGE_KEYS.onboarding, 'true');

}



export async function getTrackerConfig(): Promise<TrackerConfig | null> {

  try {

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.config);

    if (!raw) {

      return null;

    }

    return JSON.parse(raw) as TrackerConfig;

  } catch {

    return null;

  }

}



export async function isOnboardingComplete(): Promise<boolean> {

  try {

    const value = await AsyncStorage.getItem(STORAGE_KEYS.onboarding);

    return value === 'true';

  } catch {

    return false;

  }

}



export async function getDayLogs(date?: string): Promise<LogEntry[]> {

  try {

    const raw = await AsyncStorage.getItem(getDayLogsKey(date));

    if (!raw) {

      return [];

    }

    const parsed = JSON.parse(raw) as unknown;

    return Array.isArray(parsed) ? (parsed as LogEntry[]) : [];

  } catch {

    return [];

  }

}



export async function appendLog(entry: LogEntry): Promise<void> {

  try {

    const key = getDayLogsKey();

    const existing = await getDayLogs();

    let enrichedEntry: LogEntry = entry;

    try {

      const [withWeather] = await attachWeatherToLog([

        entry as LogEntry & Record<string, unknown>,

      ]);

      enrichedEntry = withWeather as LogEntry;

    } catch {

      // fail silently — log without weather metadata

    }

    await AsyncStorage.setItem(key, JSON.stringify([...existing, enrichedEntry]));

  } catch {

    // fail silently

  }

}



export async function getCachedInsight(): Promise<CachedInsight | null> {

  try {

    const raw = await AsyncStorage.getItem(STORAGE_KEYS.insight);

    if (!raw) {

      return null;

    }

    return JSON.parse(raw) as CachedInsight;

  } catch {

    return null;

  }

}



export async function saveCustomItem(item: string): Promise<void> {

  try {

    const config = await getTrackerConfig();

    if (!config) {

      return;

    }



    const normalized = item.trim();

    if (!normalized) {

      return;

    }



    const chipsModule = config.modules.find((module) => module.type === 'chips');

    if (!chipsModule) {

      return;

    }



    const items = Array.isArray(chipsModule.props.items)

      ? (chipsModule.props.items as string[])

      : [];



    const exists = items.some(

      (known) => known.toLowerCase() === normalized.toLowerCase(),

    );

    if (exists) {

      return;

    }



    chipsModule.props.items = [...items, normalized];

    await saveTrackerConfig(config);

  } catch {

    // fail silently

  }

}


