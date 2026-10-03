import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { rowStyles } from '@/components/rows/rowStyles';
import type { RowValue, TimeInputRowConfig } from '@/types/rows';
import {
  color,
  font,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface TimeInputRowProps {
  config: TimeInputRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

const INPUT_MIN_WIDTH = 52;
const INPUT_HEIGHT = 44;
const INPUT_FONT_SIZE = 22;
const SEPARATOR_FONT_SIZE = 18;

function parseDefaultValue(
  defaultValue?: string,
): { hours: string; minutes: string } | null {
  if (!defaultValue) {
    return null;
  }

  const match = defaultValue.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  return {
    hours: match[1],
    minutes: match[2],
  };
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

  const clamped = Math.min(23, Math.max(0, parsed));
  return String(clamped).padStart(2, '0');
}

function clampMinutes(text: string): string {
  if (!text) {
    return '';
  }

  const parsed = Number.parseInt(text, 10);

  if (Number.isNaN(parsed)) {
    return '';
  }

  const clamped = Math.min(59, Math.max(0, parsed));
  return String(clamped).padStart(2, '0');
}

function formatStagedValue(hours: string, minutes: string): string {
  return `${hours}:${minutes}`;
}

function tryStage(
  hours: string,
  minutes: string,
  onChange: (value: RowValue | null) => void,
) {
  if (!hours || !minutes) {
    onChange(null);
    return;
  }

  onChange({
    type: 'timeInput',
    value: formatStagedValue(hours, minutes),
  });
}

export default function TimeInputRow({
  config,
  value,
  onChange,
}: TimeInputRowProps) {
  const staged = value?.type === 'timeInput' ? value.value : null;
  const parsedStaged = parseDefaultValue(staged ?? undefined);
  const parsedDefault = parseDefaultValue(config.defaultValue);
  const initial = parsedStaged ?? parsedDefault;

  const [hours, setHours] = useState(initial?.hours ?? '');
  const [minutes, setMinutes] = useState(initial?.minutes ?? '');
  const minutesRef = useRef<TextInput>(null);
  const appliedDefaultRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (staged) {
      const parsed = parseDefaultValue(staged);

      if (parsed) {
        setHours(clampHours(parsed.hours));
        setMinutes(clampMinutes(parsed.minutes));
      }

      return;
    }

    if (!config.defaultValue || appliedDefaultRef.current === config.defaultValue) {
      return;
    }

    const parsed = parseDefaultValue(config.defaultValue);

    if (!parsed) {
      return;
    }

    const nextHours = clampHours(parsed.hours);
    const nextMinutes = clampMinutes(parsed.minutes);
    setHours(nextHours);
    setMinutes(nextMinutes);
    tryStage(nextHours, nextMinutes, onChange);
    appliedDefaultRef.current = config.defaultValue;
  }, [config.defaultValue, onChange, staged]);

  const isStaged = hours.length > 0 && minutes.length > 0;
  const placeholder = config.placeholder ?? 'HH:MM';

  const handleFocus = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleHoursChange = (text: string) => {
    const next = sanitizeDigits(text, 2);
    setHours(next);

    if (!next || !minutes) {
      onChange(null);
    }
  };

  const handleMinutesChange = (text: string) => {
    const next = sanitizeDigits(text, 2);
    setMinutes(next);

    if (!hours || !next) {
      onChange(null);
    }
  };

  const handleHoursBlur = () => {
    const nextHours = hours ? clampHours(hours) : '';
    setHours(nextHours);

    const nextMinutes = minutes ? clampMinutes(minutes) : minutes;
    if (minutes) {
      setMinutes(nextMinutes);
    }

    tryStage(nextHours, nextMinutes, onChange);
  };

  const handleMinutesBlur = () => {
    const nextMinutes = minutes ? clampMinutes(minutes) : '';
    setMinutes(nextMinutes);

    const nextHours = hours ? clampHours(hours) : hours;
    if (hours) {
      setHours(nextHours);
    }

    tryStage(nextHours, nextMinutes, onChange);
  };

  const inputTextColor = (text: string) =>
    text.length > 0 ? color.text1 : color.text3;

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[
            styles.input,
            { color: inputTextColor(hours) },
            isStaged && styles.inputStaged,
          ]}
          value={hours}
          onChangeText={handleHoursChange}
          onBlur={handleHoursBlur}
          onFocus={handleFocus}
          keyboardType="number-pad"
          maxLength={2}
          placeholder={placeholder.split(':')[0]}
          placeholderTextColor={color.text3}
          returnKeyType="next"
          onSubmitEditing={() => minutesRef.current?.focus()}
        />
        <Text style={styles.separator}>:</Text>
        <TextInput
          ref={minutesRef}
          style={[
            styles.input,
            { color: inputTextColor(minutes) },
            isStaged && styles.inputStaged,
          ]}
          value={minutes}
          onChangeText={handleMinutesChange}
          onBlur={handleMinutesBlur}
          onFocus={handleFocus}
          keyboardType="number-pad"
          maxLength={2}
          placeholder={placeholder.split(':')[1] ?? 'MM'}
          placeholderTextColor={color.text3}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  input: {
    minWidth: INPUT_MIN_WIDTH,
    minHeight: INPUT_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    fontFamily: font.mono,
    fontSize: INPUT_FONT_SIZE,
    textAlign: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: 0,
  },
  inputStaged: {
    borderColor: color.accent,
  },
  separator: {
    fontFamily: font.mono,
    fontSize: SEPARATOR_FONT_SIZE,
    color: color.text2,
    marginHorizontal: space.sm,
  },
});
