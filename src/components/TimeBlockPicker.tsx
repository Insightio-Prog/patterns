import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ScrollView,
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
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface TimeBlockPickerProps {
  onChange: (time: string) => void;
  context?: string;
}

interface TimeBlock {
  label: string;
  value: string;
}

type SelectedPill = 'NOW' | 'CUSTOM' | string;

const PILL_HEIGHT = 28;
const INPUT_WIDTH = 52;
const INPUT_HEIGHT = 48;
const CUSTOM_INPUT_FONT_SIZE = 16;
const BLOCK_COUNT = 4;
const PILL_ROW_PADDING_RIGHT = 40;

function formatTimeHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

function get12HourParts(hour24: number): { display: string; period: 'AM' | 'PM' } {
  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM';
  let hour12 = hour24 % 12;
  if (hour12 === 0) {
    hour12 = 12;
  }
  return { display: String(hour12), period };
}

function formatBlockLabel(startHour24: number): string {
  const endHour24 = (startHour24 + 1) % 24;
  const start = get12HourParts(startHour24);
  const end = get12HourParts(endHour24);

  if (start.period === end.period) {
    return `${start.display}–${end.display}${end.period}`;
  }

  return `${start.display}${start.period}–${end.display}${end.period}`;
}

function generateTimeBlocks(): TimeBlock[] {
  const currentHour = new Date().getHours();
  const blocks: TimeBlock[] = [];

  for (let index = 1; index <= BLOCK_COUNT; index += 1) {
    const startHour = ((currentHour - index) % 24 + 24) % 24;
    blocks.push({
      label: formatBlockLabel(startHour),
      value: `${String(startHour).padStart(2, '0')}:00`,
    });
  }

  return blocks;
}

function clampHour(value: string): string {
  let num = parseInt(value, 10);
  if (Number.isNaN(num)) {
    num = 0;
  }
  num = Math.max(0, Math.min(23, num));
  return String(num).padStart(2, '0');
}

function clampMinute(value: string): string {
  let num = parseInt(value, 10);
  if (Number.isNaN(num)) {
    num = 0;
  }
  num = Math.max(0, Math.min(59, num));
  return String(num).padStart(2, '0');
}

function isValidHour(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  const num = parseInt(value, 10);
  return !Number.isNaN(num) && num >= 0 && num <= 23;
}

function isValidMinute(value: string): boolean {
  if (value.length === 0) {
    return false;
  }

  const num = parseInt(value, 10);
  return !Number.isNaN(num) && num >= 0 && num <= 59;
}

export default function TimeBlockPicker({
  onChange,
  context,
}: TimeBlockPickerProps) {
  const timeBlocks = useMemo(() => generateTimeBlocks(), []);
  const mmInputRef = useRef<TextInput>(null);

  const [selected, setSelected] = useState<SelectedPill>('NOW');
  const [hh, setHh] = useState('');
  const [mm, setMm] = useState('');

  useEffect(() => {
    onChange(formatTimeHHMM(new Date()));
  }, []);

  const handleSelectNow = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected('NOW');
    onChange(formatTimeHHMM(new Date()));
  };

  const handleSelectBlock = (block: TimeBlock) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected(block.value);
    onChange(block.value);
  };

  const handleSelectCustom = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelected('CUSTOM');
  };

  const tryEmitCustomTime = (hhValue: string, mmValue: string) => {
    if (selected !== 'CUSTOM') {
      return;
    }

    if (
      hhValue.length !== 2 ||
      mmValue.length !== 2 ||
      !isValidHour(hhValue) ||
      !isValidMinute(mmValue)
    ) {
      return;
    }

    onChange(`${clampHour(hhValue)}:${clampMinute(mmValue)}`);
  };

  const handleHHChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    setHh(digits);

    if (digits.length === 2) {
      mmInputRef.current?.focus();
    }

    tryEmitCustomTime(digits, mm);
  };

  const handleMMChange = (text: string) => {
    const digits = text.replace(/\D/g, '').slice(0, 2);
    setMm(digits);
    tryEmitCustomTime(hh, digits);
  };

  const handleHHBlur = () => {
    if (hh.length === 0) {
      return;
    }

    setHh(clampHour(hh));
  };

  const handleMMBlur = () => {
    if (mm.length === 0) {
      return;
    }

    setMm(clampMinute(mm));
  };

  const renderPill = (
    pillKey: string,
    label: string,
    isSelected: boolean,
    onPress: () => void,
    isLast = false,
  ) => (
    <TouchableOpacity
      key={pillKey}
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.pill,
        isLast && styles.pillLast,
        isSelected && styles.pillSelected,
      ]}>
      <Text style={[styles.pillLabel, isSelected && styles.pillLabelSelected]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {context ? <Text style={styles.contextLabel}>{context}</Text> : null}

      <View style={styles.separator} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.pillRow}>
        {renderPill('now', 'NOW', selected === 'NOW', handleSelectNow)}

        {timeBlocks.map((block) =>
          renderPill(
            block.value,
            block.label,
            selected === block.value,
            () => handleSelectBlock(block),
          ),
        )}

        {renderPill(
          'custom',
          'CUSTOM',
          selected === 'CUSTOM',
          handleSelectCustom,
          true,
        )}
      </ScrollView>

      {selected === 'CUSTOM' ? (
        <View style={styles.customRow}>
          <Text style={styles.timeLabel}>TIME</Text>
          <TextInput
            style={styles.timeInput}
            value={hh}
            onChangeText={handleHHChange}
            onBlur={handleHHBlur}
            keyboardType="numeric"
            maxLength={2}
            placeholder="00"
            placeholderTextColor={color.text3}
          />
          <Text style={styles.colon}>:</Text>
          <TextInput
            ref={mmInputRef}
            style={styles.timeInput}
            value={mm}
            onChangeText={handleMMChange}
            onBlur={handleMMBlur}
            keyboardType="numeric"
            maxLength={2}
            placeholder="00"
            placeholderTextColor={color.text3}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.lg,
  },
  contextLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    marginBottom: space.xs,
  },
  separator: {
    height: 1,
    backgroundColor: color.border,
    marginTop: space.lg,
    marginBottom: space.md,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: PILL_ROW_PADDING_RIGHT,
  },
  pill: {
    paddingHorizontal: space.md,
    height: PILL_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: color.surface2,
    borderColor: color.border,
    marginRight: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillLast: {
    marginRight: 0,
  },
  pillSelected: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  pillLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  pillLabelSelected: {
    color: color.accentInk,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginTop: space.sm,
  },
  timeLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    marginRight: space.xs,
  },
  timeInput: {
    width: INPUT_WIDTH,
    height: INPUT_HEIGHT,
    paddingVertical: 0,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    fontFamily: font.mono,
    fontSize: CUSTOM_INPUT_FONT_SIZE,
    color: color.text1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  colon: {
    fontFamily: font.mono,
    fontSize: CUSTOM_INPUT_FONT_SIZE,
    color: color.text2,
    marginHorizontal: space.xs,
  },
});
