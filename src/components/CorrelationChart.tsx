import InsightLine from '@/components/InsightLine';
import { StyleSheet, Text, View } from 'react-native';

import {
  color,
  font,
  fontSize,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface CorrelationDay {
  day: string;
  value1: number;
  value2: number;
  isToday: boolean;
}

export interface CorrelationChartProps {
  label: string;
  days: CorrelationDay[];
  maxValue?: number;
  inputLabel: string;
  outputLabel: string;
  kicker?: string;
  insight?: string;
  boldTerms?: string[];
}

const CHART_HEIGHT = 80;
const MIN_BAR_HEIGHT = 4;
const DEFAULT_MAX_VALUE = 5;
const BAR_GAP = 2;
const LEGEND_DOT_SIZE = 8;
const LEGEND_DOT_RADIUS = 4;

function getBarHeight(value: number, maxValue: number): number {
  const scaled = (value / maxValue) * CHART_HEIGHT;
  return Math.max(MIN_BAR_HEIGHT, scaled);
}

export default function CorrelationChart({
  label,
  days,
  maxValue = DEFAULT_MAX_VALUE,
  inputLabel,
  outputLabel,
  kicker = 'CORRELATION · BUILDING',
  insight,
  boldTerms,
}: CorrelationChartProps) {
  const resolvedInsight =
    insight ??
    `Log ${inputLabel.toLowerCase()} and ${outputLabel.toLowerCase()} to surface patterns.`;
  const resolvedBoldTerms = boldTerms ?? [inputLabel, outputLabel];

  return (
    <View>
      <Text style={styles.sectionLabel}>{sentenceCase(label)}</Text>

      <View style={styles.chartArea}>
        {days.map((day, index) => (
          <View key={`${day.day}-${index}`} style={styles.dayColumn}>
            <View
              style={[
                styles.bar,
                styles.barWhite,
                {
                  height: getBarHeight(day.value1, maxValue),
                  opacity: day.isToday ? 1 : 0.5,
                },
              ]}
            />
            <View
              style={[
                styles.bar,
                styles.barAccent,
                {
                  height: getBarHeight(day.value2, maxValue),
                  opacity: day.isToday ? 1 : 0.5,
                },
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.dayLabelsRow}>
        {days.map((day, index) => (
          <Text
            key={`${day.day}-label-${index}`}
            style={[
              styles.dayLabel,
              day.isToday ? styles.dayLabelToday : styles.dayLabelDefault,
            ]}>
            {day.day}
          </Text>
        ))}
      </View>

      <View style={styles.divider} />

      <InsightLine
        kicker={kicker}
        insight={resolvedInsight}
        boldTerms={resolvedBoldTerms}
      />

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotWhite]} />
          <Text style={styles.legendLabel}>{inputLabel}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, styles.legendDotAccent]} />
          <Text style={styles.legendLabel}>{outputLabel}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.headline,
    color: color.title,
    marginBottom: space.md,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: CHART_HEIGHT,
    gap: space.xs,
    marginBottom: space.sm,
  },
  dayColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: BAR_GAP,
  },
  bar: {
    flex: 1,
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    minHeight: MIN_BAR_HEIGHT,
  },
  barWhite: {
    backgroundColor: color.text1,
  },
  barAccent: {
    backgroundColor: color.accent,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginBottom: space.sm,
  },
  dayLabel: {
    flex: 1,
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    marginTop: space.xs,
    textAlign: 'center',
  },
  dayLabelDefault: {
    color: color.text3,
  },
  dayLabelToday: {
    color: color.accent,
  },
  divider: {
    height: 1,
    backgroundColor: color.border,
    marginVertical: space.md,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    marginTop: space.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  legendDot: {
    width: LEGEND_DOT_SIZE,
    height: LEGEND_DOT_SIZE,
    borderRadius: LEGEND_DOT_RADIUS,
  },
  legendDotWhite: {
    backgroundColor: color.text1,
  },
  legendDotAccent: {
    backgroundColor: color.accent,
  },
  legendLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
});
