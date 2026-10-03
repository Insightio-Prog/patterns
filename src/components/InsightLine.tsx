import { StyleSheet, Text, View } from 'react-native';

import {
  color,
  font,
  fontSize,
  letterSpacing,
  space,
} from '@/theme/theme';

export interface InsightLineProps {
  kicker: string;
  insight: string;
  boldTerms?: string[];
}

const DIAMOND_FONT_SIZE = fontSize.monoData;
const INSIGHT_LINE_HEIGHT = 18;
const DIAMOND_MARGIN_TOP = 1;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function renderInsightText(
  insight: string,
  boldTerms: string[] | undefined,
) {
  if (!boldTerms?.length) {
    return <Text style={styles.insight}>{insight}</Text>;
  }

  const pattern = boldTerms
    .map(escapeRegExp)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');
  const parts = insight.split(regex).filter((part) => part.length > 0);

  return (
    <Text style={styles.insight}>
      {parts.map((part, index) => {
        const isBold = boldTerms.some(
          (term) => part.toLowerCase() === term.toLowerCase(),
        );

        if (isBold) {
          return (
            <Text key={`${part}-${index}`} style={styles.insightBold}>
              {part}
            </Text>
          );
        }

        return part;
      })}
    </Text>
  );
}

export default function InsightLine({
  kicker,
  insight,
  boldTerms,
}: InsightLineProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.diamond}>◇</Text>
      <View style={styles.content}>
        <Text style={styles.kicker}>{kicker}</Text>
        {renderInsightText(insight, boldTerms)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
  },
  diamond: {
    fontFamily: font.mono,
    fontSize: DIAMOND_FONT_SIZE,
    color: color.accent,
    marginTop: DIAMOND_MARGIN_TOP,
  },
  content: {
    flex: 1,
    flexDirection: 'column',
    gap: space.xs,
  },
  kicker: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
  },
  insight: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text2,
    lineHeight: INSIGHT_LINE_HEIGHT,
  },
  insightBold: {
    fontFamily: font.uiMedium,
    color: color.text1,
  },
});
