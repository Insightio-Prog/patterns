import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { rowStyles, ROW_CELL_SIZE, ROW_VALUE_SIZE } from '@/components/rows/rowStyles';
import type { CounterRowConfig, RowValue } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface CounterRowProps {
  config: CounterRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

function parseCounterInput(text: string): number | null {
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  const parsed = Math.floor(Number(trimmed));

  if (Number.isNaN(parsed)) {
    return null;
  }

  return Math.max(0, parsed);
}

export default function CounterRow({ config, value, onChange }: CounterRowProps) {
  const count = value?.type === 'counter' ? value.value : 0;
  const staged = value?.type === 'counter' && count > 0;
  const [inputText, setInputText] = useState('');
  const inputRef = useRef<TextInput>(null);
  const isFocusedRef = useRef(false);

  const unitText = config.unitLabel?.toUpperCase();

  useEffect(() => {
    if (!isFocusedRef.current) {
      setInputText(count > 0 ? String(count) : '');
    }
  }, [count]);

  const commitInput = () => {
    const parsed = parseCounterInput(inputText);

    if (parsed === null) {
      setInputText(count > 0 ? String(count) : '');
      return;
    }

    if (parsed === 0) {
      onChange(null);
      setInputText('');
      return;
    }

    onChange({ type: 'counter', value: parsed });
    setInputText(String(parsed));
  };

  const getEffectiveCount = (): number => {
    if (isFocusedRef.current) {
      const parsed = parseCounterInput(inputText);
      return parsed ?? count;
    }

    return count;
  };

  const handleDecrement = () => {
    const current = getEffectiveCount();

    if (current <= 0) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = current - 1;

    if (next <= 0) {
      onChange(null);
      setInputText('');
      isFocusedRef.current = false;
      inputRef.current?.blur();
      return;
    }

    onChange({ type: 'counter', value: next });
    setInputText(String(next));
  };

  const handleIncrement = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const next = getEffectiveCount() + 1;
    onChange({ type: 'counter', value: next });
    setInputText(String(next));
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!inputText && count > 0) {
      setInputText(String(count));
    }
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    commitInput();
    Keyboard.dismiss();
  };

  const handleValuePress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    inputRef.current?.focus();
  };

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <View style={styles.row}>
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={getEffectiveCount() <= 0}
          onPress={handleDecrement}
          style={styles.button}>
          <Text
            style={[
              styles.buttonLabel,
              getEffectiveCount() <= 0
                ? styles.buttonLabelDisabled
                : styles.buttonLabelEnabled,
            ]}>
            −
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleValuePress}
          hitSlop={{
            top: space.xs,
            bottom: space.xs,
            left: space.sm,
            right: space.sm,
          }}
          style={styles.valueCell}>
          <TextInput
            ref={inputRef}
            style={[styles.valueText, staged && styles.valueTextStaged]}
            value={inputText}
            onChangeText={setInputText}
            onFocus={handleFocus}
            onBlur={handleBlur}
            keyboardType="number-pad"
            placeholder="0"
            placeholderTextColor={color.text3}
          />
          {unitText ? (
            <Text style={[styles.unit, staged && styles.unitStaged]}>{unitText}</Text>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleIncrement}
          style={styles.button}>
          <Text style={[styles.buttonLabel, styles.buttonLabelActive]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    alignSelf: 'flex-start',
  },
  button: {
    width: ROW_CELL_SIZE,
    height: ROW_CELL_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  buttonLabel: {
    fontFamily: font.mono,
    fontSize: 22,
  },
  buttonLabelEnabled: {
    color: color.text1,
  },
  buttonLabelDisabled: {
    color: color.text3,
  },
  buttonLabelActive: {
    color: color.accent,
  },
  valueCell: {
    minWidth: ROW_CELL_SIZE,
    minHeight: ROW_CELL_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    flexShrink: 0,
  },
  valueText: {
    fontFamily: font.mono,
    fontSize: ROW_VALUE_SIZE,
    color: color.text1,
    fontWeight: fontWeight.semibold,
    padding: 0,
    minWidth: 24,
    // Web <input> defaults to ~170px wide; pin it so the counter fits the card.
    width: 56,
    textAlign: 'center',
  },
  valueTextStaged: {
    color: color.accent,
  },
  unit: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    marginTop: 2,
  },
  unitStaged: {
    color: color.accent,
  },
});
