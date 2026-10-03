import { StyleSheet, Text, View } from 'react-native';

import {
  color,
  font,
  space,
} from '@/theme/theme';

export const MARK_SQUARE_SIZE = 5;
export const MARK_SQUARE_RADIUS = 1;
export const MARK_BAR_GAP = 2;
export const MARK_COL_GAP = 1.5;

const COLUMN_SQUARE_COUNTS = [1, 2, 3, 4] as const;

const MARK_SIZE_PRESETS = {
  default: {
    squareSize: MARK_SQUARE_SIZE,
    squareRadius: MARK_SQUARE_RADIUS,
    barGap: MARK_BAR_GAP,
    colGap: MARK_COL_GAP,
    labelSize: 24,
    rowGap: space.sm,
  },
  large: {
    squareSize: 12,
    squareRadius: 2,
    barGap: 5,
    colGap: 3.5,
    labelSize: 40,
    rowGap: space.md,
  },
} as const;

export type PatternsMarkSize = keyof typeof MARK_SIZE_PRESETS;

export interface PatternsMarkProps {
  size?: PatternsMarkSize;
}

export function getMarkColumnHeight(
  squareCount: number,
  squareSize = MARK_SQUARE_SIZE,
  colGap = MARK_COL_GAP,
): number {
  return squareCount * squareSize + (squareCount - 1) * colGap;
}

export default function PatternsMark({ size = 'default' }: PatternsMarkProps) {
  const preset = MARK_SIZE_PRESETS[size];

  return (
    <View style={[styles.markContainer, { gap: preset.rowGap }]}>
      <View style={[styles.markBars, { gap: preset.barGap }]}>
        {COLUMN_SQUARE_COUNTS.map((count, columnIndex) => (
          <View
            key={columnIndex}
            style={[styles.markCol, { gap: preset.colGap }]}>
            {Array.from({ length: count }).map((_, squareIndex) => (
              <View
                key={squareIndex}
                style={[
                  styles.markSquare,
                  {
                    width: preset.squareSize,
                    height: preset.squareSize,
                    borderRadius: preset.squareRadius,
                  },
                ]}
              />
            ))}
          </View>
        ))}
      </View>
      <Text
        style={[
          styles.markLabel,
          { fontSize: preset.labelSize },
        ]}>
        Patterns
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  markContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  markBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  markCol: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  markSquare: {
    backgroundColor: color.accent,
  },
  markLabel: {
    fontFamily: font.uiSemiBold,
    color: color.text1,
    letterSpacing: -0.3,
  },
});
