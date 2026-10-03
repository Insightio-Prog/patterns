import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ModuleRow from '@/components/rows/ModuleRow';
import { rowStyles } from '@/components/rows/rowStyles';
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

export interface SocialModuleProps {
  showInteractions?: boolean;
  showInteractionType?: boolean;
  showMoodBefore?: boolean;
  showMoodAfter?: boolean;
  showSocialBattery?: boolean;
  showAnxietyBefore?: boolean;
  showAnxietyAfter?: boolean;
  showEnergyAfter?: boolean;
  showQuality?: boolean;
  showInitiated?: boolean;
  showAvoided?: boolean;
  showAlcohol?: boolean;
  showActivities?: boolean;
  showTriggers?: boolean;

  interactionTypeOptions?: string[];
  activityOptions?: string[];
  triggerOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

type OrderedRow =
  | { kind: 'config'; config: RowConfig }
  | { kind: 'socialBattery' };

const DEFAULT_ROW_ORDER = [
  'interactions',
  'interactionType',
  'moodBefore',
  'moodAfter',
  'socialBattery',
  'anxietyBefore',
  'anxietyAfter',
  'energyAfter',
  'quality',
  'initiated',
  'avoided',
  'alcohol',
  'activities',
  'triggers',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const BATTERY_VALUE_SIZE = 16;

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

function getScaleValue(
  staged: Record<string, RowValue>,
  rowId: string,
): number | null {
  const value = staged[rowId];

  if (value?.type === 'scale') {
    return value.value;
  }

  return null;
}

function buildEnabledRows(props: SocialModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showInteractions) {
    rows.set('interactions', {
      id: 'interactions',
      type: 'counter',
      label: 'INTERACTIONS TODAY',
      unitLabel: 'INTERACTIONS',
    });
  }

  if (props.showInteractionType) {
    rows.set('interactionType', {
      id: 'interactionType',
      type: 'chips',
      label: 'WHO WITH',
      options: props.interactionTypeOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showMoodBefore) {
    rows.set('moodBefore', {
      id: 'moodBefore',
      type: 'scale',
      label: 'MOOD BEFORE',
      max: 5,
    });
  }

  if (props.showMoodAfter) {
    rows.set('moodAfter', {
      id: 'moodAfter',
      type: 'scale',
      label: 'MOOD AFTER',
      max: 5,
    });
  }

  if (props.showAnxietyBefore) {
    rows.set('anxietyBefore', {
      id: 'anxietyBefore',
      type: 'scale',
      label: 'ANXIETY BEFORE',
      max: 5,
    });
  }

  if (props.showAnxietyAfter) {
    rows.set('anxietyAfter', {
      id: 'anxietyAfter',
      type: 'scale',
      label: 'ANXIETY AFTER',
      max: 5,
    });
  }

  if (props.showEnergyAfter) {
    rows.set('energyAfter', {
      id: 'energyAfter',
      type: 'level',
      label: 'ENERGY AFTER',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showQuality) {
    rows.set('quality', {
      id: 'quality',
      type: 'scale',
      label: 'INTERACTION QUALITY',
      max: 5,
    });
  }

  if (props.showInitiated) {
    rows.set('initiated', {
      id: 'initiated',
      type: 'toggle',
      label: 'DID YOU INITIATE?',
    });
  }

  if (props.showAvoided) {
    rows.set('avoided', {
      id: 'avoided',
      type: 'toggle',
      label: 'AVOIDED A SITUATION?',
    });
  }

  if (props.showAlcohol) {
    rows.set('alcohol', {
      id: 'alcohol',
      type: 'counter',
      label: 'ALCOHOL',
      unitLabel: 'UNITS',
    });
  }

  if (props.showActivities) {
    rows.set('activities', {
      id: 'activities',
      type: 'chips',
      label: 'SOCIAL ACTIVITIES',
      options: props.activityOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showTriggers) {
    rows.set('triggers', {
      id: 'triggers',
      type: 'chips',
      label: 'TRIGGERS TODAY',
      options: props.triggerOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  return rows;
}

function buildOrderedRows(props: SocialModuleProps): OrderedRow[] {
  const enabledRows = buildEnabledRows(props);
  const ordered: OrderedRow[] = [];
  const seen = new Set<string>();
  const order = props.rowOrder ?? [...DEFAULT_ROW_ORDER];

  const pushRow = (rowId: string) => {
    if (seen.has(rowId)) {
      return;
    }

    if (rowId === 'socialBattery' && props.showSocialBattery) {
      ordered.push({ kind: 'socialBattery' });
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

interface SocialBatteryRowProps {
  staged: Record<string, RowValue>;
}

function SocialBatteryRow({ staged }: SocialBatteryRowProps) {
  const moodBefore = getScaleValue(staged, 'moodBefore');
  const moodAfter = getScaleValue(staged, 'moodAfter');

  let displayValue = '–';
  let valueColor: string = color.text3;

  if (moodBefore !== null && moodAfter !== null) {
    const delta = moodAfter - moodBefore;

    if (delta > 0) {
      displayValue = `+${delta} ENERGISED`;
      valueColor = color.accent;
    } else if (delta < 0) {
      displayValue = `${delta} DRAINED`;
      valueColor = color.danger;
    } else {
      displayValue = 'NEUTRAL';
      valueColor = color.text2;
    }
  }

  return (
    <View>
      <Text style={rowStyles.rowLabel}>SOCIAL BATTERY</Text>
      <Text style={[styles.batteryValue, { color: valueColor }]}>
        {displayValue}
      </Text>
    </View>
  );
}

interface SocialModuleCardProps {
  config: ModuleCardConfig;
  orderedRows: OrderedRow[];
  onLog: (values: RowLogPayload[]) => void;
}

function SocialModuleCard({
  config,
  orderedRows,
  onLog,
}: SocialModuleCardProps) {
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
    <View style={styles.card}>
      <Text style={styles.title}>{config.title}</Text>

      {orderedRows.map((row, index) => (
        <View
          key={row.kind === 'socialBattery' ? 'socialBattery' : row.config.id}
          style={[
            styles.rowBlock,
            index < orderedRows.length - 1 && styles.rowBlockDivider,
          ]}>
          {row.kind === 'socialBattery' ? (
            <SocialBatteryRow staged={staged} />
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

export default function SocialModule(props: SocialModuleProps) {
  const { moduleId = 'social', title = 'SOCIAL TODAY', onLog } = props;
  const orderedRows = buildOrderedRows(props);

  if (orderedRows.length === 0) {
    return null;
  }

  const config: ModuleCardConfig = {
    id: moduleId,
    title,
    rows: orderedRows
      .filter((row): row is { kind: 'config'; config: RowConfig } => row.kind === 'config')
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
    <SocialModuleCard
      config={config}
      orderedRows={orderedRows}
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
  batteryValue: {
    fontFamily: font.mono,
    fontSize: BATTERY_VALUE_SIZE,
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
