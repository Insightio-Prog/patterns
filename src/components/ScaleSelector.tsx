import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import TimeBlockPicker from '@/components/TimeBlockPicker';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface ScaleSelectorProps {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onLog?: (value: number) => void;
  showTimePicker?: boolean;
  onTimeChange?: (time: string) => void;
}

const SCALE_VALUES = [1, 2, 3, 4, 5] as const;
const CELL_SIZE = 30;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;

export default function ScaleSelector({
  label,
  value,
  onChange,
  onLog,
  showTimePicker,
  onTimeChange,
}: ScaleSelectorProps) {
  const [loggedTime, setLoggedTime] = useState<string | null>(null);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (scaleValue: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(scaleValue);
  };

  const handleLog = () => {
    if (value === null || !onLog) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(value);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      onChange(null);
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    return `LOG · ${value}`;
  };

  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        {SCALE_VALUES.map((scaleValue, index) => {
          const isSelected = value === scaleValue;
          const isLast = index === SCALE_VALUES.length - 1;

          return (
            <TouchableOpacity
              key={scaleValue}
              activeOpacity={0.7}
              onPress={() => handleSelect(scaleValue)}
              style={[
                styles.cell,
                !isLast && styles.cellOverlap,
                isSelected && styles.cellSelected,
                isSelected && styles.cellSelectedElevation,
              ]}>
              <Text
                style={[styles.numeral, isSelected && styles.numeralSelected]}>
                {scaleValue}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {value !== null && onLog ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLog}
          style={styles.logButton}>
          <Text style={styles.logButtonLabel}>{getLogLabel()}</Text>
        </TouchableOpacity>
      ) : null}
      {showTimePicker && (
        <TimeBlockPicker
          context="Logged at"
          onChange={(time) => {
            setLoggedTime(time);
            onTimeChange?.(time);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    borderRadius: radius.sm,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellOverlap: {
    marginRight: -1,
  },
  cellSelected: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  cellSelectedElevation: {
    zIndex: 1,
  },
  numeral: {
    fontFamily: font.mono,
    fontSize: fontSize.secondary,
    color: color.text3,
  },
  numeralSelected: {
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    marginTop: space.md,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.accent,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
});
