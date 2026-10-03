import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { rowStyles } from '@/components/rows/rowStyles';
import type { RowValue, ToggleRowConfig } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface ToggleRowProps {
  config: ToggleRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

export default function ToggleRow({ config, value, onChange }: ToggleRowProps) {
  const selected = value?.type === 'toggle' ? value.value : null;

  const handleSelect = (nextValue: boolean) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selected === nextValue) {
      onChange(null);
      return;
    }

    onChange({ type: 'toggle', value: nextValue });
  };

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <View style={styles.container}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelect(true)}
          style={[
            styles.segment,
            selected === true && styles.segmentActive,
          ]}>
          <Text
            style={[
              styles.segmentLabel,
              selected === true && styles.segmentLabelActive,
            ]}>
            Yes
          </Text>
        </TouchableOpacity>
        <View style={styles.divider} />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => handleSelect(false)}
          style={[
            styles.segment,
            selected === false && styles.segmentActive,
          ]}>
          <Text
            style={[
              styles.segmentLabel,
              selected === false && styles.segmentLabelActive,
            ]}>
            No
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignSelf: 'flex-start',
    alignItems: 'stretch',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: {
    minWidth: 72,
    minHeight: 44,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentActive: {
    backgroundColor: color.accent,
  },
  segmentLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
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
});
