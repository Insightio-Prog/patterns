import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { generateId } from '@/utils/generateId';
import { colorWithOpacity } from '@/utils/colorWithOpacity';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export type PollenLevel =
  | 'none'
  | 'low'
  | 'moderate'
  | 'high'
  | 'very_high';

export interface PollenSnapshot {
  tree: PollenLevel;
  grass: PollenLevel;
  weed: PollenLevel;
  dominantPollen: string;
}

export interface EnvironmentEntry {
  id: string;
  timestamp: string;
  factors: string[];
  pollenSnapshot?: PollenSnapshot;
}

export interface EnvironmentModuleProps {
  label: string;
  options: string[];
  enablePollenTracking?: boolean;
  onLog: (entry: EnvironmentEntry) => void;
  recentEntries?: EnvironmentEntry[];
}

export interface PollenChartDay {
  day: string;
  tree: number;
  grass: number;
  weed: number;
  isToday: boolean;
}

const CHIP_PADDING_H = 10;
const CHIP_PADDING_V = 6;
const CHIP_LABEL_LETTER_SPACING = 0.8;
const SELECTED_BG_OPACITY = 0.12;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;
const POLLEN_API_URL = 'https://api.insightio.co.uk';
const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const POLLEN_LEVEL_VALUES: Record<PollenLevel, number> = {
  none: 0,
  low: 1,
  moderate: 2,
  high: 3,
  very_high: 4,
};

type PollenLoadState =
  | 'idle'
  | 'loading'
  | 'success'
  | 'unavailable'
  | 'permission_denied';

export function formatPollenLevel(level: PollenLevel): string {
  return level.replace('_', ' ').toUpperCase();
}

function normalizePollenLevel(value: unknown): PollenLevel {
  if (typeof value !== 'string') {
    return 'none';
  }

  const normalized = value.trim().toLowerCase().replace(/\s+/g, '_');

  if (normalized === 'veryhigh') {
    return 'very_high';
  }

  if (
    normalized === 'none' ||
    normalized === 'low' ||
    normalized === 'moderate' ||
    normalized === 'high' ||
    normalized === 'very_high'
  ) {
    return normalized;
  }

  return 'none';
}

function parsePollenSnapshot(data: unknown): PollenSnapshot | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  const record = data as Record<string, unknown>;
  const pollen =
    record.pollenSnapshot ??
    record.pollen ??
    record.body ??
    record.data ??
    record;

  if (!pollen || typeof pollen !== 'object') {
    return null;
  }

  const pollenRecord = pollen as Record<string, unknown>;

  return {
    tree: normalizePollenLevel(pollenRecord.tree),
    grass: normalizePollenLevel(pollenRecord.grass),
    weed: normalizePollenLevel(pollenRecord.weed),
    dominantPollen:
      typeof pollenRecord.dominantPollen === 'string'
        ? pollenRecord.dominantPollen
        : typeof pollenRecord.dominant === 'string'
          ? pollenRecord.dominant
          : 'Unknown',
  };
}

export async function fetchPollenSnapshot(
  lat: number,
  lng: number,
  signal?: AbortSignal,
): Promise<PollenSnapshot | null> {
  try {
    const response = await fetch(POLLEN_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target: 'pollen',
        body: { location: { lat, lng } },
      }),
      signal,
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as unknown;
    return parsePollenSnapshot(data);
  } catch {
    return null;
  }
}

function getLevelPillColors(level: PollenLevel) {
  if (level === 'none' || level === 'low') {
    return {
      backgroundColor: colorWithOpacity(color.success, 0.15),
      borderColor: color.success,
      textColor: color.success,
    };
  }

  if (level === 'moderate') {
    return {
      backgroundColor: colorWithOpacity(color.warn, 0.15),
      borderColor: color.warn,
      textColor: color.warn,
    };
  }

  return {
    backgroundColor: colorWithOpacity(color.danger, 0.15),
    borderColor: color.danger,
    textColor: color.danger,
  };
}

export function getPollenChartData(
  entries: EnvironmentEntry[],
): PollenChartDay[] {
  try {
    if (!Array.isArray(entries)) {
      return [];
    }

    const now = new Date();
    const chartDays: PollenChartDay[] = [];

    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date(now);
      date.setDate(now.getDate() - offset);
      date.setHours(0, 0, 0, 0);

      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const dayEntries = entries
        .filter((entry) => {
          if (!entry?.pollenSnapshot || !entry.timestamp) {
            return false;
          }

          const timestamp = new Date(entry.timestamp).getTime();

          if (Number.isNaN(timestamp)) {
            return false;
          }

          return timestamp >= date.getTime() && timestamp <= dayEnd.getTime();
        })
        .sort(
          (a, b) =>
            new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );

      const latest = dayEntries[dayEntries.length - 1];
      const snapshot = latest?.pollenSnapshot;

      chartDays.push({
        day: DAY_LABELS[date.getDay()],
        tree: snapshot ? POLLEN_LEVEL_VALUES[snapshot.tree] : 0,
        grass: snapshot ? POLLEN_LEVEL_VALUES[snapshot.grass] : 0,
        weed: snapshot ? POLLEN_LEVEL_VALUES[snapshot.weed] : 0,
        isToday: offset === 0,
      });
    }

    return chartDays;
  } catch {
    return [];
  }
}

function PulsingDots() {
  const dotOne = useRef(new Animated.Value(0.3)).current;
  const dotTwo = useRef(new Animated.Value(0.3)).current;
  const dotThree = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const createPulse = (value: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 350,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.3,
            duration: 350,
            useNativeDriver: true,
          }),
        ]),
      );

    const animation = Animated.parallel([
      createPulse(dotOne, 0),
      createPulse(dotTwo, 120),
      createPulse(dotThree, 240),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [dotOne, dotTwo, dotThree]);

  return (
    <View style={styles.loadingDots}>
      <Animated.Text style={[styles.loadingDot, { opacity: dotOne }]}>
        ·
      </Animated.Text>
      <Animated.Text style={[styles.loadingDot, { opacity: dotTwo }]}>
        ·
      </Animated.Text>
      <Animated.Text style={[styles.loadingDot, { opacity: dotThree }]}>
        ·
      </Animated.Text>
    </View>
  );
}

interface PollenRowProps {
  label: string;
  level: PollenLevel;
}

function PollenRow({ label, level }: PollenRowProps) {
  const pillColors = getLevelPillColors(level);

  return (
    <View style={styles.pollenRow}>
      <Text style={styles.pollenRowLabel}>{label}</Text>
      <View
        style={[
          styles.levelPill,
          {
            backgroundColor: pillColors.backgroundColor,
            borderColor: pillColors.borderColor,
          },
        ]}>
        <Text style={[styles.levelPillLabel, { color: pillColors.textColor }]}>
          {formatPollenLevel(level)}
        </Text>
      </View>
    </View>
  );
}

export default function EnvironmentModule({
  label,
  options,
  enablePollenTracking = false,
  onLog,
}: EnvironmentModuleProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const [pollenLoadState, setPollenLoadState] =
    useState<PollenLoadState>('idle');
  const [pollenSnapshot, setPollenSnapshot] = useState<PollenSnapshot | null>(
    null,
  );
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const fetchAbortRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;

      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }

      if (fetchAbortRef.current) {
        fetchAbortRef.current.abort();
        fetchAbortRef.current = null;
      }
    };
  }, []);

  const loadPollen = async () => {
    if (!enablePollenTracking) {
      return;
    }

    if (fetchAbortRef.current) {
      fetchAbortRef.current.abort();
    }

    const controller = new AbortController();
    fetchAbortRef.current = controller;

    setPollenLoadState('loading');
    setPollenSnapshot(null);

    try {
      const permission = await Location.requestForegroundPermissionsAsync();

      if (!isMountedRef.current) {
        return;
      }

      if (permission.status !== 'granted') {
        setPollenLoadState('permission_denied');
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }

      const snapshot = await fetchPollenSnapshot(
        position.coords.latitude,
        position.coords.longitude,
        controller.signal,
      );

      if (!isMountedRef.current || controller.signal.aborted) {
        return;
      }

      if (!snapshot) {
        setPollenLoadState('unavailable');
        return;
      }

      setPollenSnapshot(snapshot);
      setPollenLoadState('success');
    } catch {
      if (isMountedRef.current && !controller.signal.aborted) {
        setPollenLoadState('unavailable');
      }
    } finally {
      if (fetchAbortRef.current === controller) {
        fetchAbortRef.current = null;
      }
    }
  };

  useEffect(() => {
    if (!enablePollenTracking) {
      return;
    }

    void loadPollen();
  }, [enablePollenTracking]);

  const toggleOption = (option: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelected((current) => {
      if (current.includes(option)) {
        return current.filter((item) => item !== option);
      }

      return [...current, option];
    });
  };

  const handleLog = () => {
    if (selected.length === 0 || loggedConfirm) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const entry: EnvironmentEntry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      factors: selected,
      pollenSnapshot:
        enablePollenTracking && pollenSnapshot ? pollenSnapshot : undefined,
    };

    onLog(entry);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      setSelected([]);
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    return `LOG · ${selected.length} FACTORS`;
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>

      <View style={styles.chipRow}>
        {options.map((option) => {
          const isSelected = selected.includes(option);

          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.7}
              onPress={() => toggleOption(option)}
              style={[
                styles.chip,
                isSelected && styles.chipSelected,
                isSelected && {
                  backgroundColor: colorWithOpacity(
                    color.accent,
                    SELECTED_BG_OPACITY,
                  ),
                  borderColor: color.accent,
                },
              ]}>
              <Text
                style={[
                  styles.chipLabel,
                  isSelected && styles.chipLabelSelected,
                ]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {enablePollenTracking ? (
        <View style={styles.pollenCard}>
          <View style={styles.pollenCardHeader}>
            <Text style={styles.pollenCardTitle}>POLLEN · NOW</Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                void loadPollen();
              }}
              hitSlop={space.sm}
              style={styles.refreshButton}>
              <Text style={styles.refreshLabel}>↻</Text>
            </TouchableOpacity>
          </View>

          {pollenLoadState === 'loading' ? <PulsingDots /> : null}

          {pollenLoadState === 'permission_denied' ? (
            <Text style={styles.pollenNotice}>
              Location needed for pollen data
            </Text>
          ) : null}

          {pollenLoadState === 'unavailable' ? (
            <Text style={styles.pollenNotice}>Pollen data unavailable</Text>
          ) : null}

          {pollenLoadState === 'success' && pollenSnapshot ? (
            <View>
              <PollenRow label="TREE" level={pollenSnapshot.tree} />
              <PollenRow label="GRASS" level={pollenSnapshot.grass} />
              <PollenRow label="WEED" level={pollenSnapshot.weed} />
              <Text style={styles.dominantPollen}>
                DOMINANT · {pollenSnapshot.dominantPollen.toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {selected.length > 0 || loggedConfirm ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLog}
          disabled={loggedConfirm}
          style={[
            styles.logButton,
            loggedConfirm ? styles.logButtonInactive : styles.logButtonActive,
          ]}>
          <Text
            style={[
              styles.logButtonLabel,
              loggedConfirm
                ? styles.logButtonLabelInactive
                : styles.logButtonLabelActive,
            ]}>
            {getLogLabel()}
          </Text>
        </TouchableOpacity>
      ) : null}
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
    marginBottom: space.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  chip: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: CHIP_PADDING_H,
    paddingVertical: CHIP_PADDING_V,
  },
  chipSelected: {
    borderColor: color.accent,
  },
  chipLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    textTransform: 'uppercase',
    letterSpacing: CHIP_LABEL_LETTER_SPACING,
  },
  chipLabelSelected: {
    color: color.accent,
  },
  pollenCard: {
    marginTop: space.md,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.md,
  },
  pollenCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.sm,
  },
  pollenCardTitle: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  refreshButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  loadingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingVertical: space.sm,
  },
  loadingDot: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text3,
    lineHeight: fontSize.headline,
  },
  pollenNotice: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
    paddingVertical: space.xs,
  },
  pollenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.xs,
  },
  pollenRowLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    textTransform: 'uppercase',
    letterSpacing: CHIP_LABEL_LETTER_SPACING,
  },
  levelPill: {
    borderWidth: 1,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  levelPillLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    fontWeight: fontWeight.semibold,
  },
  dominantPollen: {
    marginTop: space.sm,
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    marginTop: space.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonActive: {
    backgroundColor: color.accent,
  },
  logButtonInactive: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
  logButtonLabelActive: {
    color: color.accentInk,
  },
  logButtonLabelInactive: {
    color: color.text3,
  },
});
