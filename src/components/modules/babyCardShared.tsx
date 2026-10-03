import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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

export const LOG_BUTTON_HEIGHT = 44;
export const LOGGED_CONFIRM_MS = 1000;
export const CHIP_RADIUS = 10;
export const CHIP_LABEL_LETTER_SPACING = 0.8;
export const REMOVE_BUTTON_SIZE = 32;
export const ADD_BUTTON_MIN_WIDTH = 64;

export function getCurrentTimeHHMM(): string {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

export function parseTimeToMinutes(time: string): number | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return hours * 60 + minutes;
}

export function calculateDurationMinutes(start: string, end: string): number {
  const startMinutes = parseTimeToMinutes(start) ?? 0;
  let endMinutes = parseTimeToMinutes(end) ?? 0;

  if (endMinutes <= startMinutes) {
    endMinutes += 24 * 60;
  }

  return endMinutes - startMinutes;
}

export function formatDuration(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;

  if (hours === 0) {
    return `${mins}m`;
  }

  return `${hours}h ${String(mins).padStart(2, '0')}m`;
}

function sanitizeDigits(text: string, maxLength: number): string {
  return text.replace(/\D/g, '').slice(0, maxLength);
}

function clampHours(text: string): string {
  if (!text) {
    return '';
  }

  const parsed = Number.parseInt(text, 10);

  if (Number.isNaN(parsed)) {
    return '';
  }

  return String(Math.min(23, Math.max(0, parsed))).padStart(2, '0');
}

function clampMinutes(text: string): string {
  if (!text) {
    return '';
  }

  const parsed = Number.parseInt(text, 10);

  if (Number.isNaN(parsed)) {
    return '';
  }

  return String(Math.min(59, Math.max(0, parsed))).padStart(2, '0');
}

interface TimeSplitInputProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
}

export function TimeSplitInput({ label, value, onChange }: TimeSplitInputProps) {
  const parsed = value.match(/^(\d{2}):(\d{2})$/);
  const [hours, setHours] = useState(parsed?.[1] ?? '');
  const [minutes, setMinutes] = useState(parsed?.[2] ?? '');
  const minutesRef = useRef<TextInput>(null);

  useEffect(() => {
    const match = value.match(/^(\d{2}):(\d{2})$/);

    if (match) {
      setHours(match[1]);
      setMinutes(match[2]);
    }
  }, [value]);

  const commit = (nextHours: string, nextMinutes: string) => {
    if (nextHours && nextMinutes) {
      onChange(`${clampHours(nextHours)}:${clampMinutes(nextMinutes)}`);
      return;
    }

    onChange('');
  };

  const handleHoursBlur = () => {
    const nextHours = hours ? clampHours(hours) : '';
    setHours(nextHours);
    commit(nextHours, minutes);
  };

  const handleMinutesBlur = () => {
    const nextMinutes = minutes ? clampMinutes(minutes) : '';
    setMinutes(nextMinutes);
    commit(hours, nextMinutes);
  };

  const isStaged = hours.length > 0 && minutes.length > 0;

  return (
    <View style={styles.timeBlock}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.timeInputRow}>
        <TextInput
          style={[
            styles.timeInput,
            isStaged && styles.timeInputStaged,
            { color: hours.length > 0 ? color.text1 : color.text3 },
          ]}
          value={hours}
          onChangeText={(text) => {
            const next = sanitizeDigits(text, 2);
            setHours(next);
            if (!next || !minutes) {
              onChange('');
            }
          }}
          onBlur={handleHoursBlur}
          onFocus={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="HH"
          placeholderTextColor={color.text3}
          returnKeyType="next"
          onSubmitEditing={() => minutesRef.current?.focus()}
        />
        <Text style={styles.timeSeparator}>:</Text>
        <TextInput
          ref={minutesRef}
          style={[
            styles.timeInput,
            isStaged && styles.timeInputStaged,
            { color: minutes.length > 0 ? color.text1 : color.text3 },
          ]}
          value={minutes}
          onChangeText={(text) => {
            const next = sanitizeDigits(text, 2);
            setMinutes(next);
            if (!hours || !next) {
              onChange('');
            }
          }}
          onBlur={handleMinutesBlur}
          onFocus={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          keyboardType="number-pad"
          maxLength={2}
          placeholder="MM"
          placeholderTextColor={color.text3}
        />
      </View>
    </View>
  );
}

interface SelectChipsProps {
  label?: string;
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
}

export function SelectChips({
  label,
  options,
  value,
  onChange,
}: SelectChipsProps) {
  return (
    <View style={styles.chipField}>
      {label ? <Text style={styles.fieldLabel}>{label}</Text> : null}
      <View style={styles.chipRow}>
        {options.map((option) => {
          const selected = value === option;

          return (
            <TouchableOpacity
              key={option}
              activeOpacity={0.7}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onChange(option);
              }}
              style={[styles.chip, selected && styles.chipSelected]}>
              <Text
                style={[
                  styles.chipLabel,
                  selected && styles.chipLabelSelected,
                ]}>
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

interface StepperProps {
  label: string;
  value: number;
  step: number;
  min?: number;
  unitLabel?: string;
  onChange: (value: number) => void;
}

export function Stepper({
  label,
  value,
  step,
  min = 0,
  unitLabel,
  onChange,
}: StepperProps) {
  const handleDecrement = () => {
    if (value - step < min) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value - step);
  };

  const handleIncrement = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value + step);
  };

  return (
    <View style={styles.stepperBlock}>
      <View style={styles.stepperControls}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDecrement}
          disabled={value - step < min}
          style={[
            styles.stepperButton,
            value - step < min && styles.stepperButtonDisabled,
          ]}>
          <Text style={styles.stepperButtonLabel}>−</Text>
        </TouchableOpacity>
        <Text style={styles.stepperValue}>{value}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleIncrement}
          style={styles.stepperButton}>
          <Text style={[styles.stepperButtonLabel, styles.stepperButtonActive]}>
            +
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.stepperLabel}>
        {unitLabel ? `${label} · ${unitLabel}` : label}
      </Text>
    </View>
  );
}

interface RemoveButtonProps {
  onPress: () => void;
}

export function RemoveButton({ onPress }: RemoveButtonProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={styles.removeButton}
      hitSlop={space.sm}>
      <Text style={styles.removeButtonLabel}>×</Text>
    </TouchableOpacity>
  );
}

export const babyCardStyles = StyleSheet.create({
  card: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.cardGap,
  },
  title: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.lg,
  },
  summaryLine: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.md,
  },
  formSection: {
    marginBottom: space.md,
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    alignItems: 'flex-end',
    marginBottom: space.md,
  },
  addButton: {
    minWidth: ADD_BUTTON_MIN_WIDTH,
    height: 44,
    backgroundColor: color.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    alignSelf: 'flex-start',
  },
  addButtonDisabled: {
    backgroundColor: color.surface2,
  },
  addButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.accentInk,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  },
  addButtonLabelDisabled: {
    color: color.text3,
  },
  listDivider: {
    height: 1,
    backgroundColor: color.border2,
    marginBottom: space.md,
  },
  stagedList: {
    marginBottom: space.lg,
  },
  emptyState: {
    borderWidth: 1,
    borderColor: color.border,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    paddingVertical: space.xl,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  emptyStateLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  stagedItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  stagedItemContent: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: space.sm,
  },
  typePill: {
    backgroundColor: color.surface3,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
  },
  typePillLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text2,
    textTransform: 'uppercase',
  },
  accentTime: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textTransform: 'uppercase',
  },
  summaryText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    textTransform: 'uppercase',
  },
  inProgressText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
    textTransform: 'uppercase',
  },
  derivedDuration: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textTransform: 'uppercase',
    marginTop: space.xs,
  },
  itemDivider: {
    height: 1,
    backgroundColor: color.border2,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonActive: {
    backgroundColor: color.accent,
  },
  logButtonDisabled: {
    backgroundColor: color.surface2,
  },
  logButtonLogged: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
  },
  logButtonLabelActive: {
    color: color.accentInk,
  },
  logButtonLabelDisabled: {
    color: color.text3,
  },
  logButtonLabelLogged: {
    color: color.text3,
  },
  foodInput: {
    flex: 1,
    minWidth: 140,
    height: 44,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    fontFamily: font.mono,
    fontSize: 14,
    color: color.text1,
  },
  foodInputPlaceholder: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
  },
});

const styles = StyleSheet.create({
  timeBlock: {
    minWidth: 120,
  },
  fieldLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.sm,
  },
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeInput: {
    minWidth: 52,
    minHeight: 44,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    fontFamily: font.mono,
    fontSize: 22,
    textAlign: 'center',
    paddingHorizontal: space.sm,
  },
  timeInputStaged: {
    borderColor: color.accent,
  },
  timeSeparator: {
    fontFamily: font.mono,
    fontSize: 18,
    color: color.text2,
    marginHorizontal: space.sm,
  },
  chipField: {
    flex: 1,
    minWidth: 120,
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
    borderRadius: CHIP_RADIUS,
    paddingHorizontal: 10,
    paddingVertical: space.sm,
  },
  chipSelected: {
    borderColor: color.accent,
    backgroundColor: color.surface,
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
  stepperBlock: {
    alignItems: 'center',
    minWidth: 100,
  },
  stepperControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  stepperButton: {
    width: 36,
    height: 36,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonDisabled: {
    opacity: 0.4,
  },
  stepperButtonLabel: {
    fontFamily: font.mono,
    fontSize: 18,
    color: color.text3,
  },
  stepperButtonActive: {
    color: color.accent,
  },
  stepperValue: {
    fontFamily: font.mono,
    fontSize: 16,
    color: color.text1,
    minWidth: 32,
    textAlign: 'center',
  },
  stepperLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    marginTop: space.xs,
    textAlign: 'center',
  },
  removeButton: {
    width: REMOVE_BUTTON_SIZE,
    height: REMOVE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonLabel: {
    fontFamily: font.mono,
    fontSize: 20,
    color: color.text3,
    lineHeight: 22,
  },
});
