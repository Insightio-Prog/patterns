import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import TimeBlockPicker from '@/components/TimeBlockPicker';
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

export interface MultiSelectChipsProps {
  label: string;
  options: string[];
  onLog: (selected: string[]) => void;
  showTimePicker?: boolean;
}

const CHIP_PADDING_H = 10;
const CHIP_PADDING_V = 6;
const CHIP_LABEL_LETTER_SPACING = 0.8;
const SELECTED_BG_OPACITY = 0.12;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;

export default function MultiSelectChips({
  label,
  options,
  onLog,
  showTimePicker,
}: MultiSelectChipsProps) {
  const [selected, setSelected] = useState<string[]>([]);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

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
    if (selected.length === 0) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(selected);
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

    return `LOG · ${selected.length} SELECTED`;
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
                  backgroundColor: colorWithOpacity(color.accent, SELECTED_BG_OPACITY),
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

      {showTimePicker && selected.length > 0 ? (
        <TimeBlockPicker context="Logged at" onChange={() => {}} />
      ) : null}

      {selected.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLog}
          style={styles.logButton}>
          <Text style={styles.logButtonLabel}>{getLogLabel()}</Text>
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
