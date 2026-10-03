import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { rowStyles, ROW_CELL_SIZE, ROW_NUMERAL_SIZE } from '@/components/rows/rowStyles';
import type { RowValue, ScaleRowConfig } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface ScaleRowProps {
  config: ScaleRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

export default function ScaleRow({ config, value, onChange }: ScaleRowProps) {
  const max = config.max ?? 5;
  const selected =
    value?.type === 'scale' ? value.value : null;

  const handleSelect = (scaleValue: number) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selected === scaleValue) {
      onChange(null);
      return;
    }

    onChange({ type: 'scale', value: scaleValue });
  };

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <View style={styles.row}>
        {Array.from({ length: max }, (_, index) => {
          const scaleValue = index + 1;
          const isSelected = selected === scaleValue;

          return (
            <TouchableOpacity
              key={scaleValue}
              activeOpacity={0.7}
              onPress={() => handleSelect(scaleValue)}
              style={[
                styles.cell,
                isSelected ? styles.cellSelected : styles.cellDefault,
              ]}>
              <Text
                style={[
                  styles.numeral,
                  isSelected && styles.numeralSelected,
                ]}>
                {scaleValue}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: space.sm,
    flexWrap: 'wrap',
  },
  cell: {
    width: ROW_CELL_SIZE,
    height: ROW_CELL_SIZE,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellDefault: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
  },
  cellSelected: {
    backgroundColor: color.accent,
  },
  numeral: {
    fontFamily: font.mono,
    fontSize: ROW_NUMERAL_SIZE,
    color: color.text3,
  },
  numeralSelected: {
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
  },
});
