import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface CounterInputProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  onLog?: (value: number) => void;
  min?: number;
  max?: number;
  unit?: string;
}

const BUTTON_SIZE = 44;
const COUNT_MIN_WIDTH = 64;
const COUNT_HEIGHT = 44;
const BUTTON_LABEL_FONT_SIZE = 22;
const COUNT_FONT_SIZE = 24;
const UNIT_FONT_SIZE = 9;
const UNIT_MARGIN_TOP = 2;
const LOG_BUTTON_HEIGHT = 40;
const DEFAULT_MIN = 0;
const DEFAULT_MAX = 99;
const DISABLED_OPACITY = 0.3;
const LOG_DISABLED_OPACITY = 0.4;
const LOGGED_CONFIRM_MS = 1000;

export default function CounterInput({
  label,
  value,
  onChange,
  onLog,
  min = DEFAULT_MIN,
  max = DEFAULT_MAX,
  unit,
}: CounterInputProps) {
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isAtMin = value <= min;
  const isAtMax = value >= max;
  const isLogDisabled = value === 0;

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const handleDecrement = () => {
    if (isAtMin) {
      return;
    }

    const next = Math.max(min, value - 1);

    if (next === 0) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } else {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onChange(next);
  };

  const handleIncrement = () => {
    if (isAtMax) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(Math.min(max, value + 1));
  };

  const handleLog = () => {
    if (value === 0) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog?.(value);
    onChange(value);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      onChange(min ?? 0);
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    return `LOG · ${value} ${unit ?? 'TIMES'}`;
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>

      <View style={styles.counterRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={isAtMin}
          onPress={handleDecrement}
          style={[styles.button, isAtMin && styles.buttonDisabled]}>
          <Text style={styles.minusLabel}>−</Text>
        </TouchableOpacity>

        <View style={styles.countDisplay}>
          <Text style={styles.countValue}>{value}</Text>
          {unit ? <Text style={styles.unitLabel}>{unit}</Text> : null}
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          disabled={isAtMax}
          onPress={handleIncrement}
          style={[styles.button, isAtMax && styles.buttonDisabled]}>
          <Text
            style={[
              styles.plusLabel,
              value > 0 ? styles.plusLabelActive : styles.plusLabelDefault,
            ]}>
            +
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={isLogDisabled}
        onPress={handleLog}
        style={[styles.logButton, isLogDisabled && styles.logButtonDisabled]}>
        <Text style={styles.logButtonLabel}>{getLogLabel()}</Text>
      </TouchableOpacity>
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
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    alignSelf: 'flex-start',
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: DISABLED_OPACITY,
  },
  minusLabel: {
    fontFamily: font.mono,
    fontSize: BUTTON_LABEL_FONT_SIZE,
    color: color.text3,
    includeFontPadding: false,
  },
  countDisplay: {
    minWidth: COUNT_MIN_WIDTH,
    height: COUNT_HEIGHT,
    backgroundColor: color.surface3,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  countValue: {
    fontFamily: font.mono,
    fontSize: COUNT_FONT_SIZE,
    color: color.text1,
    fontWeight: fontWeight.semibold,
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  unitLabel: {
    fontFamily: font.mono,
    fontSize: UNIT_FONT_SIZE,
    color: color.text3,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    textAlign: 'center',
    marginTop: UNIT_MARGIN_TOP,
  },
  plusLabel: {
    fontFamily: font.mono,
    fontSize: BUTTON_LABEL_FONT_SIZE,
    includeFontPadding: false,
  },
  plusLabelActive: {
    color: color.accent,
  },
  plusLabelDefault: {
    color: color.text3,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    marginTop: space.md,
    backgroundColor: color.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonDisabled: {
    opacity: LOG_DISABLED_OPACITY,
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
});
