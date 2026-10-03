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

export interface DayBar {
  day: string;
  value: number;
  isToday: boolean;
}

export interface WeeklyBarChartProps {
  label: string;
  bars: DayBar[];
  kicker: string;
  insight: string;
  boldTerms?: string[];
  /** Small strip: just bars + day letters (no label, divider or insight). */
  compact?: boolean;
}

const MAX_BAR_HEIGHT = 80;
const COMPACT_BAR_HEIGHT = 36;
const MIN_BAR_HEIGHT = 3;

function getBarHeights(bars: DayBar[], maxHeight: number): number[] {
  const maxValue = Math.max(...bars.map((bar) => bar.value), 0);

  if (maxValue === 0) {
    return bars.map(() => MIN_BAR_HEIGHT);
  }

  return bars.map((bar) => Math.max(MIN_BAR_HEIGHT, (bar.value / maxValue) * maxHeight));
}

export default function WeeklyBarChart({
  label,
  bars,
  kicker,
  insight,
  boldTerms,
  compact = false,
}: WeeklyBarChartProps) {
  const maxHeight = compact ? COMPACT_BAR_HEIGHT : MAX_BAR_HEIGHT;
  const barHeights = getBarHeights(bars, maxHeight);

  return (
    <View>
      {compact ? null : <Text style={styles.sectionLabel}>{label}</Text>}

      <View style={[styles.chartArea, { height: maxHeight }]}>
        {bars.map((bar, index) => (
          <View key={`${bar.day}-${index}`} style={styles.column}>
            <View
              style={[
                styles.bar,
                { height: barHeights[index] },
                bar.isToday ? styles.barToday : styles.barDefault,
              ]}
            />
          </View>
        ))}
      </View>

      <View style={styles.dayLabelsRow}>
        {bars.map((bar, index) => (
          <View key={`${bar.day}-label-${index}`} style={styles.dayLabelColumn}>
            <Text
              style={[
                styles.dayLabel,
                bar.isToday ? styles.dayLabelToday : styles.dayLabelDefault,
              ]}>
              {bar.day}
            </Text>
          </View>
        ))}
      </View>

      {compact ? null : (
        <>
          <View style={styles.divider} />
          <InsightLine kicker={kicker} insight={insight} boldTerms={boldTerms} />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    marginBottom: space.md,
  },
  chartArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: MAX_BAR_HEIGHT,
    gap: space.xs,
    marginBottom: space.sm,
  },
  column: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: radius.sm,
    borderTopRightRadius: radius.sm,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderWidth: 1,
  },
  barDefault: {
    backgroundColor: color.surface3,
    borderColor: color.border,
  },
  barToday: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    gap: space.xs,
  },
  dayLabelColumn: {
    flex: 1,
    alignItems: 'center',
  },
  dayLabel: {
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
});
