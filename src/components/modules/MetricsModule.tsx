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

export interface CustomMetricConfig {
  id: string;
  label: string;
  unit?: string;
  step?: number;
}

export interface MetricsModuleProps {
  showRevenue?: boolean;
  showExpenses?: boolean;
  showProfit?: boolean;
  showLeads?: boolean;
  showCalls?: boolean;
  showConversions?: boolean;
  showHours?: boolean;
  showProductivity?: boolean;
  showMomentum?: boolean;
  showFounderEnergy?: boolean;
  showStress?: boolean;
  showCosts?: boolean;
  showPriorities?: boolean;

  costOptions?: string[];
  priorityOptions?: string[];

  customMetrics?: CustomMetricConfig[];

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_ROW_ORDER = [
  'revenue',
  'expenses',
  'profit',
  'leads',
  'calls',
  'conversions',
  'hours',
  'productivity',
  'momentum',
  'founderEnergy',
  'stress',
  'costs',
  'priorities',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const DEFAULT_CURRENCY_UNIT = '£';

type OrderedRow =
  | { kind: 'config'; config: RowConfig }
  | { kind: 'profit' };

interface MetricsModuleCardProps {
  config: ModuleCardConfig;
  orderedRows: OrderedRow[];
  showRevenue: boolean;
  showExpenses: boolean;
  currencyUnit: string;
  onLog: (values: RowLogPayload[]) => void;
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

function getMetricValue(
  staged: Record<string, RowValue>,
  rowId: string,
): number | null {
  const value = staged[rowId];

  if (value?.type === 'metric') {
    return value.value;
  }

  return null;
}

interface ProfitRowProps {
  staged: Record<string, RowValue>;
  showRevenue: boolean;
  showExpenses: boolean;
  currencyUnit: string;
}

function ProfitRow({
  staged,
  showRevenue,
  showExpenses,
  currencyUnit,
}: ProfitRowProps) {
  const revenue =
    showRevenue ? getMetricValue(staged, 'revenue') : null;
  const expenses =
    showExpenses ? getMetricValue(staged, 'expenses') : null;

  const inputsEnabled = showRevenue && showExpenses;
  const bothStaged =
    inputsEnabled && revenue !== null && expenses !== null;

  let displayValue = '–';
  let valueColor: string = color.text3;

  if (bothStaged) {
    const profit = revenue - expenses;
    displayValue = String(profit);

    if (profit > 0) {
      valueColor = color.accent;
    } else if (profit < 0) {
      valueColor = color.danger;
    } else {
      valueColor = color.text2;
    }
  }

  return (
    <View>
      <Text style={rowStyles.rowLabel}>PROFIT</Text>
      <View style={styles.profitValueRow}>
        <Text style={styles.profitCurrency}>{currencyUnit}</Text>
        <Text style={[styles.profitValue, { color: valueColor }]}>
          {displayValue}
        </Text>
      </View>
    </View>
  );
}

function MetricsModuleCard({
  config,
  orderedRows,
  showRevenue,
  showExpenses,
  currencyUnit,
  onLog,
}: MetricsModuleCardProps) {
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
      // fail silently — never block or show error to user
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
          key={row.kind === 'profit' ? 'profit' : row.config.id}
          style={[
            styles.rowBlock,
            index < orderedRows.length - 1 && styles.rowBlockDivider,
          ]}>
          {row.kind === 'profit' ? (
            <ProfitRow
              staged={staged}
              showRevenue={showRevenue}
              showExpenses={showExpenses}
              currencyUnit={currencyUnit}
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

function buildEnabledRows(props: MetricsModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showRevenue) {
    rows.set('revenue', {
      id: 'revenue',
      type: 'metric',
      label: 'REVENUE',
      unit: '£',
      showTrend: true,
      step: 1,
    });
  }

  if (props.showExpenses) {
    rows.set('expenses', {
      id: 'expenses',
      type: 'metric',
      label: 'EXPENSES',
      unit: '£',
      showTrend: true,
      step: 1,
    });
  }

  if (props.showLeads) {
    rows.set('leads', {
      id: 'leads',
      type: 'counter',
      label: 'LEADS TODAY',
      unitLabel: 'LEADS',
    });
  }

  if (props.showCalls) {
    rows.set('calls', {
      id: 'calls',
      type: 'counter',
      label: 'CALLS MADE',
      unitLabel: 'CALLS',
    });
  }

  if (props.showConversions) {
    rows.set('conversions', {
      id: 'conversions',
      type: 'counter',
      label: 'CONVERSIONS',
      unitLabel: 'SALES',
    });
  }

  if (props.showHours) {
    rows.set('hours', {
      id: 'hours',
      type: 'metric',
      label: 'HOURS WORKED',
      unit: 'hrs',
      showTrend: true,
      step: 0.5,
    });
  }

  if (props.showProductivity) {
    rows.set('productivity', {
      id: 'productivity',
      type: 'scale',
      label: 'PRODUCTIVITY',
      max: 5,
    });
  }

  if (props.showMomentum) {
    rows.set('momentum', {
      id: 'momentum',
      type: 'level',
      label: 'BUSINESS MOMENTUM',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showFounderEnergy) {
    rows.set('founderEnergy', {
      id: 'founderEnergy',
      type: 'level',
      label: 'FOUNDER ENERGY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showStress) {
    rows.set('stress', {
      id: 'stress',
      type: 'level',
      label: 'STRESS LEVEL',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showCosts) {
    rows.set('costs', {
      id: 'costs',
      type: 'chips',
      label: 'COSTS INCURRED TODAY',
      options: props.costOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showPriorities) {
    rows.set('priorities', {
      id: 'priorities',
      type: 'chips',
      label: 'PRIORITIES COMPLETED',
      options: props.priorityOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  for (const metric of props.customMetrics ?? []) {
    rows.set(metric.id, {
      id: metric.id,
      type: 'metric',
      label: metric.label,
      unit: metric.unit,
      showTrend: true,
      step: metric.step ?? 1,
    });
  }

  return rows;
}

function getDefaultOrder(customMetrics?: CustomMetricConfig[]): string[] {
  return [
    ...DEFAULT_ROW_ORDER,
    ...(customMetrics?.map((metric) => metric.id) ?? []),
  ];
}

function buildOrderedRows(props: MetricsModuleProps): OrderedRow[] {
  const enabledRows = buildEnabledRows(props);
  const ordered: OrderedRow[] = [];
  const seen = new Set<string>();
  const order = props.rowOrder ?? getDefaultOrder(props.customMetrics);

  const pushRow = (rowId: string) => {
    if (seen.has(rowId)) {
      return;
    }

    if (rowId === 'profit' && props.showProfit) {
      ordered.push({ kind: 'profit' });
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

  for (const rowId of getDefaultOrder(props.customMetrics)) {
    pushRow(rowId);
  }

  return ordered;
}

function getCurrencyUnit(props: MetricsModuleProps): string {
  if (props.showRevenue) {
    return '£';
  }

  return DEFAULT_CURRENCY_UNIT;
}

export default function MetricsModule(props: MetricsModuleProps) {
  const {
    moduleId = 'metrics',
    title = 'TODAY',
    onLog,
    showRevenue = false,
    showExpenses = false,
  } = props;

  const orderedRows = buildOrderedRows(props);
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
      // fail silently — never block or show error to user
    });
  };

  return (
    <MetricsModuleCard
      config={config}
      orderedRows={orderedRows}
      showRevenue={showRevenue}
      showExpenses={showExpenses}
      currencyUnit={getCurrencyUnit(props)}
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
  profitValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  profitCurrency: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
  },
  profitValue: {
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
