import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
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

export interface QuantityInputProps {
  context: string;
  onChange: (quantity: { amount: string; unit: string }) => void;
}

const UNIT_OPTIONS = [
  'G',
  'KG',
  'ML',
  'L',
  'CUPS',
  'TBSP',
  'TSP',
  'TIMES',
] as const;

const AMOUNT_INPUT_WIDTH = 64;
const INPUT_HEIGHT = 36;
const AMOUNT_INPUT_FONT_SIZE = 15;

export default function QuantityInput({ context, onChange }: QuantityInputProps) {
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState<string>('G');

  useEffect(() => {
    onChange({ amount: '', unit: 'G' });
  }, []);

  const handleAmountChange = (text: string) => {
    const digits = text.replace(/\D/g, '');
    setAmount(digits);
    onChange({ amount: digits, unit });
  };

  const handleSelectUnit = (nextUnit: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setUnit(nextUnit);
    onChange({ amount, unit: nextUnit });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.contextLabel}>{context}</Text>
      <View style={styles.row}>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={handleAmountChange}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={color.text3}
          textAlignVertical="center"
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.unitScroll}
          contentContainerStyle={styles.unitRow}>
          {UNIT_OPTIONS.map((unitOption) => {
            const isSelected = unit === unitOption;

            return (
              <TouchableOpacity
                key={unitOption}
                activeOpacity={0.7}
                onPress={() => handleSelectUnit(unitOption)}
                style={[styles.unitPill, isSelected && styles.unitPillSelected]}>
                <Text
                  style={[
                    styles.unitPillLabel,
                    isSelected && styles.unitPillLabelSelected,
                  ]}>
                  {unitOption}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: space.md,
  },
  contextLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    marginBottom: space.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  amountInput: {
    width: AMOUNT_INPUT_WIDTH,
    height: INPUT_HEIGHT,
    paddingVertical: 0,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    fontFamily: font.mono,
    fontSize: AMOUNT_INPUT_FONT_SIZE,
    color: color.text1,
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  unitScroll: {
    flex: 1,
  },
  unitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: space.lg,
  },
  unitPill: {
    paddingHorizontal: space.sm,
    height: INPUT_HEIGHT,
    borderRadius: radius.sm,
    borderWidth: 1,
    backgroundColor: color.surface2,
    borderColor: color.border,
    marginRight: space.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitPillSelected: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  unitPillLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  unitPillLabelSelected: {
    color: color.accentInk,
  },
});
