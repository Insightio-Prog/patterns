import * as Haptics from 'expo-haptics';
import { Fragment } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { rowStyles } from '@/components/rows/rowStyles';
import type { LevelRowConfig, RowValue } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface LevelRowProps {
  config: LevelRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

const DEFAULT_OPTIONS: [string, string, string] = ['LOW', 'NORMAL', 'HIGH'];

export default function LevelRow({ config, value, onChange }: LevelRowProps) {
  const options = config.options ?? DEFAULT_OPTIONS;
  const selected = value?.type === 'level' ? value.value : null;

  const handleSelect = (option: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (selected === option) {
      onChange(null);
      return;
    }

    onChange({ type: 'level', value: option });
  };

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <View style={styles.container}>
        {options.map((option, index) => {
          const isSelected = selected === option;

          return (
            <Fragment key={option}>
              {index > 0 ? <View style={styles.divider} /> : null}
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleSelect(option)}
                style={[styles.segment, isSelected && styles.segmentActive]}>
                <Text
                  style={[
                    styles.segmentLabel,
                    isSelected && styles.segmentLabelActive,
                  ]}>
                  {sentenceCase(option)}
                </Text>
              </TouchableOpacity>
            </Fragment>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
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
