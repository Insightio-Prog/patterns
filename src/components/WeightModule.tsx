import * as Haptics from 'expo-haptics';
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  LayoutChangeEvent,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface WeightEntry {
  id: string;
  timestamp: string;
  value: number;
  unit: 'kg' | 'lbs';
}

export interface WeightModuleProps {
  label: string;
  entries: WeightEntry[];
  onLog: (value: number, unit: 'kg' | 'lbs') => void;
}

type WeightUnit = 'kg' | 'lbs';

const BUTTON_SIZE = 44;
const VALUE_MIN_WIDTH = 88;
const VALUE_HEIGHT = 44;
const BUTTON_LABEL_FONT_SIZE = 22;
const SEGMENT_HEIGHT = 30;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;
const STEP = 0.1;
const CHART_HEIGHT = 48;
const DOT_SIZE = 6;
const KG_TO_LBS = 2.205;

const UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'KG' },
  { value: 'lbs', label: 'LBS' },
];

function round1dp(value: number): number {
  return Math.round(value * 10) / 10;
}

function convertWeight(
  value: number,
  from: WeightUnit,
  to: WeightUnit,
): number {
  if (from === to) {
    return round1dp(value);
  }

  if (from === 'kg') {
    return round1dp(value * KG_TO_LBS);
  }

  return round1dp(value / KG_TO_LBS);
}

function formatWeight(value: number): string {
  return value.toFixed(1);
}

function parseEntries(entries: WeightEntry[]): WeightEntry[] {
  try {
    if (!Array.isArray(entries)) {
      return [];
    }

    return entries
      .filter(
        (entry): entry is WeightEntry =>
          typeof entry === 'object' &&
          entry !== null &&
          typeof entry.id === 'string' &&
          typeof entry.timestamp === 'string' &&
          typeof entry.value === 'number' &&
          !Number.isNaN(entry.value) &&
          (entry.unit === 'kg' || entry.unit === 'lbs'),
      )
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );
  } catch {
    return [];
  }
}

interface TrendChartProps {
  entries: WeightEntry[];
  displayUnit: WeightUnit;
}

function TrendChart({ entries, displayUnit }: TrendChartProps) {
  const [chartWidth, setChartWidth] = useState(0);

  const chartPoints = useMemo(() => {
    const valid = parseEntries(entries).slice(-7);

    return valid.map((entry) => ({
      id: entry.id,
      value: convertWeight(entry.value, entry.unit, displayUnit),
    }));
  }, [displayUnit, entries]);

  if (chartPoints.length < 2) {
    return null;
  }

  const values = chartPoints.map((point) => point.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const latest = chartPoints[chartPoints.length - 1].value;
  const range = max - min || 1;

  const getDotBottom = (value: number) => {
    const ratio = (value - min) / range;
    return ratio * (CHART_HEIGHT - DOT_SIZE);
  };

  const getDotCenter = (index: number, value: number) => {
    const columnWidth = chartWidth / chartPoints.length;
    const x = columnWidth * index + columnWidth / 2;
    const y = CHART_HEIGHT - DOT_SIZE / 2 - getDotBottom(value);
    return { x, y };
  };

  const handleLayout = (event: LayoutChangeEvent) => {
    setChartWidth(event.nativeEvent.layout.width);
  };

  return (
    <View style={styles.trendContainer}>
      <View style={styles.chartArea} onLayout={handleLayout}>
        {chartWidth > 0
          ? chartPoints.slice(1).map((point, index) => {
              const prev = chartPoints[index];
              const start = getDotCenter(index, prev.value);
              const end = getDotCenter(index + 1, point.value);
              const dx = end.x - start.x;
              const dy = end.y - start.y;
              const length = Math.sqrt(dx * dx + dy * dy);
              const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
              const centerX = (start.x + end.x) / 2;
              const centerY = (start.y + end.y) / 2;

              return (
                <View
                  key={`${prev.id}-${point.id}`}
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
            })
          : null}

        <View style={styles.chartRow}>
          {chartPoints.map((point, index) => (
            <View key={point.id} style={styles.chartColumn}>
              <View
                style={[
                  styles.dot,
                  { bottom: getDotBottom(point.value) },
                  index === chartPoints.length - 1 && styles.dotLatest,
                ]}
              />
            </View>
          ))}
        </View>
      </View>

      <View style={styles.chartLabels}>
        <Text style={styles.chartMinMax}>
          {formatWeight(min)}
          {displayUnit.toUpperCase()}
        </Text>
        <Text style={styles.chartLatest}>
          {formatWeight(latest)}
          {displayUnit.toUpperCase()}
        </Text>
        <Text style={[styles.chartMinMax, styles.chartMaxLabel]}>
          {formatWeight(max)}
          {displayUnit.toUpperCase()}
        </Text>
      </View>
    </View>
  );
}

function parseInputValue(text: string): number | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Number(trimmed);

  if (Number.isNaN(parsed) || parsed < 0) {
    return null;
  }

  return round1dp(parsed);
}

export default function WeightModule({
  label,
  entries,
  onLog,
}: WeightModuleProps) {
  const [value, setValue] = useState(0);
  const [unit, setUnit] = useState<WeightUnit>('kg');
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  const validEntries = useMemo(() => parseEntries(entries), [entries]);
  const showTrend = validEntries.length >= 2;

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const commitEdit = (): number => {
    if (!isEditing) {
      return value;
    }

    const parsed = parseInputValue(editText);

    if (parsed !== null) {
      setValue(parsed);
      setIsEditing(false);
      Keyboard.dismiss();
      return parsed;
    }

    setIsEditing(false);
    Keyboard.dismiss();
    return value;
  };

  const syncEditText = (nextValue: number) => {
    if (isEditing) {
      setEditText(formatWeight(nextValue));
    }
  };

  const dismissKeyboard = () => {
    if (isEditing) {
      commitEdit();
      return;
    }

    Keyboard.dismiss();
  };

  const handleStartEdit = () => {
    setEditText(value === 0 ? '' : formatWeight(value));
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleInputBlur = () => {
    commitEdit();
  };

  const handleDecrement = () => {
    if (value <= 0) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((current) => {
      const next = round1dp(Math.max(0, current - STEP));
      syncEditText(next);
      return next;
    });
  };

  const handleIncrement = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((current) => {
      const next = round1dp(current + STEP);
      syncEditText(next);
      return next;
    });
  };

  const handleUnitSelect = (nextUnit: WeightUnit) => {
    if (nextUnit === unit) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setValue((current) => convertWeight(current, unit, nextUnit));
    setUnit(nextUnit);
  };

  const handleLog = () => {
    const logValue = commitEdit();

    if (logValue <= 0 || loggedConfirm) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(logValue, unit);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      setValue(0);
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    const unitLabel = unit === 'kg' ? 'KG' : 'LBS';
    return `LOG · ${formatWeight(value)}${unitLabel}`;
  };

  return (
    <TouchableWithoutFeedback onPress={dismissKeyboard} accessible={false}>
      <View>
        <Text style={styles.sectionLabel}>{label}</Text>

        <View style={styles.inputRow}>
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={value <= 0}
            onPress={handleDecrement}
            style={[styles.stepButton, value <= 0 && styles.stepButtonDisabled]}>
            <Text style={styles.stepLabel}>−</Text>
          </TouchableOpacity>

          <View
            style={[
              styles.valueDisplay,
              isEditing && styles.valueDisplayActive,
            ]}>
            <TextInput
              ref={inputRef}
              style={styles.valueText}
              value={isEditing ? editText : formatWeight(value)}
              onChangeText={setEditText}
              onBlur={handleInputBlur}
              keyboardType="decimal-pad"
              placeholder="0.0"
              placeholderTextColor={color.text3}
              selectTextOnFocus
              pointerEvents={isEditing ? 'auto' : 'none'}
              caretHidden={!isEditing}
            />
            {!isEditing ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={handleStartEdit}
                style={styles.valueOverlay}>
                <Text style={styles.valueText}>{formatWeight(value)}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleIncrement}
            style={styles.stepButton}>
            <Text style={styles.stepLabel}>+</Text>
          </TouchableOpacity>
        </View>

      <View style={styles.unitContainer}>
        {UNITS.map((unitOption, index) => (
          <Fragment key={unitOption.value}>
            {index > 0 ? <View style={styles.unitDivider} /> : null}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleUnitSelect(unitOption.value)}
              style={[
                styles.unitSegment,
                unit === unitOption.value && styles.unitSegmentActive,
              ]}>
              <Text
                style={[
                  styles.unitSegmentLabel,
                  unit === unitOption.value && styles.unitSegmentLabelActive,
                ]}>
                {unitOption.label}
              </Text>
            </TouchableOpacity>
          </Fragment>
        ))}
      </View>

      {showTrend ? (
        <TrendChart entries={validEntries} displayUnit={unit} />
      ) : null}

      {value > 0 ? (
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
    </TouchableWithoutFeedback>
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
  },
  stepButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepButtonDisabled: {
    opacity: 0.3,
  },
  stepLabel: {
    fontFamily: font.mono,
    fontSize: BUTTON_LABEL_FONT_SIZE,
    color: color.accent,
    includeFontPadding: false,
  },
  valueDisplay: {
    minWidth: VALUE_MIN_WIDTH,
    height: VALUE_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    position: 'relative',
  },
  valueOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueDisplayActive: {
    borderColor: color.accent,
  },
  valueText: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text1,
    fontWeight: fontWeight.semibold,
    textAlign: 'center',
    minWidth: VALUE_MIN_WIDTH - space.lg * 2,
    padding: 0,
  },
  unitContainer: {
    flexDirection: 'row',
    alignSelf: 'center',
    marginTop: space.sm,
    backgroundColor: color.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  unitSegment: {
    paddingHorizontal: space.lg,
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitSegmentActive: {
    backgroundColor: color.accent,
    borderWidth: 1,
    borderColor: color.accent,
  },
  unitSegmentLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
  },
  unitSegmentLabelActive: {
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
  },
  unitDivider: {
    width: 1,
    backgroundColor: color.border,
    alignSelf: 'stretch',
  },
  trendContainer: {
    marginTop: space.md,
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
  chartLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  chartMinMax: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'left',
  },
  chartMaxLabel: {
    textAlign: 'right',
  },
  chartLatest: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textTransform: 'uppercase',
    textAlign: 'center',
    flex: 1,
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
