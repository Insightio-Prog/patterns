import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ExerciseDraftCard from '@/components/modules/ExerciseDraftCard';
import ModuleCard from '@/components/ModuleCard';
import ModuleRow from '@/components/rows/ModuleRow';
import { rowStyles, ROW_VALUE_SIZE } from '@/components/rows/rowStyles';
import type { DistanceUnit, ExerciseItem, WeightUnit } from '@/types/fitness';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
  RowValue,
} from '@/types/rows';
import { generateId } from '@/utils/generateId';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export type { DistanceUnit, ExerciseItem, WeightUnit } from '@/types/fitness';

export interface FitnessModuleProps {
  showExerciseDraft?: boolean;
  showWeightInput?: boolean;
  commonExercises?: string[];

  showWorkoutType?: boolean;
  showDuration?: boolean;
  showDistance?: boolean;
  showHeartRate?: boolean;
  showCalories?: boolean;

  showIntensity?: boolean;
  showRecovery?: boolean;
  showSoreness?: boolean;
  showMood?: boolean;
  showPB?: boolean;
  showInjury?: boolean;

  weightUnit?: WeightUnit;
  distanceUnit?: DistanceUnit;

  workoutTypeOptions?: string[];

  sessionRowOrder?: string[];
  wellbeingRowOrder?: string[];

  moduleId?: string;
  exerciseCardTitle?: string;
  sessionCardTitle?: string;
  wellbeingCardTitle?: string;
  terminology?: {
    subject?: string;
  };

  onExerciseLog?: (items: ExerciseItem[]) => void;
  onSessionLog?: (entries: RowBatchLogEntry[]) => void;
  onWellbeingLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_WORKOUT_TYPES = [
  'RUN',
  'CYCLE',
  'GYM',
  'SWIM',
  'WALK',
  'YOGA',
  'SPORT',
];

const DEFAULT_SESSION_ROW_ORDER = [
  'workoutType',
  'duration',
  'distance',
  'heartRate',
  'calories',
] as const;

const DEFAULT_WELLBEING_ROW_ORDER = [
  'intensity',
  'recovery',
  'soreness',
  'mood',
  'pb',
  'injury',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const ASSUMED_WEIGHT_KG = 70;
const DEFAULT_MET = 5.0;

const MET_BY_WORKOUT: Record<string, number> = {
  RUN: 9.8,
  CYCLE: 7.5,
  GYM: 5.0,
  SWIM: 8.0,
  WALK: 3.5,
  YOGA: 3.0,
  SPORT: 7.0,
};

type OrderedSessionRow =
  | { kind: 'config'; config: RowConfig }
  | { kind: 'calories' };

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

function getWorkoutType(staged: Record<string, RowValue>): string | null {
  const value = staged.workoutType;

  if (value?.type === 'chips' && value.value.length > 0) {
    return value.value[0];
  }

  return null;
}

function getDurationMinutes(staged: Record<string, RowValue>): number | null {
  const value = staged.duration;

  if (value?.type === 'metric' && value.value > 0) {
    return value.value;
  }

  return null;
}

function estimateCalories(workoutType: string, durationMinutes: number): number {
  const met = MET_BY_WORKOUT[workoutType.toUpperCase()] ?? DEFAULT_MET;
  return Math.round(met * ASSUMED_WEIGHT_KG * (durationMinutes / 60));
}

interface CaloriesRowProps {
  staged: Record<string, RowValue>;
  showWorkoutType: boolean;
  showDuration: boolean;
}

function CaloriesRow({
  staged,
  showWorkoutType,
  showDuration,
}: CaloriesRowProps) {
  const workoutType =
    showWorkoutType ? getWorkoutType(staged) : null;
  const durationMinutes =
    showDuration ? getDurationMinutes(staged) : null;

  const canCalculate =
    workoutType !== null && durationMinutes !== null;

  let displayValue = '–';
  let valueColor: string = color.text3;

  if (canCalculate) {
    const calories = estimateCalories(workoutType, durationMinutes);
    displayValue = `${calories} kcal`;
    valueColor = color.accent;
  }

  return (
    <View>
      <Text style={rowStyles.rowLabel}>CALORIES BURNED (EST.)</Text>
      <Text style={[styles.caloriesValue, { color: valueColor }]}>
        {displayValue}
      </Text>
    </View>
  );
}

interface SessionModuleCardProps {
  config: ModuleCardConfig;
  orderedRows: OrderedSessionRow[];
  showWorkoutType: boolean;
  showDuration: boolean;
  onLog: (values: RowLogPayload[]) => void;
}

function SessionModuleCard({
  config,
  orderedRows,
  showWorkoutType,
  showDuration,
  onLog,
}: SessionModuleCardProps) {
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
    <View style={styles.sessionCard}>
      <Text style={styles.sessionTitle}>{config.title}</Text>

      {orderedRows.map((row, index) => (
        <View
          key={row.kind === 'calories' ? 'calories' : row.config.id}
          style={[
            styles.rowBlock,
            index < orderedRows.length - 1 && styles.rowBlockDivider,
          ]}>
          {row.kind === 'calories' ? (
            <CaloriesRow
              staged={staged}
              showWorkoutType={showWorkoutType}
              showDuration={showDuration}
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

function hasSessionRows(props: FitnessModuleProps): boolean {
  return !!(
    props.showWorkoutType ||
    props.showDuration ||
    props.showDistance ||
    props.showHeartRate ||
    props.showCalories
  );
}

function hasWellbeingRows(props: FitnessModuleProps): boolean {
  return !!(
    props.showIntensity ||
    props.showRecovery ||
    props.showSoreness ||
    props.showMood ||
    props.showPB ||
    props.showInjury
  );
}

function buildSessionRows(props: FitnessModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();
  const distanceUnit = props.distanceUnit ?? 'km';

  if (props.showWorkoutType) {
    rows.set('workoutType', {
      id: 'workoutType',
      type: 'chips',
      label: 'WORKOUT TYPE',
      options: props.workoutTypeOptions ?? DEFAULT_WORKOUT_TYPES,
      wrap: true,
      multi: false,
    });
  }

  if (props.showDuration) {
    rows.set('duration', {
      id: 'duration',
      type: 'metric',
      label: 'DURATION',
      unit: 'mins',
      showTrend: true,
      step: 5,
    });
  }

  if (props.showDistance) {
    rows.set('distance', {
      id: 'distance',
      type: 'metric',
      label: 'DISTANCE',
      unit: distanceUnit,
      showTrend: true,
      step: 0.1,
    });
  }

  if (props.showHeartRate) {
    rows.set('heartRate', {
      id: 'heartRate',
      type: 'metric',
      label: 'PEAK HEART RATE',
      unit: 'bpm',
      showTrend: false,
      step: 1,
    });
  }

  return rows;
}

function buildOrderedSessionRows(props: FitnessModuleProps): OrderedSessionRow[] {
  const enabledRows = buildSessionRows(props);
  const ordered: OrderedSessionRow[] = [];
  const seen = new Set<string>();
  const order = props.sessionRowOrder ?? [...DEFAULT_SESSION_ROW_ORDER];

  const pushRow = (rowId: string) => {
    if (seen.has(rowId)) {
      return;
    }

    if (rowId === 'calories' && props.showCalories) {
      ordered.push({ kind: 'calories' });
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

  for (const rowId of DEFAULT_SESSION_ROW_ORDER) {
    pushRow(rowId);
  }

  return ordered;
}

function buildWellbeingRows(props: FitnessModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showIntensity) {
    rows.set('intensity', {
      id: 'intensity',
      type: 'scale',
      label: 'SESSION INTENSITY',
      max: 5,
    });
  }

  if (props.showRecovery) {
    rows.set('recovery', {
      id: 'recovery',
      type: 'scale',
      label: 'RECOVERY GOING IN',
      max: 5,
    });
  }

  if (props.showSoreness) {
    rows.set('soreness', {
      id: 'soreness',
      type: 'level',
      label: 'POST-SESSION SORENESS',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showMood) {
    rows.set('mood', {
      id: 'mood',
      type: 'level',
      label: 'PRE-SESSION MOTIVATION',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showPB) {
    rows.set('pb', {
      id: 'pb',
      type: 'toggle',
      label: 'PERSONAL BEST TODAY?',
    });
  }

  if (props.showInjury) {
    rows.set('injury', {
      id: 'injury',
      type: 'toggle',
      label: 'PAIN OR INJURY?',
    });
  }

  return rows;
}

function orderRows(
  enabledRows: Map<string, RowConfig>,
  defaultOrder: readonly string[],
  rowOrder?: string[],
): RowConfig[] {
  const ordered: RowConfig[] = [];
  const seen = new Set<string>();
  const order = rowOrder ?? [...defaultOrder];

  for (const rowId of order) {
    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
      seen.add(rowId);
    }
  }

  for (const rowId of defaultOrder) {
    if (seen.has(rowId)) {
      continue;
    }

    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
    }
  }

  return ordered;
}

function buildSessionConfig(props: FitnessModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'fitness';
  const title = props.sessionCardTitle ?? 'SESSION';
  const enabledRows = buildSessionRows(props);

  return {
    id: `${moduleId}_session`,
    title,
    rows: orderRows(
      enabledRows,
      DEFAULT_SESSION_ROW_ORDER.filter((rowId) => rowId !== 'calories'),
      props.sessionRowOrder?.filter((rowId) => rowId !== 'calories'),
    ),
  };
}

function buildWellbeingConfig(props: FitnessModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'fitness';
  const title = props.wellbeingCardTitle ?? 'WELLBEING';
  const enabledRows = buildWellbeingRows(props);

  return {
    id: `${moduleId}_wellbeing`,
    title,
    rows: orderRows(
      enabledRows,
      DEFAULT_WELLBEING_ROW_ORDER,
      props.wellbeingRowOrder,
    ),
  };
}

function createBatchHandler(
  moduleId: string,
  onLog?: (entries: RowBatchLogEntry[]) => void,
) {
  return (payload: RowLogPayload[]) => {
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
}

export default function FitnessModule(props: FitnessModuleProps) {
  const {
    moduleId = 'fitness',
    exerciseCardTitle = 'EXERCISES',
    showExerciseDraft = false,
    showWeightInput = true,
    showWorkoutType = false,
    showDuration = false,
    weightUnit = 'kg',
    commonExercises,
    onExerciseLog,
    onSessionLog,
    onWellbeingLog,
  } = props;

  const showSessionCard = hasSessionRows(props);
  const showWellbeingCard = hasWellbeingRows(props);
  const orderedSessionRows = showSessionCard ? buildOrderedSessionRows(props) : [];
  const sessionConfig = showSessionCard ? buildSessionConfig(props) : null;
  const wellbeingConfig = showWellbeingCard ? buildWellbeingConfig(props) : null;

  const handleExerciseLog = (items: ExerciseItem[]) => {
    void Promise.resolve(onExerciseLog?.(items)).catch(() => {
      // fail silently
    });
  };

  const handleSessionLog = createBatchHandler(moduleId, onSessionLog);
  const handleWellbeingLog = createBatchHandler(moduleId, onWellbeingLog);

  return (
    <View>
      {showExerciseDraft ? (
        <ExerciseDraftCard
          title={exerciseCardTitle}
          showWeightInput={showWeightInput}
          weightUnit={weightUnit}
          commonExercises={commonExercises}
          onLog={handleExerciseLog}
        />
      ) : null}

      {showSessionCard && sessionConfig ? (
        <View style={styles.cardSpacing}>
          <SessionModuleCard
            config={sessionConfig}
            orderedRows={orderedSessionRows}
            showWorkoutType={showWorkoutType}
            showDuration={showDuration}
            onLog={handleSessionLog}
          />
        </View>
      ) : null}

      {showWellbeingCard && wellbeingConfig ? (
        <View style={styles.cardSpacing}>
          <ModuleCard config={wellbeingConfig} onLog={handleWellbeingLog} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  cardSpacing: {
    marginBottom: space.cardGap,
  },
  sessionCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  sessionTitle: {
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
  caloriesValue: {
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
