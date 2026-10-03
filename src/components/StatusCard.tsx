import InsightLine from '@/components/InsightLine';
import WeeklyBarChart, { type DayBar } from '@/components/WeeklyBarChart';
import { StyleSheet, Text, View } from 'react-native';

import {
  color,
  font,
  fontSize,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface StatusCardProps {
  subjectName: string;
  dayCount: number;
  streakCount: number;
  summary: string;
  kicker: string;
  insight: string;
  boldTerms?: string[];
  /** Last 7 days; when given, a compact week strip sits inside the card. */
  weekBars?: DayBar[];
  weekCaption?: string;
}

const STREAK_DOT_SIZE = 6;
const STREAK_DOT_RADIUS = 3;
const STREAK_DOT_GAP = 2;
const DAY_MARKER_SIZE = 7;
const DAY_MARKER_RADIUS = 2;
const SUMMARY_LINE_HEIGHT = 24;
const MAX_STREAK_DOTS = 7;

export default function StatusCard({
  subjectName: _subjectName,
  dayCount,
  streakCount,
  summary,
  kicker,
  insight,
  boldTerms,
  weekBars,
  weekCaption,
}: StatusCardProps) {
  const streakDots = Math.min(streakCount, MAX_STREAK_DOTS);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.todayLabel}>TODAY</Text>
        <View style={styles.streakRow}>
          {Array.from({ length: streakDots }).map((_, index) => (
            <View key={`streak-dot-${index}`} style={styles.streakDot} />
          ))}
          {streakCount > MAX_STREAK_DOTS ? (
            <Text style={styles.streakEllipsis}>...</Text>
          ) : null}
          <Text style={styles.streakLabel}>
            STREAK {String(streakCount).padStart(2, '0')}
          </Text>
        </View>
      </View>

      <Text style={styles.summary}>
        {summary.replace(/\bentrys\b/g, 'entries')}
      </Text>

      <View style={styles.dayBadgeRow}>
        <View style={styles.dayMarker} />
        <Text style={styles.dayLabel}>
          DAY {String(dayCount).padStart(2, '0')}
        </Text>
      </View>

      {weekBars ? (
        <View style={styles.weekBlock}>
          {weekCaption ? (
            <Text style={styles.weekCaption}>{weekCaption}</Text>
          ) : null}
          <WeeklyBarChart compact label="" bars={weekBars} kicker="" insight="" />
        </View>
      ) : null}
      <View style={styles.divider} />
      <InsightLine
        kicker={kicker}
        insight={insight}
        boldTerms={boldTerms}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.cardPad,
    marginBottom: space.cardGap,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space.md,
  },
  todayLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  streakDot: {
    width: STREAK_DOT_SIZE,
    height: STREAK_DOT_SIZE,
    borderRadius: STREAK_DOT_RADIUS,
    backgroundColor: color.accent,
    marginRight: STREAK_DOT_GAP,
  },
  streakEllipsis: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text2,
  },
  streakLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text2,
  },
  summary: {
    fontSize: fontSize.headline,
    fontFamily: font.uiMedium,
    color: color.title,
    marginBottom: space.md,
    lineHeight: SUMMARY_LINE_HEIGHT,
  },
  dayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginBottom: space.md,
  },
  dayMarker: {
    width: DAY_MARKER_SIZE,
    height: DAY_MARKER_SIZE,
    backgroundColor: color.accent,
    borderRadius: DAY_MARKER_RADIUS,
  },
  dayLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text2,
  },
  weekBlock: {
    marginBottom: space.md,
  },
  weekCaption: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    marginBottom: space.sm,
  },
  divider: {
    height: 1,
    backgroundColor: color.border,
    marginBottom: space.md,
  },
});
