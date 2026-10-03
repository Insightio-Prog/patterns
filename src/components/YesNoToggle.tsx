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

export interface YesNoToggleProps {
  label: string;
  value: boolean | null;
  onChange: (value: boolean) => void;
  showTimePicker?: boolean;
  onTimeChange?: (time: string) => void;
}

const SEGMENT_HEIGHT = 30;
const CONFIRM_TICK_FONT_SIZE = 14;
const LOGGED_CONFIRM_MS = 1000;

export default function YesNoToggle({
  label,
  value,
  onChange,
  showTimePicker,
  onTimeChange,
}: YesNoToggleProps) {
  const [loggedTime, setLoggedTime] = useState<string | null>(null);
  const [confirmedValue, setConfirmedValue] = useState<'yes' | 'no' | null>(null);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleSelect = (nextValue: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(nextValue);
    setConfirmedValue(nextValue ? 'yes' : 'no');

    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }

    confirmTimeoutRef.current = setTimeout(() => {
      setConfirmedValue(null);
      confirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const isYesConfirmed = confirmedValue === 'yes';
  const isNoConfirmed = confirmedValue === 'no';

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>
      <View style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelect(true)}
          style={[
            styles.segment,
            (value === true || isYesConfirmed) && styles.segmentActive,
          ]}>
          {isYesConfirmed ? (
            <Text style={styles.confirmTick}>✓</Text>
          ) : (
            <Text
              style={[
                styles.segmentLabel,
                value === true && styles.segmentLabelActive,
              ]}>
              YES
            </Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelect(false)}
          style={[
            styles.segment,
            (value === false || isNoConfirmed) && styles.segmentActive,
          ]}>
          {isNoConfirmed ? (
            <Text style={styles.confirmTick}>✓</Text>
          ) : (
            <Text
              style={[
                styles.segmentLabel,
                value === false && styles.segmentLabelActive,
              ]}>
              NO
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {confirmedValue ? (
        <Text style={styles.confirmedLabel}>
          {confirmedValue === 'yes' ? 'YES LOGGED' : 'NO LOGGED'}
        </Text>
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
    borderRadius: radius.md,
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
  confirmTick: {
    fontFamily: font.mono,
    fontSize: CONFIRM_TICK_FONT_SIZE,
    color: color.accentInk,
  },
  confirmedLabel: {
    marginTop: space.xs,
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
  },
  divider: {
    width: 1,
    backgroundColor: color.border,
    alignSelf: 'stretch',
  },
});
