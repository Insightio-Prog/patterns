import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import FeedCard from '@/components/modules/FeedCard';
import ModuleCard from '@/components/ModuleCard';
import ModuleRow from '@/components/rows/ModuleRow';
import NappyCard from '@/components/modules/NappyCard';
import SleepCard from '@/components/modules/SleepCard';
import {
  LOG_BUTTON_HEIGHT,
  LOGGED_CONFIRM_MS,
} from '@/components/modules/babyCardShared';
import { generateId } from '@/utils/generateId';
import type { BabyModuleProps } from '@/types/baby';
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

export type {
  FeedEntry,
  FeedType,
  LengthUnit,
  NappyEntry,
  SleepEntry,
} from '@/types/baby';
export type { BabyModuleProps } from '@/types/baby';

const DEFAULT_GROWTH_ROW_ORDER = [
  'weight',
  'length',
  'headCircumference',
] as const;

const DEFAULT_WELLBEING_ROW_ORDER = [
  'mood',
  'parentEnergy',
  'symptoms',
  'medication',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const MOOD_HINT = '1 = VERY FUSSY · 5 = VERY HAPPY';

function hasFeedCard(props: BabyModuleProps): boolean {
  return !!(
    props.showFeedLog &&
    (props.showBreastfeeding || props.showBottle || props.showSolids)
  );
}

function hasGrowthCard(props: BabyModuleProps): boolean {
  return !!(
    props.showWeight || props.showLength || props.showHeadCircumference
  );
}

function hasWellbeingCard(props: BabyModuleProps): boolean {
  return !!(
    props.showMood ||
    props.showParentEnergy ||
    props.showSymptoms ||
    props.showMedication
  );
}

function buildGrowthRows(props: BabyModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();
  const weightUnit = props.weightUnit ?? 'kg';
  const lengthUnit = props.lengthUnit ?? 'cm';

  if (props.showWeight) {
    rows.set('weight', {
      id: 'weight',
      type: 'metric',
      label: 'WEIGHT',
      unit: weightUnit,
      showTrend: true,
      step: 0.1,
    });
  }

  if (props.showLength) {
    rows.set('length', {
      id: 'length',
      type: 'metric',
      label: 'LENGTH',
      unit: lengthUnit,
      showTrend: true,
      step: 0.5,
    });
  }

  if (props.showHeadCircumference) {
    rows.set('headCircumference', {
      id: 'headCircumference',
      type: 'metric',
      label: 'HEAD CIRCUMFERENCE',
      unit: 'cm',
      showTrend: true,
      step: 0.1,
    });
  }

  return rows;
}

function buildWellbeingRows(props: BabyModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showMood) {
    rows.set('mood', {
      id: 'mood',
      type: 'scale',
      label: 'MOOD & FUSSINESS',
      max: 5,
    });
  }

  if (props.showParentEnergy) {
    rows.set('parentEnergy', {
      id: 'parentEnergy',
      type: 'level',
      label: 'PARENT ENERGY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showSymptoms) {
    rows.set('symptoms', {
      id: 'symptoms',
      type: 'chips',
      label: 'SYMPTOMS TODAY',
      options: props.symptomOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showMedication) {
    rows.set('medication', {
      id: 'medication',
      type: 'chips',
      label: 'MEDICATION GIVEN',
      options: props.medicationOptions ?? [],
      wrap: true,
      multi: true,
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

function buildGrowthConfig(props: BabyModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'baby';
  const title = props.growthCardTitle ?? 'GROWTH';

  return {
    id: moduleId,
    title,
    rows: orderRows(
      buildGrowthRows(props),
      DEFAULT_GROWTH_ROW_ORDER,
      props.growthRowOrder,
    ),
  };
}

function buildWellbeingConfig(props: BabyModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'baby';
  const title = props.wellbeingCardTitle ?? 'WELLBEING';

  return {
    id: moduleId,
    title,
    rows: orderRows(
      buildWellbeingRows(props),
      DEFAULT_WELLBEING_ROW_ORDER,
      props.wellbeingRowOrder,
    ),
  };
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

interface WellbeingBabyCardProps {
  config: ModuleCardConfig;
  showMoodHint: boolean;
  onLog: (values: RowLogPayload[]) => void;
}

function WellbeingBabyCard({
  config,
  showMoodHint,
  onLog,
}: WellbeingBabyCardProps) {
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
    <View style={wellbeingStyles.card}>
      <Text style={wellbeingStyles.title}>{config.title}</Text>

      {config.rows.map((row, index) => (
        <View
          key={row.id}
          style={[
            wellbeingStyles.rowBlock,
            index < config.rows.length - 1 && wellbeingStyles.rowBlockDivider,
          ]}>
          <ModuleRow
            config={row}
            value={staged[row.id] ?? null}
            onChange={(value) => handleRowChange(row.id, value)}
            moduleId={config.id}
          />
          {showMoodHint && row.id === 'mood' ? (
            <Text style={wellbeingStyles.moodHint}>{MOOD_HINT}</Text>
          ) : null}
        </View>
      ))}

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!canLog && !loggedConfirm}
        onPress={handleLog}
        style={[
          wellbeingStyles.logButton,
          canLog ? wellbeingStyles.logButtonActive : wellbeingStyles.logButtonDisabled,
          loggedConfirm && wellbeingStyles.logButtonLogged,
        ]}>
        <Text
          style={[
            wellbeingStyles.logButtonLabel,
            canLog
              ? wellbeingStyles.logButtonLabelActive
              : wellbeingStyles.logButtonLabelDisabled,
            loggedConfirm && wellbeingStyles.logButtonLabelLogged,
          ]}>
          {getLogLabel(stagedCount, loggedConfirm)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function createBatchLogHandler(
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

export default function BabyModule(props: BabyModuleProps) {
  const {
    moduleId = 'baby',
    feedCardTitle = 'FEEDS TODAY',
    sleepCardTitle = 'SLEEP TODAY',
    nappyCardTitle = 'NAPPIES TODAY',
    showFeedLog = false,
    showBreastfeeding = false,
    showBottle = false,
    showSolids = false,
    showSleepLog = false,
    showNappyLog = false,
    onFeedLog,
    onSleepLog,
    onNappyLog,
    onGrowthLog,
    onWellbeingLog,
  } = props;

  const showFeedCard = hasFeedCard(props);
  const showGrowthCard = hasGrowthCard(props);
  const showWellbeingCard = hasWellbeingCard(props);

  const growthConfig = showGrowthCard ? buildGrowthConfig(props) : null;
  const wellbeingConfig = showWellbeingCard ? buildWellbeingConfig(props) : null;

  const handleGrowthLog = createBatchLogHandler(moduleId, onGrowthLog);
  const handleWellbeingLog = createBatchLogHandler(moduleId, onWellbeingLog);

  return (
    <View>
      {showFeedCard ? (
        <FeedCard
          title={feedCardTitle}
          showBreastfeeding={showBreastfeeding}
          showBottle={showBottle}
          showSolids={showSolids}
          onLog={onFeedLog}
        />
      ) : null}

      {showSleepLog ? (
        <SleepCard title={sleepCardTitle} onLog={onSleepLog} />
      ) : null}

      {showNappyLog ? (
        <NappyCard title={nappyCardTitle} onLog={onNappyLog} />
      ) : null}

      {showGrowthCard && growthConfig && growthConfig.rows.length > 0 ? (
        <View style={wellbeingStyles.cardSpacing}>
          <ModuleCard config={growthConfig} onLog={handleGrowthLog} />
        </View>
      ) : null}

      {showWellbeingCard &&
      wellbeingConfig &&
      wellbeingConfig.rows.length > 0 ? (
        <WellbeingBabyCard
          config={wellbeingConfig}
          showMoodHint={!!props.showMood}
          onLog={handleWellbeingLog}
        />
      ) : null}
    </View>
  );
}

const wellbeingStyles = StyleSheet.create({
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
  moodHint: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    marginTop: space.xs,
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
  cardSpacing: {
    marginBottom: space.cardGap,
  },
});
