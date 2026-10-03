import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  color,
  font,
  fontSize,
  letterSpacing,
  space,
} from '@/theme/theme';

export interface SwipePage {
  key: string;
  title: string;
  content: ReactNode;
}

interface SwipePagerProps {
  pages: SwipePage[];
}

/**
 * Groups related cards into swipeable pages with a tab row on top.
 * - Swipe sideways (touch / trackpad) or tap a tab to change page.
 * - The pager is only as tall as the page being shown, so there is no dead space.
 */
export default function SwipePager({ pages }: SwipePagerProps) {
  const scrollRef = useRef<ScrollView>(null);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  // Page we are animating towards after a tab tap; scroll events are ignored
  // until we arrive so the dots/tabs don't flicker through the pages in between.
  const targetRef = useRef<number | null>(null);
  const targetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heights, setHeights] = useState<Record<string, number>>({});
  // Fixed container height = tallest page seen so far (only ever grows), so
  // switching tabs never changes the layout and nothing below it moves.
  const activeHeight = Object.values(heights).reduce(
    (max, value) => Math.max(max, value),
    0,
  );
  const lastIndex = Math.max(0, pages.length - 1);
  const activeIndex = Math.min(index, lastIndex);

  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    setWidth(Math.round(event.nativeEvent.layout.width));
  }, []);

  // Keep the visible page aligned if the width changes (rotation / resize).
  useEffect(() => {
    if (width > 0) {
      scrollRef.current?.scrollTo({ x: activeIndex * width, animated: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (width <= 0) {
        return;
      }

      const offsetX = event.nativeEvent.contentOffset.x;

      if (targetRef.current !== null) {
        if (Math.abs(offsetX - targetRef.current * width) > 2) {
          return;
        }
        targetRef.current = null;
      }

      const next = Math.round(offsetX / width);
      const clamped = Math.max(0, Math.min(lastIndex, next));

      setIndex((current) => (current === clamped ? current : clamped));
    },
    [lastIndex, width],
  );

  const goTo = useCallback(
    (target: number) => {
      setIndex(target);
      targetRef.current = target;
      if (targetTimer.current) {
        clearTimeout(targetTimer.current);
      }
      // Safety net: never ignore scroll events for more than a moment.
      targetTimer.current = setTimeout(() => {
        targetRef.current = null;
      }, 700);
      scrollRef.current?.scrollTo({ x: target * width, animated: true });
    },
    [width],
  );

  const handlePageLayout = useCallback((key: string, height: number) => {
    const rounded = Math.round(height);

    setHeights((current) =>
      Math.abs((current[key] ?? 0) - rounded) <= 1
        ? current
        : { ...current, [key]: rounded },
    );
  }, []);

  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabScroll}
        contentContainerStyle={styles.tabRow}>
        {pages.map((page, pageIndex) => {
          const isActive = pageIndex === activeIndex;

          return (
            <TouchableOpacity
              key={page.key}
              activeOpacity={0.7}
              onPress={() => goTo(pageIndex)}
              style={[styles.tab, isActive && styles.tabActive]}>
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {page.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View onLayout={handleContainerLayout}>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={handleScroll}
          style={activeHeight ? { height: activeHeight, overflow: 'hidden' } : undefined}
          contentContainerStyle={styles.pagesRow}>
          {pages.map((page) => (
            <View
              key={page.key}
              style={[styles.page, width > 0 && { width }]}
              onLayout={(event) =>
                handlePageLayout(page.key, event.nativeEvent.layout.height)
              }>
              {page.content}
            </View>
          ))}
        </ScrollView>
      </View>

      <View style={styles.dots}>
        {pages.map((page, pageIndex) => (
          <View
            key={page.key}
            style={[styles.dot, pageIndex === activeIndex && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  tabScroll: {
    flexGrow: 0,
    marginBottom: space.md,
  },
  tabRow: {
    flexDirection: 'row',
    gap: space.lg,
    paddingRight: space.lg,
  },
  tab: {
    paddingBottom: space.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: color.accent,
  },
  tabLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    color: color.text3,
  },
  tabLabelActive: {
    color: color.accent,
  },
  pagesRow: {
    alignItems: 'flex-start',
  },
  page: {
    gap: space.cardGap,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: space.sm,
    marginTop: space.md,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: color.border2,
  },
  dotActive: {
    backgroundColor: color.accent,
  },
});
