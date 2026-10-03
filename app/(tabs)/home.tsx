import AsyncStorage from '@react-native-async-storage/async-storage';

import * as Haptics from 'expo-haptics';

import { router, type Href } from 'expo-router';

import * as Location from 'expo-location';

import { StatusBar } from 'expo-status-bar';

import { IconPencil, IconSettings } from '@tabler/icons-react-native';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useFocusEffect } from '@react-navigation/native';

import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from 'react-native';
import Modal from '@/components/AppModal';

import { SafeAreaView } from 'react-native-safe-area-context';



import ChecklistModule, { type ChecklistItem } from '@/components/ChecklistModule';

import CounterInput from '@/components/CounterInput';

import CorrelationChart from '@/components/CorrelationChart';
import { getModulePage } from '@/utils/modulePages';
import SwipePager from '@/components/SwipePager';

import DiaryModule from '@/components/DiaryModule';

import EnvironmentModule, {

  type EnvironmentEntry,

} from '@/components/EnvironmentModule';

import InsightLine from '@/components/InsightLine';

import LevelSelector, { type Level } from '@/components/LevelSelector';

import MealDraftModule, { type DraftItem } from '@/components/MealDraftModule';

import MultiSelectChips from '@/components/MultiSelectChips';

import NoteInput from '@/components/NoteInput';

import PhotoLog from '@/components/PhotoLog';

import QuickLogChips from '@/components/QuickLogChips';

import ScaleSelector from '@/components/ScaleSelector';

import StatusCard from '@/components/StatusCard';

import TimerModule from '@/components/TimerModule';

import type { DayBar } from '@/components/WeeklyBarChart';

import WeightModule, { type WeightEntry } from '@/components/WeightModule';

import YesNoToggle from '@/components/YesNoToggle';

import CustomModule, {
  normalizeCustomModuleProps,
  type CustomModuleProps,
} from '@/components/modules/CustomModule';

import MedicalModule, {
  type MedicalModuleProps,
} from '@/components/modules/MedicalModule';

import EnvironmentModuleExtended, {
  type EnvironmentModuleExtendedProps,
} from '@/components/modules/EnvironmentModuleExtended';

import FitnessModule, {
  type FitnessModuleProps,
} from '@/components/modules/FitnessModule';

import BabyModule, { type BabyModuleProps } from '@/components/modules/BabyModule';

import SocialModule, {
  type SocialModuleProps,
} from '@/components/modules/SocialModule';

import PlantModule, { type PlantModuleProps } from '@/components/modules/PlantModule';

import AcademicModule, {
  type AcademicModuleProps,
} from '@/components/modules/AcademicModule';

import HobbiesModule, {
  type HobbiesModuleProps,
} from '@/components/modules/HobbiesModule';

import MentalWellbeingModule, {
  type MentalWellbeingModuleProps,
} from '@/components/modules/MentalWellbeingModule';

import PetModule, { type PetModuleProps } from '@/components/modules/PetModule';

import SleepModule, { type SleepModuleProps } from '@/components/modules/SleepModule';

import FoodModule, { type FoodModuleProps } from '@/components/modules/FoodModule';

import MetricsModule, {
  type MetricsModuleProps,
} from '@/components/modules/MetricsModule';

import ModuleRow from '@/components/rows/ModuleRow';

import PatternsMark from '@/components/PatternsMark';

import {
  clearSampleData,
  hasSampleData,
  loadSampleData,
  canGenerateSampleData,
} from '@/storage/sampleData';
import {
  appendLog,

  getCachedInsight,

  getDayLogs,

  getDayLogsKey,

  getTrackerConfig,

} from '@/storage/storage';

import type {

  CachedInsight,

  DiaryEntry,

  DiaryEntryType,

  LogEntry,

  ModuleType,

  TrackerConfig,

  TrackerModule,

} from '@/types';

import type { RowBatchLogEntry, RowType, RowValue } from '@/types/rows';

import {
  formatMediaDiaryLabel,
  isMediaUri,
} from '@/utils/formatDiaryMedia';
import { flattenCategoryModuleProps } from '@/utils/flattenCategoryModuleProps';

import { humanizeVariableName } from '@/utils/humanizeVariableName';

import { termInSentence } from '@/utils/pluralise';

import { generateId } from '@/utils/generateId';

import {
  fetchAndCachePollen,
  getPollenSnapshot,
  shouldRefetchPollen,
} from '@/utils/pollen-service';

import {
  fetchAndCacheWeather,
  getWeatherSnapshot,
  shouldRefetchWeather,
} from '@/utils/weatherService';

import {

  color,

  font,

  fontSize,

  fontWeight,

  letterSpacing,

  radius,

  space,

} from '@/theme/theme';



const HEADER_HEIGHT = 56;

const SETTINGS_BUTTON_SIZE = 36;

const BOTTOM_BUFFER_HEIGHT = 48;

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const CATEGORY_SUPER_MODULE_TYPES = new Set<ModuleType>([
  'medical',
  'metrics',
  'food',
  'environmentExtended',
  'sleep',
  'fitness',
  'pet',
  'mentalWellbeing',
  'hobbies',
  'academic',
  'plant',
  'baby',
  'social',
  'custom',
]);

function needsModuleLabel(type: ModuleType): boolean {
  return !CATEGORY_SUPER_MODULE_TYPES.has(type);
}

function resolveModuleLabel(
  type: ModuleType,
  props: Record<string, unknown>,
  _config: TrackerConfig,
): string | null {
  if (typeof props.label === 'string' && props.label) {
    return props.label;
  }

  if (!needsModuleLabel(type)) {
    return '';
  }

  switch (type) {
    case 'note':
      return 'ADDITIONAL NOTES';
    case 'diary':
      return 'DAILY SUMMARY';
    case 'correlationChart':
      return 'CORRELATION';
    default:
      return null;
  }
}

function shouldRenderModule(
  module: TrackerModule,
  config: TrackerConfig,
): boolean {
  if (module.props == null) {
    return false;
  }

  if (module.type === 'custom') {
    return (
      normalizeCustomModuleProps(
        module.props as Record<string, unknown>,
      ) !== null
    );
  }

  if (CATEGORY_SUPER_MODULE_TYPES.has(module.type)) {
    return true;
  }

  const props = flattenCategoryModuleProps(
    module.type,
    module.props as Record<string, unknown>,
  );

  return resolveModuleLabel(module.type, props, config) !== null;
}

function warnSkippedModule(type: ModuleType): void {
  if (__DEV__) {
    console.warn('[ConfigModule] skipped unknown/invalid module:', type);
  }
}

function mapRowTypeToLogType(type: RowType): ModuleType {
  if (type === 'metric') {
    return 'counter';
  }

  if (type === 'checklist') {
    return 'checklist';
  }

  if (type === 'timeInput') {
    return 'timeInput';
  }

  return type;
}

function getTodayDateKey(): string {

  const now = new Date();

  const year = now.getFullYear();

  const month = String(now.getMonth() + 1).padStart(2, '0');

  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;

}



function isRowBatchLogEntry(value: unknown): value is RowBatchLogEntry {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as RowBatchLogEntry;
  return (
    typeof record.rowId === 'string' &&
    record.value !== null &&
    typeof record.value === 'object' &&
    'type' in record.value &&
    'value' in record.value
  );
}

function formatRowValue(rowValue: RowValue): string {
  switch (rowValue.type) {
    case 'toggle':
      return rowValue.value ? 'YES' : 'NO';
    case 'chips':
      return rowValue.value.map((item) => String(item).toUpperCase()).join(' · ');
    case 'checklist': {
      const ticked = Object.entries(rowValue.value)
        .filter(([, ticked]) => ticked)
        .map(([item]) => String(item).toUpperCase());

      return ticked.join(' · ');
    }
    case 'scale':
    case 'counter':
    case 'metric':
      return String(rowValue.value).toUpperCase();
    case 'level':
    case 'timeInput':
    case 'note':
      return String(rowValue.value).toUpperCase();
    default:
      return String(rowValue).toUpperCase();
  }
}

function formatLogValue(value: unknown): string {

  if (value === null || value === undefined) {

    return '';

  }

  if (isRowBatchLogEntry(value)) {
    return formatRowValue(value.value);
  }

  if (
    typeof value === 'object' &&
    value !== null &&
    'type' in value &&
    'value' in value
  ) {
    return formatRowValue(value as RowValue);
  }

  if (typeof value === 'string') {

    return value.toUpperCase();

  }

  if (typeof value === 'boolean') {

    return value ? 'YES' : 'NO';

  }

  if (typeof value === 'number') {

    return String(value).toUpperCase();

  }

  if (Array.isArray(value)) {

    return value.map((item) => String(item).toUpperCase()).join(' · ');

  }

  if (typeof value === 'object') {

    try {

      return JSON.stringify(value).toUpperCase();

    } catch {

      return '';

    }

  }

  return String(value).toUpperCase();

}



const NON_DIARY_TYPES = new Set<string>(['diary', 'correlationChart']);

/** "mealType" / "meal_type" -> "Meal type" */
function prettifyLabel(raw: string): string {
  const text = String(raw ?? '').trim();

  if (!text) {
    return '';
  }

  // Already human-written (has spaces or is ALL CAPS): leave as is.
  if (/\s/.test(text) || text === text.toUpperCase()) {
    return text;
  }

  const spaced = text
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();

  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);

  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDiaryValue(log: LogEntry): string {
  const value = log.value as any;

  if (log.type === 'mealdraft' && Array.isArray(value)) {
    return value
      .map((item) =>
        [item?.name, item?.quantity && `${item.quantity}${item.unit ?? ''}`]
          .filter(Boolean)
          .join(' '),
      )
      .join(' · ')
      .toUpperCase();
  }

  if (log.type === 'weight' && value && typeof value === 'object') {
    return `${value.value} ${String(value.unit ?? '').toUpperCase()}`.trim();
  }

  if (log.type === 'timer' && typeof value === 'number') {
    return formatDuration(value);
  }

  if (log.type === 'environment' && value && Array.isArray(value.factors)) {
    return value.factors.map((f: unknown) => String(f).toUpperCase()).join(' · ');
  }

  if (log.type === 'checklist' && value && !Array.isArray(value) && typeof value === 'object' && !('type' in value)) {
    return Object.entries(value)
      .filter(([, ticked]) => ticked)
      .map(([item]) => item.toUpperCase())
      .join(' · ');
  }

  return formatLogValue(log.value);
}

/** Custom-card rows log under a generated id; map it back to the row's name. */
function buildRowLabelMap(config: TrackerConfig | null | undefined): Map<string, string> {
  const map = new Map<string, string>();

  for (const module of config?.modules ?? []) {
    if (module.type !== 'custom') {
      continue;
    }

    const rows = (module.props as Record<string, unknown>)?.rows;

    if (!Array.isArray(rows)) {
      continue;
    }

    for (const row of rows) {
      if (row && typeof row.id === 'string' && typeof row.label === 'string') {
        map.set(row.id, row.label);
      }
    }
  }

  return map;
}

function logToDiaryEntry(
  log: LogEntry,
  rowLabels?: Map<string, string>,
): DiaryEntry | null {
  if (NON_DIARY_TYPES.has(String(log.type))) {
    return null;
  }

  const label = rowLabels?.get(String(log.label)) ?? prettifyLabel(log.label);

  if (log.type === 'photo' && typeof log.value === 'string') {
    return {
      id: log.id,
      timestamp: log.timestamp,
      type: 'photo',
      label,
      value: formatMediaDiaryLabel(log.label, log.value),
      mediaUri: log.value,
    };
  }

  const formattedValue = formatDiaryValue(log);

  if (!formattedValue) {
    return null;
  }

  if (isMediaUri(formattedValue)) {
    return {
      id: log.id,
      timestamp: log.timestamp,
      type: log.type as DiaryEntryType,
      label,
      value: formatMediaDiaryLabel(log.label, formattedValue),
      mediaUri: formattedValue,
    };
  }

  return {
    id: log.id,
    timestamp: log.timestamp,
    type: log.type as DiaryEntryType,
    label,
    value: formattedValue,
  };
}

function parseWeightEntries(logs: LogEntry[]): WeightEntry[] {

  return logs

    .filter((log) => log.type === 'weight')

    .map((log) => {

      const value = log.value as { value?: number; unit?: 'kg' | 'lbs' };

      return {

        id: log.id,

        timestamp: log.timestamp,

        value: value?.value ?? 0,

        unit: value?.unit ?? 'kg',

      };

    })

    .filter((entry) => entry.value > 0);

}



function parseEnvironmentEntries(logs: LogEntry[]): EnvironmentEntry[] {

  return logs

    .filter((log) => log.type === 'environment')

    .map((log) => log.value as EnvironmentEntry)

    .filter(

      (entry) =>

        entry &&

        typeof entry === 'object' &&

        typeof entry.id === 'string' &&

        Array.isArray(entry.factors),

    );

}



async function loadLogsForDateRange(days: number): Promise<LogEntry[]> {

  const allLogs: LogEntry[] = [];



  for (let offset = days - 1; offset >= 0; offset -= 1) {

    const date = new Date();

    date.setDate(date.getDate() - offset);

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const dateKey = `${year}-${month}-${day}`;



    try {

      const raw = await AsyncStorage.getItem(getDayLogsKey(dateKey));

      if (raw) {

        const parsed = JSON.parse(raw) as unknown;

        if (Array.isArray(parsed)) {

          allLogs.push(...(parsed as LogEntry[]));

        }

      }

    } catch {

      // fail silently

    }

  }



  return allLogs;

}



// An "episode" is an outcome log. If the tracker names its outcome rows
// (config.eventRows) those are used; trackers with a symptoms module default to
// symptom/severity/pain rows (not meals, caffeine, sleep...). Anything else counts
// every log. One submission writes several rows at once, so rows logged within the
// same minute count as a single episode.
const DEFAULT_EPISODE_ROWS = ['symptoms', 'severity', 'pain'];

function getEpisodeLabels(
  config:
    | { modules?: Array<{ type: string }>; eventRows?: string[] }
    | null
    | undefined,
): Set<string> | null {
  const custom = (config?.eventRows ?? [])
    .map((row) => String(row).trim().toLowerCase())
    .filter(Boolean);

  if (custom.length > 0) {
    return new Set(custom);
  }

  if ((config?.modules ?? []).some((module) => module.type === 'medical')) {
    return new Set(DEFAULT_EPISODE_ROWS);
  }

  return null;
}

function isEpisodeLog(log: LogEntry, labels: Set<string> | null): boolean {
  return labels === null || labels.has(String(log.label).toLowerCase());
}

function countEpisodes(logs: LogEntry[], labels: Set<string> | null): number {
  const minutes = new Set<string>();

  for (const log of logs) {
    if (isEpisodeLog(log, labels)) {
      minutes.add(String(log.timestamp).slice(0, 16));
    }
  }

  return minutes.size;
}

// ---- Swipeable module pages -------------------------------------------------
// Related cards share one swipeable page, so long trackers aren't one endless
// scroll. Notes, the correlation chart and the diary stay below as normal cards.
const UNPAGED_MODULE_TYPES = new Set<ModuleType>([
  'note',
  'diary',
  'correlationChart',
]);


function ModuleSections({
  config,
  todayLogs,
  historyLogs,
  onLog,
  onConfigRefresh,
}: {
  config: TrackerConfig;
  todayLogs: LogEntry[];
  historyLogs: LogEntry[];
  onLog: (type: ModuleType, label: string, value: unknown) => Promise<void>;
  onConfigRefresh: () => Promise<void>;
}) {
  const modules = config.modules ?? [];

  const renderOne = (module: TrackerModule, index: number) => {
    const moduleContent = (
      <ConfigModule
        module={module}
        moduleIndex={index}
        config={config}
        todayLogs={todayLogs}
        historyLogs={historyLogs}
        onLog={onLog}
        onConfigRefresh={onConfigRefresh}
      />
    );

    if (CATEGORY_SUPER_MODULE_TYPES.has(module.type)) {
      return <View key={`${module.type}-${index}`}>{moduleContent}</View>;
    }

    return (
      <View key={`${module.type}-${index}`} style={styles.card}>
        {moduleContent}
      </View>
    );
  };

  const pages: Array<{
    id: string;
    title: string;
    items: Array<{ module: TrackerModule; index: number }>;
  }> = [];
  const tail: Array<{ module: TrackerModule; index: number }> = [];

  modules.forEach((module, index) => {
    if (!shouldRenderModule(module, config)) {
      warnSkippedModule(module.type);
      return;
    }

    if (UNPAGED_MODULE_TYPES.has(module.type)) {
      tail.push({ module, index });
      return;
    }

    const page = getModulePage(module, index);
    const existing = pages.find((candidate) => candidate.id === page.id);

    if (existing) {
      existing.items.push({ module, index });
    } else {
      pages.push({ ...page, items: [{ module, index }] });
    }
  });

  // Only one group? Nothing to swipe between — keep the original flat layout.
  if (pages.length < 2) {
    return (
      <>
        {[...pages.flatMap((page) => page.items), ...tail].map(({ module, index }) =>
          renderOne(module, index),
        )}
      </>
    );
  }

  return (
    <>
      <SwipePager
        pages={pages.map((page) => ({
          key: page.id,
          title: page.title,
          content: (
            <>
              {page.items.map(({ module, index }) => renderOne(module, index))}
            </>
          ),
        }))}
      />
      {tail.map(({ module, index }) => renderOne(module, index))}
    </>
  );
}

function computeStreak(logDates: Set<string>): number {

  let streak = 0;

  const cursor = new Date();



  while (true) {

    const year = cursor.getFullYear();

    const month = String(cursor.getMonth() + 1).padStart(2, '0');

    const day = String(cursor.getDate()).padStart(2, '0');

    const key = `${year}-${month}-${day}`;



    if (!logDates.has(key)) {

      break;

    }



    streak += 1;

    cursor.setDate(cursor.getDate() - 1);

  }



  return streak;

}



function buildWeeklyBars(logDates: Map<string, number>): DayBar[] {

  const bars: DayBar[] = [];



  for (let offset = 6; offset >= 0; offset -= 1) {

    const date = new Date();

    date.setDate(date.getDate() - offset);

    const year = date.getFullYear();

    const month = String(date.getMonth() + 1).padStart(2, '0');

    const day = String(date.getDate()).padStart(2, '0');

    const key = `${year}-${month}-${day}`;



    bars.push({

      day: DAY_LABELS[date.getDay()],

      value: logDates.get(key) ?? 0,

      isToday: offset === 0,

    });

  }



  return bars;

}



const SAMPLE_CORRELATION_INPUT = [1, 3, 2, 4, 1, 3, 4];
const SAMPLE_CORRELATION_OUTPUT = [1, 3, 2, 4, 1, 2, 4];
const LEVEL_WORDS: Record<string, number> = {
  none: 0, low: 1, mild: 1, medium: 2, moderate: 2, high: 3, severe: 3,
};
const OUTPUT_LABEL_PATTERN = /severity|pain|mood|score|rating|intensity|energy/i;

function getLocalDayKey(timestamp: string): string | null {
  const date = new Date(timestamp);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Pull a number out of a log value (scale / level / metric rows), else null. */
function numericLogValue(log: LogEntry): number | null {
  let value: any = log.value;

  // Row logs nest the value: { value: { type, value: 3 } }
  for (let depth = 0; depth < 3; depth += 1) {
    if (value && typeof value === 'object' && !Array.isArray(value) && 'value' in value) {
      value = value.value;
    }
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const asNumber = Number(value);

    if (value.trim() !== '' && Number.isFinite(asNumber)) {
      return asNumber;
    }

    return LEVEL_WORDS[value.trim().toLowerCase()] ?? null;
  }

  return null;
}

interface CorrelationData {
  days: Array<{ day: string; value1: number; value2: number; isToday: boolean }>;
  isSample: boolean;
  insight: string;
}

function buildCorrelationData(
  logs: LogEntry[],
  episodeLabels: Set<string> | null,
  inputLabel: string,
  outputLabel: string,
): CorrelationData {
  const MAX = 5;
  const keys: string[] = [];
  const meta: Array<{ day: string; isToday: boolean }> = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    keys.push(getLocalDayKey(date.toISOString()) ?? '');
    meta.push({ day: DAY_LABELS[date.getDay()], isToday: offset === 0 });
  }

  const input = keys.map(() => 0);
  const output = keys.map(() => 0);

  for (const log of logs) {
    if (log.type === 'note' || NON_DIARY_TYPES.has(String(log.type))) {
      continue;
    }

    const at = keys.indexOf(getLocalDayKey(log.timestamp) ?? '');

    if (at === -1) {
      continue;
    }

    const label = String(log.label).toLowerCase();
    const number = numericLogValue(log);
    const inEpisode = episodeLabels?.has(label) ?? false;
    const isOutput = number !== null && (inEpisode || OUTPUT_LABEL_PATTERN.test(label));

    if (isOutput && number !== null) {
      output[at] = Math.max(output[at], number);
    } else if (!inEpisode) {
      input[at] += log.type === 'mealdraft' && Array.isArray(log.value) ? log.value.length : 1;
    }
  }

  const realDays = keys.filter((_, i) => input[i] > 0 || output[i] > 0).length;

  if (realDays === 0) {
    return {
      isSample: true,
      days: meta.map((m, i) => ({
        ...m,
        value1: SAMPLE_CORRELATION_INPUT[i],
        value2: SAMPLE_CORRELATION_OUTPUT[i],
      })),
      insight: `Example data. Your own ${inputLabel.toLowerCase()} and ${outputLabel.toLowerCase()} replace this as you log.`,
    };
  }

  const days = meta.map((m, i) => ({
    ...m,
    value1: Math.min(input[i], MAX),
    value2: Math.min(output[i], MAX),
  }));
  const both = keys.map((_, i) => i).filter((i) => input[i] > 0 && output[i] > 0);

  if (both.length < 3) {
    return {
      isSample: false,
      days,
      insight: `Building: ${both.length} of 3 days with both ${inputLabel.toLowerCase()} and ${outputLabel.toLowerCase()} logged.`,
    };
  }

  const meanInput = both.reduce((sum, i) => sum + input[i], 0) / both.length;
  const high = both.filter((i) => input[i] >= meanInput);
  const low = both.filter((i) => input[i] < meanInput);
  const avg = (list: number[]) =>
    list.length ? list.reduce((sum, i) => sum + output[i], 0) / list.length : 0;
  const insight =
    high.length && low.length
      ? `${outputLabel} averaged ${avg(high).toFixed(1)} on heavier ${inputLabel.toLowerCase()} days vs ${avg(low).toFixed(1)} on lighter ones.`
      : `Not enough variation in ${inputLabel.toLowerCase()} yet to compare days.`;

  return { isSample: false, days, insight };
}

interface ConfigModuleProps {

  module: TrackerModule;

  moduleIndex: number;

  config: TrackerConfig;

  todayLogs: LogEntry[];

  historyLogs: LogEntry[];

  onLog: (type: ModuleType, label: string, value: unknown) => void;

  onConfigRefresh: () => void;

}



function ConfigModuleInner({

  module,

  moduleIndex,

  config,

  todayLogs,

  historyLogs,

  onLog,

  onConfigRefresh,

}: ConfigModuleProps) {

  const rawProps = module.props as Record<string, unknown>;

  const props = flattenCategoryModuleProps(module.type, rawProps);

  const label = resolveModuleLabel(module.type, props, config) ?? '';



  const [scaleValue, setScaleValue] = useState<number | null>(null);

  const [toggleValue, setToggleValue] = useState<boolean | null>(null);

  const [levelValue, setLevelValue] = useState<Level | null>(null);

  const [counterValue, setCounterValue] = useState(0);



  const rowLabels = useMemo(() => buildRowLabelMap(config), [config]);

  const diaryEntries = useMemo(

    () =>

      todayLogs

        .map((log) => logToDiaryEntry(log, rowLabels))

        .filter((entry): entry is DiaryEntry => entry !== null),

    [todayLogs, rowLabels],

  );



  const weightEntries = useMemo(

    () => parseWeightEntries(historyLogs),

    [historyLogs],

  );



  const environmentEntries = useMemo(

    () => parseEnvironmentEntries(historyLogs).slice(-7),

    [historyLogs],

  );

  const correlationData = useMemo(() => {
    if (module.type !== 'correlationChart') {
      return null;
    }

    const inLabel =
      typeof props.inputLabel === 'string' && props.inputLabel ? props.inputLabel : 'Input';
    const outLabel =
      typeof props.outputLabel === 'string' && props.outputLabel ? props.outputLabel : 'Output';

    return buildCorrelationData(historyLogs, getEpisodeLabels(config), inLabel, outLabel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [historyLogs, config, module.type]);



  switch (module.type) {

    case 'scale':

      return (

        <ScaleSelector

          label={label}

          value={scaleValue}

          onChange={setScaleValue}

          onLog={(value) => onLog('scale', label, value)}

          showTimePicker={props.showTimePicker === true}

        />

      );



    case 'toggle':

      return (

        <YesNoToggle

          label={label}

          value={toggleValue}

          onChange={(value) => {

            setToggleValue(value);

            onLog('toggle', label, value);

          }}

          showTimePicker={props.showTimePicker === true}

        />

      );



    case 'level':

      return (

        <LevelSelector

          label={label}

          value={levelValue}

          onChange={setLevelValue}

          onLog={(value) => onLog('level', label, value)}

          showTimePicker={props.showTimePicker === true}

        />

      );



    case 'chips':

      return (

        <QuickLogChips

          label={label}

          items={Array.isArray(props.items) ? (props.items as string[]) : []}

          onLog={(item, quantity, time) =>

            onLog('chips', label, { item, quantity, time })

          }

          onItemSaved={onConfigRefresh}

          showTimePicker={props.showTimePicker === true}

          showQuantityInput={props.showQuantityInput === true}

        />

      );



    case 'note':

      return (

        <NoteInput

          label={label}

          onSave={(note) => onLog('note', label, note)}

          showTimePicker={props.showTimePicker === true}

        />

      );



    case 'counter':

      return (

        <CounterInput

          label={label}

          value={counterValue}

          onChange={setCounterValue}

          onLog={(value) => onLog('counter', label, value)}

          min={typeof props.min === 'number' ? props.min : undefined}

          max={typeof props.max === 'number' ? props.max : undefined}

          unit={typeof props.unit === 'string' ? props.unit : undefined}

        />

      );



    case 'multiselect':

      return (

        <MultiSelectChips

          label={label}

          options={

            Array.isArray(props.options) ? (props.options as string[]) : []

          }

          onLog={(selected) => onLog('multiselect', label, selected)}

          showTimePicker={props.showTimePicker === true}

        />

      );



    case 'photo':

      return (

        <PhotoLog

          label={label}

          storageKey={

            typeof props.storageKey === 'string'

              ? props.storageKey

              : `photo-${moduleIndex}`

          }

          onLog={(photoUri) => onLog('photo', label, photoUri)}

        />

      );



    case 'diary':

      return <DiaryModule label={label} entries={diaryEntries} />;



    case 'mealdraft':

      return (

        <MealDraftModule

          label={label}

          terminology={config?.terminology?.mealDraft ?? 'MEAL'}

          storageKey={

            typeof props.storageKey === 'string'

              ? props.storageKey

              : `mealdraft-${moduleIndex}`

          }

          enableBarcodeScanner={props.enableBarcodeScanner !== false}

          enableManualEntry={props.enableManualEntry !== false}

          onLog={(items: DraftItem[]) => onLog('mealdraft', label, items)}

        />

      );



    case 'checklist':

      return (

        <ChecklistModule

          label={label}

          items={

            Array.isArray(props.items) ? (props.items as ChecklistItem[]) : []

          }

          onLog={(completed) => onLog('checklist', label, completed)}

          showTimePicker={props.showTimePicker === true}

        />

      );



    case 'weight':

      return (

        <WeightModule

          label={label}

          entries={weightEntries}

          onLog={(value, unit) => onLog('weight', label, { value, unit })}

        />

      );



    case 'timer':

      return (

        <TimerModule

          label={label}

          terminology={config?.terminology?.timerSession ?? 'SESSION'}

          onLog={(seconds) => onLog('timer', label, seconds)}

        />

      );



    case 'environment':

      return (

        <EnvironmentModule

          label={label}

          options={

            Array.isArray(props.options) ? (props.options as string[]) : []

          }

          enablePollenTracking={props.enablePollenTracking === true}

          recentEntries={environmentEntries}

          onLog={(entry) => onLog('environment', label, entry)}

        />

      );



    case 'custom': {
      const customProps = props as unknown as CustomModuleProps;

      return (
        <CustomModule
          title={customProps.title}
          rows={customProps.rows}
          moduleId={customProps.moduleId ?? `custom_${moduleIndex}`}
          onLog={(entries) => {
            for (const entry of entries) {
              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);
            }
          }}
        />
      );
    }

    case 'medical': {

      const medicalProps = props as MedicalModuleProps;

      return (

        <MedicalModule

          {...medicalProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'metrics': {

      const metricsProps = props as MetricsModuleProps;

      return (

        <MetricsModule

          {...metricsProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'food': {

      const foodProps = props as FoodModuleProps;

      return (

        <FoodModule

          {...foodProps}

          onMealLog={(items) => {

            onLog(

              'mealdraft',

              foodProps.mealCardTitle ?? 'MEAL LOG',

              items,

            );

          }}

          onNutritionLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

          onFastingLog={(seconds) => {

            onLog('timer', 'FASTING', seconds);

          }}

        />

      );

    }



    case 'environmentExtended': {

      const environmentProps = props as EnvironmentModuleExtendedProps;

      return (

        <EnvironmentModuleExtended

          {...environmentProps}

          onFactorsLog={(entry) => {

            onLog(

              'environment',

              environmentProps.factorsCardTitle ?? 'ENVIRONMENT',

              entry,

            );

          }}

          onEnvironmentLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'sleep': {

      const sleepProps = props as SleepModuleProps;

      return (

        <SleepModule

          {...sleepProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'fitness': {

      const fitnessProps = props as FitnessModuleProps;

      return (

        <FitnessModule

          {...fitnessProps}

          onExerciseLog={(items) => {

            for (const item of items) {

              onLog(

                'fitness',

                fitnessProps.exerciseCardTitle ?? 'EXERCISES',

                item,

              );

            }

          }}

          onSessionLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

          onWellbeingLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'social': {

      const socialProps = props as SocialModuleProps;

      return (

        <SocialModule

          {...socialProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'baby': {

      const babyProps = props as BabyModuleProps;

      return (

        <BabyModule

          {...babyProps}

          onFeedLog={(entries) => {

            for (const entry of entries) {

              onLog(

                'baby',

                babyProps.feedCardTitle ?? 'FEEDS TODAY',

                entry,

              );

            }

          }}

          onSleepLog={(entries) => {

            for (const entry of entries) {

              onLog(

                'baby',

                babyProps.sleepCardTitle ?? 'SLEEP TODAY',

                entry,

              );

            }

          }}

          onNappyLog={(entries) => {

            for (const entry of entries) {

              onLog(

                'baby',

                babyProps.nappyCardTitle ?? 'NAPPIES TODAY',

                entry,

              );

            }

          }}

          onGrowthLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

          onWellbeingLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'plant': {

      const plantProps = props as PlantModuleProps;

      return (

        <PlantModule

          {...plantProps}

          onCareLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

          onPhotoLog={(photos) => {

            for (const photoUri of photos) {

              onLog(

                'photo',

                plantProps.photoCardTitle ?? 'PHOTO LOG',

                photoUri,

              );

            }

          }}

        />

      );

    }



    case 'academic': {

      const academicProps = props as AcademicModuleProps;

      return (

        <AcademicModule

          {...academicProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'hobbies': {

      const hobbiesProps = props as HobbiesModuleProps;

      return (

        <HobbiesModule

          {...hobbiesProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'mentalWellbeing': {

      const wellbeingProps = props as MentalWellbeingModuleProps;

      return (

        <MentalWellbeingModule

          {...wellbeingProps}

          onLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

        />

      );

    }



    case 'correlationChart': {
      const inputKey =
        typeof props.input === 'string' ? props.input : 'input';
      const outputKey =
        typeof props.output === 'string' ? props.output : 'output';
      const inputLabel =
        typeof props.inputLabel === 'string' && props.inputLabel
          ? props.inputLabel
          : humanizeVariableName(inputKey) || 'Input';
      const outputLabel =
        typeof props.outputLabel === 'string' && props.outputLabel
          ? props.outputLabel
          : humanizeVariableName(outputKey) || 'Output';
      const data =
        correlationData ??
        buildCorrelationData(historyLogs, getEpisodeLabels(config), inputLabel, outputLabel);

      return (
        <View style={data.isSample ? { opacity: 0.6 } : undefined}>
          <CorrelationChart
            label={data.isSample ? `${label} · SAMPLE DATA` : label}
            days={data.days}
            inputLabel={inputLabel}
            outputLabel={outputLabel}
            kicker={data.isSample ? 'SAMPLE · NOT YOUR DATA' : 'CORRELATION'}
            insight={data.insight}
            boldTerms={[inputLabel, outputLabel]}
          />
        </View>
      );
    }

    case 'timeInput':
      return (
        <ModuleRow
          config={{
            id: `time-${moduleIndex}`,
            type: 'timeInput',
            label: label || 'TIME',
            placeholder:
              typeof props.placeholder === 'string'
                ? props.placeholder
                : undefined,
          }}
          value={null}
          onChange={(value) => {
            if (value) {
              onLog('timeInput', label || 'TIME', value);
            }
          }}
          moduleId={`time-${moduleIndex}`}
        />
      );

    case 'pet': {

      const petProps = props as PetModuleProps;

      return (

        <PetModule

          {...petProps}

          onFoodLog={(items) => {

            onLog(

              'mealdraft',

              petProps.foodCardTitle ?? 'FOOD & WATER',

              items,

            );

          }}

          onHealthLog={(entries) => {

            for (const entry of entries) {

              onLog(mapRowTypeToLogType(entry.type), entry.rowId, entry);

            }

          }}

          onPhotoLog={(photos) => {

            for (const photoUri of photos) {

              onLog(

                'photo',

                petProps.photoCardTitle ?? 'PHOTO LOG',

                photoUri,

              );

            }

          }}

        />

      );

    }



    default:

      warnSkippedModule(module.type);

      return null;

  }

}



function ConfigModule(props: ConfigModuleProps) {

  try {

    if (!shouldRenderModule(props.module, props.config)) {

      warnSkippedModule(props.module.type);

      return null;

    }



    return <ConfigModuleInner {...props} />;

  } catch {

    warnSkippedModule(props.module.type);

    return null;

  }

}



async function syncBackgroundEnvironmentData(): Promise<void> {

  try {

    const permission = await Location.requestForegroundPermissionsAsync();

    if (permission.status !== 'granted') {

      return;

    }



    const position = await Location.getCurrentPositionAsync({

      accuracy: Location.Accuracy.Balanced,

    });

    const lat = position.coords.latitude;

    const lng = position.coords.longitude;

    const [cachedPollen, cachedWeather] = await Promise.all([

      getPollenSnapshot(),

      getWeatherSnapshot(),

    ]);



    if (shouldRefetchPollen(cachedPollen, lat, lng)) {

      void fetchAndCachePollen(lat, lng);

    }



    if (shouldRefetchWeather(cachedWeather, lat, lng)) {

      void fetchAndCacheWeather(lat, lng);

    }

  } catch {

    // fail silently

  }

}



export default function HomeScreen() {

  const [config, setConfig] = useState<TrackerConfig | null>(null);

  const [loading, setLoading] = useState(true);

  const [todayLogs, setTodayLogs] = useState<LogEntry[]>([]);

  const [historyLogs, setHistoryLogs] = useState<LogEntry[]>([]);

  const [cachedInsight, setCachedInsight] = useState<CachedInsight | null>(null);

  const [resetModalVisible, setResetModalVisible] = useState(false);
  const [sampleLoaded, setSampleLoaded] = useState(false);
  const [sampleBusy, setSampleBusy] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(true);



  const refreshData = useCallback(async (trackerConfig: TrackerConfig) => {

    try {

      const [today, history, insight] = await Promise.all([

        getDayLogs(),

        loadLogsForDateRange(30),

        getCachedInsight(),

      ]);

      setTodayLogs(today);

      setHistoryLogs(history);

      setCachedInsight(insight);

      setConfig(trackerConfig);

    } catch {

      // fail silently

    }

  }, []);



  useFocusEffect(

    useCallback(() => {

      void syncBackgroundEnvironmentData();

    }, []),

  );



  useEffect(() => {

    const init = async () => {

      try {

        const trackerConfig = await getTrackerConfig();

        if (!trackerConfig) {

          router.replace('/launch-fork' as Href);

          return;

        }

        // TODO: remove debug logging
        console.log(
          '[PATTERNS CONFIG — LOADED]',
          JSON.stringify(trackerConfig, null, 2),
        );

        await refreshData(trackerConfig);

      } catch {

        router.replace('/launch-fork' as Href);

      } finally {

        setLoading(false);

      }

    };



    void init();

  }, [refreshData]);



  const handleLog = useCallback(

    async (type: ModuleType, label: string, value: unknown) => {

      const entry: LogEntry = {

        id: generateId(),

        timestamp: new Date().toISOString(),

        type,

        label,

        value,

      };



      await appendLog(entry);

      setTodayLogs((current) => [...current, entry]);

      setHistoryLogs((current) => [...current, entry]);

    },

    [],

  );



  const handleConfigRefresh = useCallback(async () => {

    try {

      const trackerConfig = await getTrackerConfig();

      if (trackerConfig) {

        setConfig(trackerConfig);

      }

    } catch {

      // fail silently

    }

  }, []);



  const handleSettingsPress = () => {

    if (__DEV__ || Platform.OS === 'web') {

      setResetModalVisible(true);

      return;

    }

    router.push('/settings');

  };



  const handleEditPress = () => {

    router.push({

      pathname: '/builder-canvas',

      params: { mode: 'edit' },

    } as Href);

  };



  const HINT_KEY = 'patterns.hint.v1';
  useEffect(() => {
    void (async () => {
      try {
        setHintDismissed((await AsyncStorage.getItem(HINT_KEY)) === 'true');
      } catch {
        setHintDismissed(false);
      }
    })();
  }, []);
  const dismissHint = () => {
    setHintDismissed(true);
    void AsyncStorage.setItem(HINT_KEY, 'true').catch(() => undefined);
  };
  useEffect(() => {
    if (resetModalVisible) {
      void hasSampleData().then(setSampleLoaded).catch(() => undefined);
    }
  }, [resetModalVisible]);
  const handleSampleToggle = async () => {
    if (!config || sampleBusy) return;
    setSampleBusy(true);
    try {
      if (sampleLoaded) {
        await clearSampleData();
      } else {
        await loadSampleData(config);
      }
      await refreshData(config);
      setSampleLoaded(!sampleLoaded);
    } finally {
      setSampleBusy(false);
    }
    setResetModalVisible(false);
  };
  const handleResetConfirm = async () => {

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {

      await AsyncStorage.clear();

    } catch {

      // fail silently

    }

    setResetModalVisible(false);

    router.replace('/launch-fork' as Href);

  };



  const stats = useMemo(() => {

    const episodeLabels = getEpisodeLabels(config);

    const episodeMinutes = new Set<string>();

    const logDates = new Map<string, number>();

    const uniqueDates = new Set<string>();



    historyLogs.forEach((log) => {

      const date = new Date(log.timestamp);

      if (Number.isNaN(date.getTime())) {

        return;

      }

      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      uniqueDates.add(key);

      if (isEpisodeLog(log, episodeLabels)) {
        const minuteKey = String(log.timestamp).slice(0, 16);

        if (!episodeMinutes.has(minuteKey)) {
          episodeMinutes.add(minuteKey);
          logDates.set(key, (logDates.get(key) ?? 0) + 1);
        }
      }

    });



    const todayKey = getTodayDateKey();

    const todayCount = countEpisodes(todayLogs, episodeLabels);

    const eventTerm = config?.terminology?.event ?? 'entry';

    const subjectTerm = config?.terminology?.subject ?? 'you';



    const summary =

      todayCount === 0

        ? `No ${termInSentence(eventTerm, 0, false)} logged yet today.`

        : `${todayCount} ${termInSentence(eventTerm, todayCount, false)} logged today.`;



    return {

      dayCount: uniqueDates.size || (todayCount > 0 ? 1 : 0),

      streakCount: computeStreak(uniqueDates),

      summary,

      weeklyBars: buildWeeklyBars(logDates),

      chartLabel: `This week — ${subjectTerm}`,

    };

  }, [config, historyLogs, todayLogs]);



  const weekTotal = stats.weeklyBars.reduce((sum, bar) => sum + bar.value, 0);

  if (loading || !config) {

    return null;

  }



  const statusInsight = cachedInsight ?? {

    kicker: 'PATTERN · TODAY',

    insight: `Keep logging to spot patterns for ${config?.terminology?.subject ?? 'you'}.`,

    boldTerms: [config?.terminology?.subject ?? 'you'],

  };



  return (

    <SafeAreaView style={styles.safeArea} edges={['top']}>

      <View style={{ flex: 1 }}>

        <StatusBar style="light" />



        <View style={styles.header}>

          <TouchableOpacity

            style={styles.headerIconButton}

            onPress={handleEditPress}>

            <IconPencil size={22} color={color.text2} strokeWidth={1.5} />

          </TouchableOpacity>

          <View style={styles.headerCenter}>

            <PatternsMark />

          </View>

          <TouchableOpacity

            style={styles.headerIconButton}

            onPress={handleSettingsPress}>

            <IconSettings size={20} color={color.accent} strokeWidth={1.5} />

          </TouchableOpacity>

        </View>



        <View style={styles.tabBar}>

          <ScrollView

            horizontal

            showsHorizontalScrollIndicator={false}

            contentContainerStyle={styles.tabRow}>

            <View style={[styles.tab, styles.tabActive]}>

              <Text style={[styles.tabLabel, styles.tabLabelActive]}>

                {config?.name?.trim() || (config?.terminology?.subject ?? 'you')}

              </Text>

            </View>

          </ScrollView>

        </View>



        <ScrollView

          style={styles.scroll}

          contentContainerStyle={styles.scrollContent}

          showsVerticalScrollIndicator={false}>

          {!hintDismissed && todayLogs.length === 0 && historyLogs.length === 0 ? (
            <TouchableOpacity style={styles.hintRow} onPress={dismissHint}>
              <Text style={styles.hintText}>
                Tap a card to log something. Swipe between tabs to see more. Tap here to hide this.
              </Text>
            </TouchableOpacity>
          ) : null}
          <StatusCard 

            subjectName={config?.terminology?.subject ?? 'you'}

            dayCount={stats.dayCount}

            streakCount={stats.streakCount}

            summary={stats.summary}

            kicker={statusInsight.kicker}

            insight={statusInsight.insight}

            boldTerms={statusInsight.boldTerms}

          weekBars={stats.weeklyBars}
            weekCaption={`This week · ${weekTotal} ${termInSentence(config?.terminology?.event ?? 'entry', weekTotal, false)}`}
          />






          {cachedInsight ? (

            <View style={styles.card}>

              <InsightLine

                kicker={cachedInsight.kicker}

                insight={cachedInsight.insight}

                boldTerms={cachedInsight.boldTerms}

              />

            </View>

          ) : null}



          <ModuleSections
            config={config}
            todayLogs={todayLogs}
            historyLogs={historyLogs}
            onLog={handleLog}
            onConfigRefresh={handleConfigRefresh}
          />
        </ScrollView>



        <View style={styles.bottomBuffer} />

      </View>



      {(__DEV__ || Platform.OS === 'web') ? (

        <Modal

          visible={resetModalVisible}

          transparent

          animationType="fade"

          onRequestClose={() => setResetModalVisible(false)}>

          <Pressable

            style={styles.modalBackdrop}

            onPress={() => setResetModalVisible(false)}>

            <Pressable style={styles.modalCard} onPress={() => {}}>

              <Text style={styles.modalTitle}>TRACKER OPTIONS</Text>
              {canGenerateSampleData(config) ? (
                <TouchableOpacity
                  style={styles.modalSampleButton}
                  disabled={sampleBusy}
                  onPress={() => {
                    void handleSampleToggle();
                  }}>
                  <Text style={styles.modalSampleLabel}>
                    {sampleLoaded ? 'Remove sample data' : 'Load a week of sample data'}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <Text style={styles.modalSubline}>

                Reset clears all data and starts again.

              </Text>

              <View style={styles.modalActions}>

                <TouchableOpacity

                  style={styles.modalCancelButton}

                  onPress={() => setResetModalVisible(false)}>

                  <Text style={styles.modalCancelLabel}>CANCEL</Text>

                </TouchableOpacity>

                <TouchableOpacity

                  style={styles.modalResetButton}

                  onPress={() => {

                    void handleResetConfirm();

                  }}>

                  <Text style={styles.modalResetLabel}>RESET</Text>

                </TouchableOpacity>

              </View>

            </Pressable>

          </Pressable>

        </Modal>

      ) : null}

    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  safeArea: {

    flex: 1,

    backgroundColor: color.bg,

  },

  header: {

    flexDirection: 'row',

    alignItems: 'center',

    justifyContent: 'space-between',

    paddingHorizontal: space.lg,

    paddingVertical: space.md,

    backgroundColor: color.bg,

    borderBottomWidth: 1,

    borderBottomColor: color.border,

    height: HEADER_HEIGHT,

  },

  headerIconButton: {

    width: SETTINGS_BUTTON_SIZE,

    height: SETTINGS_BUTTON_SIZE,

    alignItems: 'center',

    justifyContent: 'center',

  },

  headerCenter: {

    flex: 1,

    alignItems: 'center',

    justifyContent: 'center',

  },

  tabBar: {

    backgroundColor: color.bg,

    borderBottomWidth: 1,

    borderBottomColor: color.border,

    paddingVertical: space.sm,

  },

  tabRow: {

    paddingHorizontal: space.lg,

    gap: space.sm,

    flexDirection: 'row',

    alignItems: 'center',

  },

  tab: {

    paddingHorizontal: space.md,

    borderRadius: radius.sm,

    backgroundColor: color.surface2,

    borderWidth: 1,

    borderColor: color.border,

    height: 30,

    alignItems: 'center',

    justifyContent: 'center',

  },

  tabActive: {

    backgroundColor: color.accent,

    borderColor: color.accent,

  },

  tabLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoLabel,

    textTransform: 'uppercase',

    letterSpacing: letterSpacing.monoLabel,

    color: color.text2,

    textAlignVertical: 'center' as const,

    includeFontPadding: false,

  },

  tabLabelActive: {

    color: color.accentInk,

    fontWeight: fontWeight.semibold,

    textAlignVertical: 'center' as const,

    includeFontPadding: false,

  },

  scroll: {

    flex: 1,

  },

  scrollContent: {

    padding: space.lg,

    gap: space.cardGap,

  },

  bottomBuffer: {

    height: BOTTOM_BUFFER_HEIGHT,

    backgroundColor: color.bg,

  },

  card: {

    backgroundColor: color.surface,

    borderWidth: 1,

    borderColor: color.border,

    borderRadius: radius.lg,

    padding: space.cardPad,

  },

  modalBackdrop: {

    flex: 1,

    backgroundColor: color.bg,

    alignItems: 'center',

    justifyContent: 'center',

    padding: space.lg,

  },

  modalCard: {

    width: '100%',

    maxWidth: 320,

    backgroundColor: color.surface,

    borderWidth: 1,

    borderColor: color.border,

    borderRadius: radius.lg,

    padding: space.xl,

    alignItems: 'center',

  },

  modalTitle: {

    fontFamily: font.mono,

    fontSize: fontSize.monoLabel,

    color: color.text1,

    textTransform: 'uppercase',

    letterSpacing: letterSpacing.monoLabel,

    marginBottom: space.sm,

  },

  modalSampleButton: {
    alignSelf: 'stretch',
    marginVertical: space.md,
    alignItems: 'center',
    paddingVertical: space.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border2,
  },
  modalSampleLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
    color: color.accent,
  },
  hintRow: {
    paddingVertical: space.sm,
    paddingHorizontal: space.md,
  },
  hintText: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text3,
    lineHeight: 18,
    textAlign: 'center',
  },
  modalSubline: {

    fontFamily: font.ui,

    fontSize: fontSize.secondary,

    color: color.text2,

    textAlign: 'center',

    marginBottom: space.xl,

  },

  modalActions: {

    flexDirection: 'row',

    gap: space.sm,

    width: '100%',

  },

  modalCancelButton: {

    flex: 1,

    height: 40,

    borderWidth: 1,

    borderColor: color.border,

    borderRadius: radius.sm,

    alignItems: 'center',

    justifyContent: 'center',

    backgroundColor: 'transparent',

  },

  modalCancelLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoLabel,

    color: color.text2,

    letterSpacing: letterSpacing.monoLabel,

    textTransform: 'uppercase',

  },

  modalResetButton: {

    flex: 1,

    height: 40,

    backgroundColor: color.danger,

    borderRadius: radius.sm,

    alignItems: 'center',

    justifyContent: 'center',

  },

  modalResetLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoLabel,

    color: color.text1,

    fontWeight: fontWeight.semibold,

    letterSpacing: letterSpacing.monoLabel,

    textTransform: 'uppercase',

  },

});


