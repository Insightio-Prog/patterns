import AsyncStorage from '@react-native-async-storage/async-storage';

import { getDayLogsKey } from '@/storage/storage';
import type { LogEntry, TrackerConfig } from '@/types';
import { generateId } from '@/utils/generateId';

// How "heavy" each of the last six days was (0 to 1). Output rows (severity,
// mood...) follow the same pattern as the inputs, so the correlation chart
// has something real-looking to show.
const DAY_LOAD: Record<number, number> = { 1: 0.7, 2: 0.3, 3: 0.9, 4: 0.5, 5: 0.2, 6: 0.8 };
const SAMPLE_DAYS = [6, 5, 4, 3, 2, 1];

type Row = {
  id: string;
  type: string;
  label?: string;
  options?: string[];
  max?: number;
  unit?: string;
};

function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function rowValue(row: Row, load: number): { type: string; value: unknown } | null {
  switch (row.type) {
    case 'scale': {
      const max = row.max === 10 ? 10 : 5;
      return { type: 'scale', value: Math.max(1, Math.min(max, Math.round(1 + load * (max - 1)))) };
    }
    case 'level': {
      const options = row.options && row.options.length === 3 ? row.options : ['LOW', 'NORMAL', 'HIGH'];
      return { type: 'level', value: options[load > 0.66 ? 2 : load > 0.33 ? 1 : 0] };
    }
    case 'toggle':
      return { type: 'toggle', value: load > 0.5 };
    case 'chips': {
      const options = row.options ?? [];
      if (options.length === 0) return null;
      const count = load > 0.6 ? 2 : 1;
      const start = Math.floor(load * 10) % options.length;
      const picked = Array.from({ length: count }, (_, i) => options[(start + i) % options.length]);
      return { type: 'chips', value: picked };
    }
    case 'counter':
      return { type: 'counter', value: Math.max(1, Math.round(load * 4)) };
    case 'metric': {
      const unit = (row.unit ?? '').toUpperCase();
      const value =
        unit === 'H' ? Math.round((9 - load * 3) * 2) / 2
        : unit === 'KM' ? Math.round((3 + load * 8) * 2) / 2
        : Math.round(load * 10);
      return { type: 'metric', value };
    }
    case 'timeInput':
      return { type: 'timeInput', value: '22:30' };
    default:
      return null;
  }
}

function logTypeForRow(type: string): string {
  return type === 'metric' ? 'counter' : type;
}

export function canGenerateSampleData(config: TrackerConfig | null): boolean {
  return (config?.modules ?? []).some(
    (module) =>
      module.type === 'custom' ||
      ['scale', 'toggle', 'level', 'chips', 'counter'].includes(module.type),
  );
}

/** Writes about a week of demo entries (flagged `sample`) for the current tracker. */
export async function loadSampleData(config: TrackerConfig): Promise<number> {
  await clearSampleData();
  let written = 0;

  for (const offset of SAMPLE_DAYS) {
    const load = DAY_LOAD[offset];
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const entries: LogEntry[] = [];

    config.modules.forEach((module, moduleIndex) => {
      const at = new Date(date);
      at.setHours(8 + moduleIndex * 3, 10 + moduleIndex, 0, 0);
      const ts = at.toISOString();
      const props = (module.props ?? {}) as Record<string, unknown>;

      if (module.type === 'custom') {
        const moduleId = String(props.moduleId ?? `custom_${moduleIndex}`);
        for (const row of (props.rows as Row[]) ?? []) {
          const value = rowValue(row, load);
          if (!value) continue;
          // Chips and counters repeat on busier days, so inputs vary day to day.
          const reps =
            row.type === 'chips' || row.type === 'counter'
              ? 1 + Math.round(load * 2)
              : row.type === 'scale' && load > 0.6
                ? 2
                : 1;
          for (let rep = 0; rep < reps; rep += 1) {
            const repAt = new Date(at.getTime() + rep * 3 * 60 * 60 * 1000);
            const repTs = repAt.toISOString();
            entries.push({
              id: generateId(),
              timestamp: repTs,
              type: logTypeForRow(row.type) as LogEntry['type'],
              label: row.id,
              value: { id: generateId(), rowId: row.id, moduleId, type: row.type, value, ts: repTs },
              sample: true,
            });
          }
        }
      } else if (['scale', 'toggle', 'level', 'chips', 'counter'].includes(module.type)) {
        const label = String(props.label ?? module.type);
        const value = rowValue({ id: label, type: module.type, options: props.options as string[] | undefined }, load);
        if (value) {
          entries.push({
            id: generateId(),
            timestamp: ts,
            type: module.type as LogEntry['type'],
            label,
            value: value.value,
            sample: true,
          });
        }
      }
    });

    if (entries.length === 0) continue;
    const key = getDayLogsKey(dayKey(date));
    const existingRaw = await AsyncStorage.getItem(key);
    const existing = existingRaw ? (JSON.parse(existingRaw) as LogEntry[]) : [];
    await AsyncStorage.setItem(key, JSON.stringify([...existing, ...entries]));
    written += entries.length;
  }

  return written;
}

/** Removes every entry flagged `sample` from the last 30 days. */
export async function clearSampleData(): Promise<void> {
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const key = getDayLogsKey(dayKey(date));
    const raw = await AsyncStorage.getItem(key);
    if (!raw) continue;
    try {
      const logs = JSON.parse(raw) as LogEntry[];
      const kept = logs.filter((log) => !log.sample);
      if (kept.length === logs.length) continue;
      if (kept.length === 0) await AsyncStorage.removeItem(key);
      else await AsyncStorage.setItem(key, JSON.stringify(kept));
    } catch {
      // ignore unreadable day
    }
  }
}

export async function hasSampleData(): Promise<boolean> {
  for (let offset = 0; offset < 8; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const raw = await AsyncStorage.getItem(getDayLogsKey(dayKey(date)));
    if (raw && raw.includes('"sample":true')) return true;
  }
  return false;
}
