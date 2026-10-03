import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getMarkColumnHeight,
  MARK_BAR_GAP,
  MARK_COL_GAP,
  MARK_SQUARE_RADIUS,
  MARK_SQUARE_SIZE,
} from '@/components/PatternsMark';
import {
  color,
  font,
  fontSize,
  letterSpacing,
  space,
} from '@/theme/theme';

// Minimum time the splash stays up so the animation never flashes past.
const MIN_DURATION_MS = 4000;
const STATUS_CYCLE_MS = 2500;
const STATUS_FADE_MS = 300;
const COLUMN_GROW_MS = 500;
const COLUMN_STAGGER_MS = 200;
const FULL_PAUSE_MS = 800;
const SHRINK_MS = 400;
const EMPTY_PAUSE_MS = 400;

const COLUMN_SQUARE_COUNTS = [1, 2, 3, 4] as const;

const STATUS_LINES = [
  'Analysing your tracking goal...',
  'Selecting modules...',
  'Configuring your tracker...',
  'Almost ready...',
] as const;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function AnimatedPatternsMark() {
  const columnHeights = useRef(
    COLUMN_SQUARE_COUNTS.map(() => new Animated.Value(0)),
  ).current;

  useEffect(() => {
    let cancelled = false;

    const growColumns = () =>
      new Promise<void>((resolve) => {
        columnHeights.forEach((height) => height.setValue(0));

        Animated.stagger(
          COLUMN_STAGGER_MS,
          COLUMN_SQUARE_COUNTS.map((count, index) =>
            Animated.timing(columnHeights[index], {
              toValue: getMarkColumnHeight(count),
              duration: COLUMN_GROW_MS,
              easing: Easing.out(Easing.cubic),
              useNativeDriver: false,
            }),
          ),
        ).start(({ finished }) => {
          if (finished) {
            resolve();
          }
        });
      });

    const shrinkColumns = () =>
      new Promise<void>((resolve) => {
        Animated.parallel(
          columnHeights.map((height) =>
            Animated.timing(height, {
              toValue: 0,
              duration: SHRINK_MS,
              easing: Easing.in(Easing.cubic),
              useNativeDriver: false,
            }),
          ),
        ).start(({ finished }) => {
          if (finished) {
            resolve();
          }
        });
      });

    const runCycle = async () => {
      while (!cancelled) {
        await growColumns();
        if (cancelled) {
          break;
        }

        await delay(FULL_PAUSE_MS);
        if (cancelled) {
          break;
        }

        await shrinkColumns();
        if (cancelled) {
          break;
        }

        await delay(EMPTY_PAUSE_MS);
      }
    };

    void runCycle();

    return () => {
      cancelled = true;
      columnHeights.forEach((height) => height.stopAnimation());
    };
  }, [columnHeights]);

  return (
    <View style={styles.markContainer}>
      <View style={styles.markBars}>
        {COLUMN_SQUARE_COUNTS.map((count, columnIndex) => (
          <Animated.View
            key={columnIndex}
            style={[
              styles.markColClip,
              { height: columnHeights[columnIndex] },
            ]}>
            <View style={styles.markColInner}>
              {Array.from({ length: count }).map((_, squareIndex) => (
                <View key={squareIndex} style={styles.markSquare} />
              ))}
            </View>
          </Animated.View>
        ))}
      </View>
      <Text style={styles.markLabel}>Patterns</Text>
    </View>
  );
}

export default function BuildingScreen({ ready = true }: { ready?: boolean }) {
  const [lineIndex, setLineIndex] = useState(0);
  const [minElapsed, setMinElapsed] = useState(false);
  const statusOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const timeout = setTimeout(() => setMinElapsed(true), MIN_DURATION_MS);

    return () => clearTimeout(timeout);
  }, []);

  // Leave as soon as the tracker is actually ready (and the animation has had a moment).
  useEffect(() => {
    if (ready && minElapsed) {
      router.replace('/(tabs)/home');
    }
  }, [ready, minElapsed]);

  useEffect(() => {
    const interval = setInterval(() => {
      setLineIndex((current) => Math.min(current + 1, STATUS_LINES.length - 1));
    }, STATUS_CYCLE_MS);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    statusOpacity.setValue(0.3);
    Animated.timing(statusOpacity, {
      toValue: 1,
      duration: STATUS_FADE_MS,
      useNativeDriver: true,
    }).start();
  }, [lineIndex, statusOpacity]);

  return (
    <View style={styles.screen}>
      <AnimatedPatternsMark />
      <Text style={styles.buildingTitle}>BUILDING YOUR TRACKER</Text>
      <Animated.Text style={[styles.statusLine, { opacity: statusOpacity }]}>
        {STATUS_LINES[lineIndex]}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  markContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  markBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: MARK_BAR_GAP,
  },
  markColClip: {
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  markColInner: {
    flexDirection: 'column',
    justifyContent: 'flex-end',
    gap: MARK_COL_GAP,
  },
  markSquare: {
    width: MARK_SQUARE_SIZE,
    height: MARK_SQUARE_SIZE,
    backgroundColor: color.accent,
    borderRadius: MARK_SQUARE_RADIUS,
  },
  markLabel: {
    fontFamily: font.uiSemiBold,
    fontSize: 24,
    color: color.text1,
    letterSpacing: -0.3,
  },
  buildingTitle: {
    marginTop: space.xxl,
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  statusLine: {
    marginTop: space.md,
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text3,
    textAlign: 'center',
  },
});
