import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { rowStyles, ROW_CELL_SIZE, ROW_VALUE_SIZE } from '@/components/rows/rowStyles';
import { getDayLogsKey } from '@/storage/storage';
import type { MetricRowConfig, RowBatchLogEntry, RowValue } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface MetricRowProps {
  config: MetricRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
  moduleId: string;
}

const CHART_HEIGHT = 40;
const DOT_SIZE = 6;
const CURRENCY_SYMBOLS = new Set(['£', '$', '€']);

function isCurrencyUnit(unit?: string): boolean {
  return unit ? CURRENCY_SYMBOLS.has(unit) : false;
}

function roundValue(value: number, step: number): number {
  const decimals = step < 1 ? 1 : 0;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function parseStoredRowLogs(raw: unknown, rowId: string, moduleId: string): number[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  const values: { ts: number; value: number }[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') {
      continue;
    }

    const record = entry as Record<string, unknown>;
    const payload = record.value;

    if (!payload || typeof payload !== 'object') {
      continue;
    }

    const rowLog = payload as Partial<RowBatchLogEntry>;

    if (
      rowLog.rowId !== rowId ||
      rowLog.moduleId !== moduleId ||
      rowLog.type !== 'metric' ||
      !rowLog.value ||
      typeof rowLog.value !== 'object' ||
      (rowLog.value as RowValue).type !== 'metric'
    ) {
      continue;
    }

    const metricValue = (rowLog.value as Extract<RowValue, { type: 'metric' }>).value;

    if (typeof metricValue !== 'number' || Number.isNaN(metricValue)) {
      continue;
    }

    const timestamp = typeof rowLog.ts === 'string' ? rowLog.ts : String(record.timestamp ?? '');
    const ts = new Date(timestamp).getTime();

    values.push({
      ts: Number.isNaN(ts) ? 0 : ts,
      value: metricValue,
    });
  }

  return values
    .sort((a, b) => a.ts - b.ts)
    .slice(-7)
    .map((point) => point.value);
}

async function loadTrendValues(rowId: string, moduleId: string): Promise<number[]> {
  const points: { date: string; value: number }[] = [];

  for (let offset = 6; offset >= 0; offset -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateKey = `${year}-${month}-${day}`;

    try {
      const raw = await AsyncStorage.getItem(getDayLogsKey(dateKey));
      if (!raw) {
        continue;
      }

      const parsed = JSON.parse(raw) as unknown;
      const dayValues = parseStoredRowLogs(parsed, rowId, moduleId);

      if (dayValues.length > 0) {
        points.push({
          date: dateKey,
          value: dayValues[dayValues.length - 1],
        });
      }
    } catch {
      // fail silently
    }
  }

  return points.map((point) => point.value);
}

interface MiniTrendProps {
  values: number[];
}

function MiniTrend({ values }: MiniTrendProps) {
  const [chartWidth, setChartWidth] = useState(0);

  if (values.length < 2) {
    return null;
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const getDotBottom = (metricValue: number) => {
    const ratio = (metricValue - min) / range;
    return ratio * (CHART_HEIGHT - DOT_SIZE);
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.trendContainer} onLayout={handleLayout}>
      {chartWidth > 0 ? (
        <View style={styles.chartArea}>
          {values.slice(1).map((point, index) => {
            const prev = values[index];
            const columnWidth = chartWidth / values.length;
            const startX = columnWidth * index + columnWidth / 2;
            const endX = columnWidth * (index + 1) + columnWidth / 2;
            const startY = CHART_HEIGHT - DOT_SIZE / 2 - getDotBottom(prev);
            const endY = CHART_HEIGHT - DOT_SIZE / 2 - getDotBottom(point);
            const dx = endX - startX;
            const dy = endY - startY;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
            const centerX = (startX + endX) / 2;
            const centerY = (startY + endY) / 2;

            return (
              <View
                key={`${index}-${point}`}
                style={[
                  styles.connector,
                  {
                    width: length,
                    left: centerX - length / 2,
                    top: centerY,
                    transform: [{ rotate: `${angle}deg` }],
                  },
                ]}
              />
            );
          })}

          <View style={styles.chartRow}>
            {values.map((point, index) => (
              <View key={`${index}-${point}`} style={styles.chartColumn}>
                <View
                  style={[
                    styles.dot,
                    { bottom: getDotBottom(point) },
                    index === values.length - 1 && styles.dotLatest,
                  ]}
                />
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export default function MetricRow({
  config,
  value,
  onChange,
  moduleId,
}: MetricRowProps) {
  const step = config.step ?? 1;
  const staged = value?.type === 'metric';
  const metricValue = value?.type === 'metric' ? value.value : 0;
  const [inputText, setInputText] = useState('');
  const [trendValues, setTrendValues] = useState<number[]>([]);
  const inputRef = useRef<TextInput>(null);
  const isFocusedRef = useRef(false);

  const currencyBefore = isCurrencyUnit(config.unit);

  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputText(metricValue > 0 ? String(metricValue) : '');
    }
  }, [metricValue]);

  useEffect(() => {
    if (!config.showTrend) {
      return;
    }

    const loadTrend = async () => {
      const values = await loadTrendValues(config.id, moduleId);
      setTrendValues(values);
    };

    void loadTrend();
  }, [config.id, config.showTrend, moduleId]);

  const displayTrend = useMemo(() => {
    if (!config.showTrend) {
      return [];
    }

    if (staged && trendValues.length === 0) {
      return [metricValue];
    }

    if (staged) {
      return [...trendValues.slice(-6), metricValue];
    }

    return trendValues;
  }, [config.showTrend, metricValue, staged, trendValues]);

  const commitInput = () => {
    const parsed = Number(inputText.trim());

    if (Number.isNaN(parsed) || parsed < 0) {
      setInputText(metricValue > 0 ? String(metricValue) : '');
      return;
    }

    const next = roundValue(parsed, step);

    if (next <= 0) {
      onChange(null);
      setInputText('');
      return;
    }

    onChange({ type: 'metric', value: next });
    setInputText(String(next));
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!inputText && metricValue > 0) {
      setInputText(String(metricValue));
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    commitInput();
    Keyboard.dismiss();
  };

  const handleValuePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  };

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={handleValuePress}
        hitSlop={{
          top: space.xs,
          bottom: space.xs,
          left: space.sm,
          right: space.sm,
        }}
        style={styles.valueCell}>
        <View style={styles.valueWrap}>
          {currencyBefore && config.unit ? (
            <Text style={[styles.unit, staged && styles.unitStaged]}>
              {config.unit}
            </Text>
          ) : null}
          <TextInput
            ref={inputRef}
            style={[styles.valueText, staged && styles.valueTextStaged]}
            value={inputText}
            onChangeText={setInputText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={color.text3}
          />
          {!currencyBefore && config.unit ? (
            <Text style={[styles.unit, staged && styles.unitStaged]}>
              {config.unit}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {config.showTrend ? <MiniTrend values={displayTrend} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  valueCell: {
    minWidth: ROW_CELL_SIZE,
    minHeight: ROW_CELL_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    alignSelf: 'flex-start',
  },
  valueWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  valueText: {
    fontFamily: font.mono,
    fontSize: ROW_VALUE_SIZE,
    color: color.text1,
    fontWeight: fontWeight.semibold,
    padding: 0,
    minWidth: 24,
    textAlign: 'center',
  },
  valueTextStaged: {
    color: color.accent,
  },
  unit: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
  },
  unitStaged: {
    color: color.accent,
  },
  trendContainer: {
    marginTop: space.md,
    width: '100%',
  },
  chartArea: {
    height: CHART_HEIGHT,
    position: 'relative',
  },
  chartRow: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
  },
  chartColumn: {
    flex: 1,
    height: CHART_HEIGHT,
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    alignSelf: 'center',
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: color.surface3,
  },
  dotLatest: {
    backgroundColor: color.accent,
  },
  connector: {
    position: 'absolute',
    height: 1,
    backgroundColor: color.border2,
  },
});
