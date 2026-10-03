import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import EnvironmentModule, {
  fetchPollenSnapshot,
  formatPollenLevel,
  type EnvironmentEntry,
  type PollenLevel,
  type PollenSnapshot,
} from '@/components/EnvironmentModule';
import ModuleCard from '@/components/ModuleCard';
import { generateId } from '@/utils/generateId';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
} from '@/types/rows';
import {
  color,
  font,
  fontSize,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export type ExerciseMode = 'toggle' | 'counter';

export interface EnvironmentModuleExtendedProps {
  showFactors?: boolean;
  showPollen?: boolean;

  showWeather?: boolean;
  showStressfulDay?: boolean;
  showExercise?: boolean;
  showSleep?: boolean;
  showTravel?: boolean;
  showAirQuality?: boolean;
  showScreenTime?: boolean;
  showSocialInteraction?: boolean;
  showMentalLoad?: boolean;
  showCustomFactors?: boolean;

  exerciseMode?: ExerciseMode;
  factorOptions?: string[];
  customFactorOptions?: string[];
  weatherOptions?: string[];
  airQualityOptions?: string[];
  sleepOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  factorsCardTitle?: string;
  environmentCardTitle?: string;
  terminology?: {
    subject?: string;
  };

  onFactorsLog?: (entry: EnvironmentEntry) => void;
  onEnvironmentLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_FACTOR_OPTIONS = [
  'STRESSFUL DAY',
  'POOR SLEEP',
  'EXERCISE',
  'TRAVELLING',
  'AT WORK',
  'OUTDOORS',
] as const;

const ENVIRONMENT_BOOL_TO_DEFAULT_FACTOR: {
  prop: keyof EnvironmentModuleExtendedProps;
  factor: (typeof DEFAULT_FACTOR_OPTIONS)[number];
}[] = [
  { prop: 'showStressfulDay', factor: 'STRESSFUL DAY' },
  { prop: 'showSleep', factor: 'POOR SLEEP' },
  { prop: 'showExercise', factor: 'EXERCISE' },
  { prop: 'showTravel', factor: 'TRAVELLING' },
];

function filterDefaultFactorOptions(
  props: EnvironmentModuleExtendedProps,
): string[] {
  const excluded = new Set<string>();

  for (const { prop, factor } of ENVIRONMENT_BOOL_TO_DEFAULT_FACTOR) {
    if (props[prop]) {
      excluded.add(factor);
    }
  }

  return DEFAULT_FACTOR_OPTIONS.filter((factor) => !excluded.has(factor));
}

const DEFAULT_WEATHER_OPTIONS = ['HOT', 'COLD', 'HUMID', 'WINDY', 'RAINY'];
const DEFAULT_AIR_QUALITY_OPTIONS = ['GOOD', 'MODERATE', 'POOR'];
const DEFAULT_SLEEP_OPTIONS = ['GOOD', 'POOR', 'BROKEN', 'MEDICATED'];

const DEFAULT_ENVIRONMENT_ROW_ORDER = [
  'weather',
  'stressfulDay',
  'exercise',
  'sleepQuality',
  'travel',
  'airQuality',
  'screenTime',
  'socialInteraction',
  'mentalLoad',
  'customFactors',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];

type PollenLoadState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'unavailable'
  | 'permission_denied';

function isHighPollenLevel(level: PollenLevel): boolean {
  return level === 'high' || level === 'very_high';
}

function getPollenLevelColor(level: PollenLevel): string {
  return isHighPollenLevel(level) ? color.accent : color.text2;
}

interface PollenReadOnlyRowProps {
  snapshot: PollenSnapshot | null;
  loadState: PollenLoadState;
}

function PollenReadOnlyRow({ snapshot, loadState }: PollenReadOnlyRowProps) {
  if (loadState === 'loading' || loadState === 'idle') {
    return <Text style={styles.pollenStatus}>POLLEN · FETCHING...</Text>;
  }

  if (
    loadState === 'unavailable' ||
    loadState === 'permission_denied' ||
    !snapshot
  ) {
    return <Text style={styles.pollenStatus}>POLLEN · UNAVAILABLE</Text>;
  }

  const segments = [
    { label: 'TREE', level: snapshot.tree },
    { label: 'GRASS', level: snapshot.grass },
    { label: 'WEED', level: snapshot.weed },
  ];

  return (
    <View style={styles.pollenInlineRow}>
      {segments.map((segment) => (
        <Text key={segment.label} style={styles.pollenSegment}>
          {segment.label} ·{' '}
          <Text style={{ color: getPollenLevelColor(segment.level) }}>
            {formatPollenLevel(segment.level)}
          </Text>
        </Text>
      ))}
    </View>
  );
}

function usePollenSnapshot(enabled: boolean): {
  snapshot: PollenSnapshot | null;
  loadState: PollenLoadState;
} {
  const [snapshot, setSnapshot] = useState<PollenSnapshot | null>(null);
  const [loadState, setLoadState] = useState<PollenLoadState>('idle');
  const fetchAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
        fetchAbortRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setSnapshot(null);
      setLoadState('idle');
      return;
    }

    const loadPollen = async () => {
      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
      }

      const controller = new AbortController();
      fetchAbortRef.current = controller;

      setLoadState('loading');
      setSnapshot(null);

      try {
        const permission = await Location.requestForegroundPermissionsAsync();

        if (!isMountedRef.current) {
          return;
        }

        if (permission.status !== 'granted') {
          setLoadState('permission_denied');
          return;
        }

        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        const nextSnapshot = await fetchPollenSnapshot(
          position.coords.latitude,
          position.coords.longitude,
          controller.signal,
        );

        if (!isMountedRef.current || controller.signal.aborted) {
          return;
        }

        if (!nextSnapshot) {
          setLoadState('unavailable');
          return;
        }

        setSnapshot(nextSnapshot);
        setLoadState('success');
      } catch {
        if (isMountedRef.current && !controller.signal.aborted) {
          setLoadState('unavailable');
        }
      } finally {
        if (fetchAbortRef.current === controller) {
          fetchAbortRef.current = null;
        }
      }
    };

    void loadPollen();
  }, [enabled]);

  return { snapshot, loadState };
}

function hasEnvironmentRows(props: EnvironmentModuleExtendedProps): boolean {
  return !!(
    props.showWeather ||
    props.showStressfulDay ||
    props.showExercise ||
    props.showSleep ||
    props.showTravel ||
    props.showAirQuality ||
    props.showScreenTime ||
    props.showSocialInteraction ||
    props.showMentalLoad ||
    props.showCustomFactors
  );
}

function buildEnvironmentRows(
  props: EnvironmentModuleExtendedProps,
): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();
  const exerciseMode = props.exerciseMode ?? 'toggle';

  if (props.showWeather) {
    rows.set('weather', {
      id: 'weather',
      type: 'chips',
      label: 'WEATHER TODAY',
      options: props.weatherOptions ?? DEFAULT_WEATHER_OPTIONS,
      wrap: true,
      multi: true,
    });
  }

  if (props.showStressfulDay) {
    rows.set('stressfulDay', {
      id: 'stressfulDay',
      type: 'toggle',
      label: 'STRESSFUL DAY?',
    });
  }

  if (props.showExercise) {
    if (exerciseMode === 'counter') {
      rows.set('exercise', {
        id: 'exercise',
        type: 'counter',
        label: 'EXERCISE',
        unitLabel: 'MINS',
      });
    } else {
      rows.set('exercise', {
        id: 'exercise',
        type: 'toggle',
        label: 'EXERCISED TODAY?',
      });
    }
  }

  if (props.showSleep) {
    rows.set('sleepQuality', {
      id: 'sleepQuality',
      type: 'chips',
      label: 'SLEEP LAST NIGHT',
      options: props.sleepOptions ?? DEFAULT_SLEEP_OPTIONS,
      wrap: true,
      multi: false,
    });
  }

  if (props.showTravel) {
    rows.set('travel', {
      id: 'travel',
      type: 'toggle',
      label: 'TRAVELLING TODAY?',
    });
  }

  if (props.showAirQuality) {
    rows.set('airQuality', {
      id: 'airQuality',
      type: 'chips',
      label: 'AIR QUALITY',
      options: props.airQualityOptions ?? DEFAULT_AIR_QUALITY_OPTIONS,
      wrap: true,
      multi: false,
    });
  }

  if (props.showScreenTime) {
    rows.set('screenTime', {
      id: 'screenTime',
      type: 'counter',
      label: 'SCREEN TIME',
      unitLabel: 'HRS',
    });
  }

  if (props.showSocialInteraction) {
    rows.set('socialInteraction', {
      id: 'socialInteraction',
      type: 'level',
      label: 'SOCIAL INTERACTION',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showMentalLoad) {
    rows.set('mentalLoad', {
      id: 'mentalLoad',
      type: 'level',
      label: 'MENTAL LOAD',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showCustomFactors) {
    rows.set('customFactors', {
      id: 'customFactors',
      type: 'chips',
      label: 'OTHER FACTORS',
      options: props.customFactorOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  return rows;
}

function orderEnvironmentRows(
  enabledRows: Map<string, RowConfig>,
  rowOrder?: string[],
): RowConfig[] {
  const ordered: RowConfig[] = [];
  const seen = new Set<string>();
  const order = rowOrder ?? [...DEFAULT_ENVIRONMENT_ROW_ORDER];

  for (const rowId of order) {
    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
      seen.add(rowId);
    }
  }

  for (const rowId of DEFAULT_ENVIRONMENT_ROW_ORDER) {
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

function buildEnvironmentConfig(
  props: EnvironmentModuleExtendedProps,
): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'environment';
  const title = props.environmentCardTitle ?? 'CONDITIONS TODAY';
  const enabledRows = buildEnvironmentRows(props);

  return {
    id: moduleId,
    title,
    rows: orderEnvironmentRows(enabledRows, props.rowOrder),
  };
}

interface FactorsCardProps {
  title: string;
  showFactors: boolean;
  showPollen: boolean;
  factorOptions: string[];
  pollenSnapshot: PollenSnapshot | null;
  pollenLoadState: PollenLoadState;
  onFactorsLog?: (entry: EnvironmentEntry) => void;
}

function factorsCardHasContent(
  showFactors: boolean,
  factorOptions: string[],
  showPollen: boolean,
  pollenLoadState: PollenLoadState,
  pollenSnapshot: PollenSnapshot | null,
): boolean {
  const hasFactorChips = showFactors && factorOptions.length > 0;
  const hasPollenContent =
    showPollen && pollenLoadState === 'success' && pollenSnapshot !== null;

  return hasFactorChips || hasPollenContent;
}

function FactorsCard({
  title,
  showFactors,
  showPollen,
  factorOptions,
  pollenSnapshot,
  pollenLoadState,
  onFactorsLog,
}: FactorsCardProps) {
  const hasFactorChips = showFactors && factorOptions.length > 0;
  const hasPollenContent =
    showPollen && pollenLoadState === 'success' && pollenSnapshot !== null;

  if (!hasFactorChips && !hasPollenContent) {
    return null;
  }

  const handleFactorsLog = (entry: EnvironmentEntry) => {
    const enriched: EnvironmentEntry = {
      ...entry,
      pollenSnapshot:
        showPollen && pollenSnapshot ? pollenSnapshot : entry.pollenSnapshot,
    };

    void Promise.resolve(onFactorsLog?.(enriched)).catch(() => {
      // fail silently
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {hasPollenContent ? (
        <>
          <PollenReadOnlyRow
            snapshot={pollenSnapshot}
            loadState={pollenLoadState}
          />
          {hasFactorChips ? <View style={styles.divider} /> : null}
        </>
      ) : null}

      {hasFactorChips ? (
        <EnvironmentModule
          label=""
          options={factorOptions}
          enablePollenTracking={false}
          onLog={handleFactorsLog}
        />
      ) : null}
    </View>
  );
}

export default function EnvironmentModuleExtended(
  props: EnvironmentModuleExtendedProps,
) {
  const {
    moduleId = 'environment',
    factorsCardTitle = 'ENVIRONMENT',
    showFactors = false,
    showPollen = false,
    factorOptions = [],
    onFactorsLog,
    onEnvironmentLog,
  } = props;

  const resolvedFactorOptions =
    showFactors && factorOptions.length === 0
      ? filterDefaultFactorOptions(props)
      : factorOptions;

  const showEnvironmentCard = hasEnvironmentRows(props);
  const { snapshot: pollenSnapshot, loadState: pollenLoadState } =
    usePollenSnapshot(showPollen);

  const showFactorsCard = factorsCardHasContent(
    showFactors,
    resolvedFactorOptions,
    showPollen,
    pollenLoadState,
    pollenSnapshot,
  );
  const environmentConfig = showEnvironmentCard
    ? buildEnvironmentConfig(props)
    : null;

  const handleEnvironmentLog = (payload: RowLogPayload[]) => {
    const ts = new Date().toISOString();
    const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
      id: generateId(),
      rowId,
      moduleId,
      type: value.type,
      value,
      ts,
    }));

    void Promise.resolve(onEnvironmentLog?.(entries)).catch(() => {
      // fail silently
    });
  };

  return (
    <View>
      {showFactorsCard ? (
        <FactorsCard
          title={factorsCardTitle}
          showFactors={showFactors}
          showPollen={showPollen}
          factorOptions={resolvedFactorOptions}
          pollenSnapshot={pollenSnapshot}
          pollenLoadState={pollenLoadState}
          onFactorsLog={onFactorsLog}
        />
      ) : null}

      {showEnvironmentCard && environmentConfig ? (
        <View style={styles.environmentCard}>
          <ModuleCard
            config={environmentConfig}
            onLog={handleEnvironmentLog}
          />
        </View>
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
  divider: {
    height: 1,
    backgroundColor: color.border2,
    marginBottom: space.lg,
  },
  pollenStatus: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
  },
  pollenInlineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    columnGap: space.lg,
    rowGap: space.xs,
  },
  pollenSegment: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
  },
  environmentCard: {
    marginBottom: space.cardGap,
  },
});
