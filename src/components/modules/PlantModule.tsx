import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ModuleRow from '@/components/rows/ModuleRow';
import PhotoLog from '@/components/PhotoLog';
import { rowStyles } from '@/components/rows/rowStyles';
import { getDayLogs } from '@/storage/storage';
import type { LogEntry } from '@/types';
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

export type WateringMode = 'toggle' | 'counter';

export interface PlantModuleProps {
  showWatering?: boolean;
  showLastWatered?: boolean;
  showWaterAmount?: boolean;
  showFertiliser?: boolean;
  showRepotting?: boolean;
  showPruning?: boolean;

  showSunlight?: boolean;
  showSoilMoisture?: boolean;
  showHealth?: boolean;
  showGrowth?: boolean;
  showLeafCondition?: boolean;
  showPests?: boolean;

  showPhotoLog?: boolean;

  wateringMode?: WateringMode;

  leafConditionOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  careCardTitle?: string;
  photoCardTitle?: string;
  terminology?: {
    subject?: string;
  };

  onCareLog?: (entries: RowBatchLogEntry[]) => void | Promise<void>;
  onPhotoLog?: (photos: string[]) => void;
}

type OrderedRow =
  | { kind: 'config'; config: RowConfig }
  | { kind: 'lastWatered' };

const DEFAULT_ROW_ORDER = [
  'watering',
  'lastWatered',
  'waterAmount',
  'fertiliser',
  'repotting',
  'pruning',
  'sunlight',
  'soilMoisture',
  'health',
  'growth',
  'leafCondition',
  'pests',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const GROWTH_OPTIONS = ['NONE', 'SLOW', 'GOOD'] as [string, string, string];
const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const LAST_WATERED_VALUE_SIZE = 16;
const LAST_WATERED_LOOKBACK_DAYS = 90;

interface LastWateredDisplay {
  text: string;
  color: string;
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

function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isWateringLog(entry: LogEntry, moduleId: string): boolean {
  const payload = entry.value;

  if (!payload || typeof payload !== 'object') {
    return false;
  }

  const rowLog = payload as Partial<RowBatchLogEntry>;

  if (rowLog.rowId !== 'watering' || rowLog.moduleId !== moduleId) {
    return false;
  }

  const value = rowLog.value;

  if (!value || typeof value !== 'object') {
    return false;
  }

  if (value.type === 'toggle') {
    return value.value === true;
  }

  if (value.type === 'counter') {
    return value.value > 0;
  }

  return false;
}

function daysSinceDateKey(dateKey: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [year, month, day] = dateKey.split('-').map(Number);
  const then = new Date(year, month - 1, day);
  then.setHours(0, 0, 0, 0);

  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

function formatLastWateredDisplay(days: number): LastWateredDisplay {
  if (days === 0) {
    return { text: 'TODAY', color: color.accent };
  }

  if (days === 1) {
    return { text: '1 DAY AGO', color: color.accent };
  }

  const text = `${days} DAYS AGO`;

  if (days >= 5) {
    return { text, color: color.danger };
  }

  return { text, color: color.accent };
}

async function findLastWateredDateKey(moduleId: string): Promise<string | null> {
  for (let offset = 0; offset < LAST_WATERED_LOOKBACK_DAYS; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const dateKey = formatDateKey(date);

    try {
      const logs = await getDayLogs(dateKey);

      for (const entry of logs) {
        if (isWateringLog(entry, moduleId)) {
          return dateKey;
        }
      }
    } catch {
      // fail silently
    }
  }

  return null;
}

async function loadLastWateredDisplay(
  moduleId: string,
): Promise<LastWateredDisplay> {
  try {
    const dateKey = await findLastWateredDateKey(moduleId);

    if (!dateKey) {
      return { text: 'NO DATA', color: color.text3 };
    }

    return formatLastWateredDisplay(daysSinceDateKey(dateKey));
  } catch {
    return { text: 'NO DATA', color: color.text3 };
  }
}

function payloadIncludesWatering(payload: RowLogPayload[]): boolean {
  const watering = payload.find((entry) => entry.rowId === 'watering');

  if (!watering) {
    return false;
  }

  const value = watering.value;

  if (value.type === 'toggle') {
    return value.value === true;
  }

  if (value.type === 'counter') {
    return value.value > 0;
  }

  return false;
}

async function waitForWateringInStorage(moduleId: string): Promise<void> {
  const todayKey = formatDateKey(new Date());

  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      const logs = await getDayLogs(todayKey);

      if (logs.some((entry) => isWateringLog(entry, moduleId))) {
        return;
      }
    } catch {
      // fail silently
    }

    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

async function completeCareLog(
  payload: RowLogPayload[],
  moduleId: string,
  onCareLog?: (entries: RowBatchLogEntry[]) => void | Promise<void>,
): Promise<void> {
  const ts = new Date().toISOString();
  const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
    id: generateId(),
    rowId,
    moduleId,
    type: value.type,
    value,
    ts,
  }));

  try {
    await Promise.resolve(onCareLog?.(entries));
  } catch {
    // fail silently
  }

  if (payloadIncludesWatering(payload)) {
    await waitForWateringInStorage(moduleId);
  }
}

function hasCareRows(props: PlantModuleProps): boolean {
  return !!(
    props.showWatering ||
    props.showLastWatered ||
    props.showWaterAmount ||
    props.showFertiliser ||
    props.showRepotting ||
    props.showPruning ||
    props.showSunlight ||
    props.showSoilMoisture ||
    props.showHealth ||
    props.showGrowth ||
    props.showLeafCondition ||
    props.showPests
  );
}

function buildEnabledRows(props: PlantModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();
  const wateringMode = props.wateringMode ?? 'toggle';

  if (props.showWatering) {
    if (wateringMode === 'counter') {
      rows.set('watering', {
        id: 'watering',
        type: 'counter',
        label: 'WATERINGS TODAY',
        unitLabel: 'TIMES',
      });
    } else {
      rows.set('watering', {
        id: 'watering',
        type: 'toggle',
        label: 'WATERED TODAY?',
      });
    }
  }

  if (props.showWaterAmount) {
    rows.set('waterAmount', {
      id: 'waterAmount',
      type: 'metric',
      label: 'WATER AMOUNT',
      unit: 'ml',
      showTrend: false,
      step: 50,
    });
  }

  if (props.showFertiliser) {
    rows.set('fertiliser', {
      id: 'fertiliser',
      type: 'toggle',
      label: 'FERTILISED TODAY?',
    });
  }

  if (props.showRepotting) {
    rows.set('repotting', {
      id: 'repotting',
      type: 'toggle',
      label: 'REPOTTED TODAY?',
    });
  }

  if (props.showPruning) {
    rows.set('pruning', {
      id: 'pruning',
      type: 'toggle',
      label: 'PRUNED TODAY?',
    });
  }

  if (props.showSunlight) {
    rows.set('sunlight', {
      id: 'sunlight',
      type: 'level',
      label: 'SUNLIGHT TODAY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showSoilMoisture) {
    rows.set('soilMoisture', {
      id: 'soilMoisture',
      type: 'scale',
      label: 'SOIL MOISTURE',
      max: 5,
    });
  }

  if (props.showHealth) {
    rows.set('health', {
      id: 'health',
      type: 'scale',
      label: 'OVERALL HEALTH',
      max: 5,
    });
  }

  if (props.showGrowth) {
    rows.set('growth', {
      id: 'growth',
      type: 'level',
      label: 'GROWTH OBSERVED',
      options: GROWTH_OPTIONS,
    });
  }

  if (props.showLeafCondition) {
    rows.set('leafCondition', {
      id: 'leafCondition',
      type: 'chips',
      label: 'LEAF CONDITION',
      options: props.leafConditionOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showPests) {
    rows.set('pests', {
      id: 'pests',
      type: 'toggle',
      label: 'PEST ACTIVITY?',
    });
  }

  return rows;
}

function buildOrderedRows(props: PlantModuleProps): OrderedRow[] {
  const enabledRows = buildEnabledRows(props);
  const ordered: OrderedRow[] = [];
  const seen = new Set<string>();
  const order = props.rowOrder ?? [...DEFAULT_ROW_ORDER];

  const pushRow = (rowId: string) => {
    if (seen.has(rowId)) {
      return;
    }

    if (rowId === 'lastWatered' && props.showLastWatered) {
      ordered.push({ kind: 'lastWatered' });
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

interface LastWateredRowProps {
  moduleId: string;
  refreshToken: number;
}

function LastWateredRow({ moduleId, refreshToken }: LastWateredRowProps) {
  const [display, setDisplay] = useState<LastWateredDisplay>({
    text: 'NO DATA',
    color: color.text3,
  });

  useEffect(() => {
    let cancelled = false;

    void loadLastWateredDisplay(moduleId).then((nextDisplay) => {
      if (!cancelled) {
        setDisplay(nextDisplay);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [moduleId, refreshToken]);

  return (
    <View>
      <Text style={rowStyles.rowLabel}>LAST WATERED</Text>
      <Text
        style={[
          styles.lastWateredValue,
          { color: display.color },
        ]}>
        {display.text}
      </Text>
    </View>
  );
}

interface CareModuleCardProps {
  config: ModuleCardConfig;
  orderedRows: OrderedRow[];
  moduleId: string;
  onLog: (values: RowLogPayload[]) => void | Promise<void>;
}

function CareModuleCard({
  config,
  orderedRows,
  moduleId,
  onLog,
}: CareModuleCardProps) {
  const [staged, setStaged] = useState<Record<string, RowValue>>({});
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const [lastWateredRefreshToken, setLastWateredRefreshToken] = useState(0);
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

  const refreshLastWatered = useCallback(() => {
    setLastWateredRefreshToken((current) => current + 1);
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

    setLoggedConfirm(true);
    setStaged({});

    void Promise.resolve(onLog(payload))
      .finally(() => {
        refreshLastWatered();
      })
      .catch(() => {
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
          key={row.kind === 'lastWatered' ? 'lastWatered' : row.config.id}
          style={[
            styles.rowBlock,
            index < orderedRows.length - 1 && styles.rowBlockDivider,
          ]}>
          {row.kind === 'lastWatered' ? (
            <LastWateredRow
              moduleId={moduleId}
              refreshToken={lastWateredRefreshToken}
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

interface PhotoCardProps {
  title: string;
  storageKey: string;
  onPhotoLog?: (photos: string[]) => void;
}

function PhotoCard({ title, storageKey, onPhotoLog }: PhotoCardProps) {
  const handlePhotoLog = (photoUri: string) => {
    void Promise.resolve(onPhotoLog?.([photoUri])).catch(() => {
      // fail silently
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <PhotoLog label="" storageKey={storageKey} onLog={handlePhotoLog} />
    </View>
  );
}

export default function PlantModule(props: PlantModuleProps) {
  const {
    moduleId = 'plant',
    careCardTitle = 'PLANT CARE TODAY',
    photoCardTitle = 'PHOTO LOG',
    showPhotoLog = false,
    onCareLog,
    onPhotoLog,
  } = props;

  const showCareCard = hasCareRows(props);
  const orderedRows = showCareCard ? buildOrderedRows(props) : [];
  const careConfig: ModuleCardConfig = {
    id: moduleId,
    title: careCardTitle,
    rows: orderedRows
      .filter((row): row is { kind: 'config'; config: RowConfig } => row.kind === 'config')
      .map((row) => row.config),
  };

  const handleCareLog = useCallback(
    (payload: RowLogPayload[]) =>
      completeCareLog(payload, moduleId, onCareLog),
    [moduleId, onCareLog],
  );

  return (
    <View>
      {showCareCard && orderedRows.length > 0 ? (
        <CareModuleCard
          config={careConfig}
          orderedRows={orderedRows}
          moduleId={moduleId}
          onLog={handleCareLog}
        />
      ) : null}

      {showPhotoLog ? (
        <PhotoCard
          title={photoCardTitle}
          storageKey={`plant_photo_${moduleId}`}
          onPhotoLog={onPhotoLog}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.cardGap,
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
  lastWateredValue: {
    fontFamily: font.mono,
    fontSize: LAST_WATERED_VALUE_SIZE,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
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
