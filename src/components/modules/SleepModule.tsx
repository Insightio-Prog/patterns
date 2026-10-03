import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ModuleRow from '@/components/rows/ModuleRow';
import { rowStyles, ROW_VALUE_SIZE } from '@/components/rows/rowStyles';
import { generateId } from '@/utils/generateId';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
  RowValue,
} from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface SleepModuleProps {
  showBedtime?: boolean;
  showWakeTime?: boolean;
  showDuration?: boolean;
  showQuality?: boolean;
  showNightSymptoms?: boolean;
  showEnergyMorning?: boolean;
  showDreams?: boolean;
  showNaps?: boolean;
  showNapDuration?: boolean;
  showSleepAid?: boolean;

  nightSymptomOptions?: string[];
  sleepAidOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

interface SleepDefaults {
  defaultBedtime?: string;
  defaultWakeTime?: string;
}

type OrderedRow =
  | { kind: 'config'; config: RowConfig }
  | { kind: 'duration' };

const DEFAULT_ROW_ORDER = [
  'bedtime',
  'wakeTime',
  'duration',
  'sleepQuality',
  'nightSymptoms',
  'energyMorning',
  'dreams',
  'naps',
  'napDuration',
  'sleepAid',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const MAX_DURATION_MINUTES = 14 * 60;

function getSleepDefaultsKey(moduleId: string): string {
  return `patterns.sleepDefaults.${moduleId}.v1`;
}

function getStagedCount(staged: Record<string, RowValue>): number {
  return Object.keys(staged).length;
}

function getLogLabel(count: number, logged: boolean): string {
  if (logged) {
    return 'LOGGED ✓';
  }

  if (count === 1) {
    return 'LOG · 1 ENTRY';
  }

  return `LOG · ${count} ENTRIES`;
}

function getTimeInputValue(
  staged: Record<string, RowValue>,
  rowId: string,
): string | null {
  const value = staged[rowId];

  if (value?.type === 'timeInput') {
    return value.value;
  }

  return null;
}

function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

function calculateDurationMinutes(bedtime: string, wakeTime: string): number {
  const bedMinutes = parseTimeToMinutes(bedtime) ?? 0;
  let wakeMinutes = parseTimeToMinutes(wakeTime) ?? 0;

  if (wakeMinutes <= bedMinutes) {
    wakeMinutes += 24 * 60;
  }

  return wakeMinutes - bedMinutes;
}

function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

interface DurationRowProps {
  staged: Record<string, RowValue>;
  showBedtime: boolean;
  showWakeTime: boolean;
}

function DurationRow({ staged, showBedtime, showWakeTime }: DurationRowProps) {
  const bedtime =
    showBedtime ? getTimeInputValue(staged, 'bedtime') : null;
  const wakeTime =
    showWakeTime ? getTimeInputValue(staged, 'wakeTime') : null;

  const bothStaged = bedtime !== null && wakeTime !== null;

  let displayValue = '–';
  let valueColor: string = color.text3;
  let suffix = '';

  if (bothStaged) {
    const totalMinutes = calculateDurationMinutes(bedtime, wakeTime);
    displayValue = formatDuration(totalMinutes);

    if (totalMinutes < 60) {
      valueColor = color.danger;
    } else if (totalMinutes > MAX_DURATION_MINUTES) {
      valueColor = color.accent;
      suffix = '?';
    } else {
      valueColor = color.accent;
    }
  }

  return (
    <View>
      <Text style={rowStyles.rowLabel}>SLEEP DURATION</Text>
      <Text style={[styles.durationValue, { color: valueColor }]}>
        {displayValue}
        {suffix}
      </Text>
    </View>
  );
}

interface SleepModuleCardProps {
  config: ModuleCardConfig;
  orderedRows: OrderedRow[];
  showBedtime: boolean;
  showWakeTime: boolean;
  moduleId: string;
  onLog: (values: RowLogPayload[]) => void;
}

function SleepModuleCard({
  config,
  orderedRows,
  showBedtime,
  showWakeTime,
  moduleId,
  onLog,
}: SleepModuleCardProps) {
  const [staged, setStaged] = useState<Record<string, RowValue>>({});
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stagedCount = getStagedCount(staged);
  const canLog = stagedCount > 0 && !loggedConfirm;

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleRowChange = (rowId: string, value: RowValue | null) => {
    setStaged((current) => {
      const next = { ...current };

      if (value === null) {
        delete next[rowId];
        return next;
      }

      next[rowId] = value;
      return next;
    });
  };

  const persistSleepDefaults = async (payload: Record<string, RowValue>) => {
    try {
      const key = getSleepDefaultsKey(moduleId);
      const raw = await AsyncStorage.getItem(key);
      const existing: SleepDefaults =
        raw ? (JSON.parse(raw) as SleepDefaults) : {};

      const next: SleepDefaults = { ...existing };

      if (payload.bedtime?.type === 'timeInput') {
        next.defaultBedtime = payload.bedtime.value;
      }

      if (payload.wakeTime?.type === 'timeInput') {
        next.defaultWakeTime = payload.wakeTime.value;
      }

      await AsyncStorage.setItem(key, JSON.stringify(next));
    } catch {
      // fail silently
    }
  };

  const handleLog = () => {
    if (!canLog) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload: RowLogPayload[] = Object.entries(staged).map(
      ([rowId, value]) => ({
        rowId,
        value,
      }),
    );

    void persistSleepDefaults(staged);

    setLoggedConfirm(true);
    setStaged({});

    void Promise.resolve(onLog(payload)).catch(() => {
      // fail silently
    });

    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }

    confirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      confirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{config.title}</Text>

      {orderedRows.map((row, index) => (
        <View
          key={row.kind === 'duration' ? 'duration' : row.config.id}
          style={[
            styles.rowBlock,
            index < orderedRows.length - 1 && styles.rowBlockDivider,
          ]}>
          {row.kind === 'duration' ? (
            <DurationRow
              staged={staged}
              showBedtime={showBedtime}
              showWakeTime={showWakeTime}
            />
          ) : (
            <ModuleRow
              config={row.config}
              value={staged[row.config.id] ?? null}
              onChange={(value) => handleRowChange(row.config.id, value)}
              moduleId={config.id}
            />
          )}
        </View>
      ))}

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!canLog && !loggedConfirm}
        onPress={handleLog}
        style={[
          styles.logButton,
          canLog ? styles.logButtonActive : styles.logButtonDisabled,
          loggedConfirm && styles.logButtonLogged,
        ]}>
        <Text
          style={[
            styles.logButtonLabel,
            canLog ? styles.logButtonLabelActive : styles.logButtonLabelDisabled,
            loggedConfirm && styles.logButtonLabelLogged,
          ]}>
          {getLogLabel(stagedCount, loggedConfirm)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function buildEnabledRows(
  props: SleepModuleProps,
  defaults: SleepDefaults,
): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showBedtime) {
    rows.set('bedtime', {
      id: 'bedtime',
      type: 'timeInput',
      label: 'BEDTIME',
      defaultValue: defaults.defaultBedtime,
    });
  }

  if (props.showWakeTime) {
    rows.set('wakeTime', {
      id: 'wakeTime',
      type: 'timeInput',
      label: 'WAKE TIME',
      defaultValue: defaults.defaultWakeTime,
    });
  }

  if (props.showQuality) {
    rows.set('sleepQuality', {
      id: 'sleepQuality',
      type: 'scale',
      label: 'SLEEP QUALITY',
      max: 5,
    });
  }

  if (props.showNightSymptoms) {
    rows.set('nightSymptoms', {
      id: 'nightSymptoms',
      type: 'chips',
      label: 'NIGHT SYMPTOMS',
      options: props.nightSymptomOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showEnergyMorning) {
    rows.set('energyMorning', {
      id: 'energyMorning',
      type: 'level',
      label: 'MORNING ENERGY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showDreams) {
    rows.set('dreams', {
      id: 'dreams',
      type: 'toggle',
      label: 'DREAMS RECALLED?',
    });
  }

  if (props.showNaps) {
    rows.set('naps', {
      id: 'naps',
      type: 'counter',
      label: 'NAPS TODAY',
      unitLabel: 'NAPS',
    });
  }

  if (props.showNapDuration) {
    rows.set('napDuration', {
      id: 'napDuration',
      type: 'metric',
      label: 'NAP DURATION',
      unit: 'mins',
      showTrend: false,
      step: 5,
    });
  }

  if (props.showSleepAid) {
    rows.set('sleepAid', {
      id: 'sleepAid',
      type: 'chips',
      label: 'SLEEP AID USED',
      options: props.sleepAidOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  return rows;
}

function buildOrderedRows(
  props: SleepModuleProps,
  defaults: SleepDefaults,
): OrderedRow[] {
  const enabledRows = buildEnabledRows(props, defaults);
  const ordered: OrderedRow[] = [];
  const seen = new Set<string>();
  const order = props.rowOrder ?? [...DEFAULT_ROW_ORDER];

  const pushRow = (rowId: string) => {
    if (seen.has(rowId)) {
      return;
    }

    if (rowId === 'duration' && props.showDuration) {
      ordered.push({ kind: 'duration' });
      seen.add(rowId);
      return;
    }

    const config = enabledRows.get(rowId);

    if (config) {
      ordered.push({ kind: 'config', config });
      seen.add(rowId);
    }
  };

  for (const rowId of order) {
    pushRow(rowId);
  }

  for (const rowId of DEFAULT_ROW_ORDER) {
    pushRow(rowId);
  }

  return ordered;
}

function hasSleepRows(props: SleepModuleProps): boolean {
  return !!(
    props.showBedtime ||
    props.showWakeTime ||
    props.showDuration ||
    props.showQuality ||
    props.showNightSymptoms ||
    props.showEnergyMorning ||
    props.showDreams ||
    props.showNaps ||
    props.showNapDuration ||
    props.showSleepAid
  );
}

export default function SleepModule(props: SleepModuleProps) {
  const {
    moduleId = 'sleep',
    title = 'SLEEP',
    showBedtime = false,
    showWakeTime = false,
    onLog,
  } = props;

  const [sleepDefaults, setSleepDefaults] = useState<SleepDefaults>({});
  const [defaultsLoaded, setDefaultsLoaded] = useState(false);

  useEffect(() => {
    const loadDefaults = async () => {
      try {
        const raw = await AsyncStorage.getItem(getSleepDefaultsKey(moduleId));

        if (raw) {
          const parsed = JSON.parse(raw) as SleepDefaults;
          setSleepDefaults(parsed);
        }
      } catch {
        // fail silently
      } finally {
        setDefaultsLoaded(true);
      }
    };

    void loadDefaults();
  }, [moduleId]);

  if (!hasSleepRows(props)) {
    return null;
  }

  if (!defaultsLoaded) {
    return null;
  }

  const orderedRows = buildOrderedRows(props, sleepDefaults);
  const config: ModuleCardConfig = {
    id: moduleId,
    title,
    rows: orderedRows
      .filter(
        (row): row is { kind: 'config'; config: RowConfig } =>
          row.kind === 'config',
      )
      .map((row) => row.config),
  };

  const handleLog = (payload: RowLogPayload[]) => {
    const ts = new Date().toISOString();
    const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
      id: generateId(),
      rowId,
      moduleId,
      type: value.type,
      value,
      ts,
    }));

    void Promise.resolve(onLog?.(entries)).catch(() => {
      // fail silently
    });
  };

  return (
    <SleepModuleCard
      config={config}
      orderedRows={orderedRows}
      showBedtime={showBedtime}
      showWakeTime={showWakeTime}
      moduleId={moduleId}
      onLog={handleLog}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  title: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.lg,
  },
  rowBlock: {
    paddingVertical: space.lg,
  },
  rowBlockDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border2,
  },
  durationValue: {
    fontFamily: font.mono,
    fontSize: ROW_VALUE_SIZE,
    fontWeight: fontWeight.semibold,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
  },
  logButtonActive: {
    backgroundColor: color.accent,
  },
  logButtonDisabled: {
    backgroundColor: color.surface2,
  },
  logButtonLogged: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  },
  logButtonLabelActive: {
    color: color.accentInk,
  },
  logButtonLabelDisabled: {
    color: color.text3,
  },
  logButtonLabelLogged: {
    color: color.text3,
  },
});
