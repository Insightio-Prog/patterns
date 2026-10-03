import * as Haptics from 'expo-haptics';
import { Fragment, useEffect, useRef, useState } from 'react';
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

export type Level = 'low' | 'normal' | 'high';

export interface LevelSelectorProps {
  label: string;
  value: Level | null;
  onChange: (value: Level | null) => void;
  onLog?: (value: Level) => void;
  showTimePicker?: boolean;
  onTimeChange?: (time: string) => void;
}

const SEGMENT_HEIGHT = 30;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;

const LEVELS: { value: Level; label: string }[] = [
  { value: 'low', label: 'LOW' },
  { value: 'normal', label: 'NORMAL' },
  { value: 'high', label: 'HIGH' },
];

export default function LevelSelector({
  label,
  value,
  onChange,
  onLog,
  showTimePicker,
  onTimeChange,
}: LevelSelectorProps) {
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

  const handleSelect = (nextValue: Level) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(nextValue);
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

    const levelLabel = LEVELS.find((level) => level.value === value)?.label ?? value;
    return `LOG · ${levelLabel}`;
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.container}>
        {LEVELS.map((level, index) => (
          <Fragment key={level.value}>
            {index > 0 ? <View style={styles.divider} /> : null}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleSelect(level.value)}
              style={[
                styles.segment,
                value === level.value && styles.segmentActive,
              ]}>
              <Text
                style={[
                  styles.segmentLabel,
                  value === level.value && styles.segmentLabelActive,
                ]}>
                {level.label}
              </Text>
            </TouchableOpacity>
          </Fragment>
        ))}
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
  sectionLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    marginBottom: space.sm,
  },
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    backgroundColor: color.surface2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
    alignItems: 'stretch',
  },
  segment: {
    paddingHorizontal: space.lg,
    height: SEGMENT_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: color.accent,
    borderWidth: 1,
    borderColor: color.accent,
  },
  segmentLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
  },
  segmentLabelActive: {
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
  },
  divider: {
    width: 1,
    backgroundColor: color.border,
    alignSelf: 'stretch',
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
