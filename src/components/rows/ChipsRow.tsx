import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { rowStyles, CHIP_MARKER_SIZE, CHIP_RADIUS } from '@/components/rows/rowStyles';
import TimeBlockPicker from '@/components/TimeBlockPicker';
import { colorWithOpacity } from '@/utils/colorWithOpacity';
import type { ChipsRowConfig, RowValue } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  letterSpacing,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface ChipsRowProps {
  config: ChipsRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

const CHIP_LABEL_LETTER_SPACING = 0.8;
const SELECTED_BORDER_OPACITY = 0.45;
const SELECTED_WASH_OPACITY = 0.1;

export default function ChipsRow({ config, value, onChange }: ChipsRowProps) {
  const selected =
    value?.type === 'chips' ? value.value : [];
  const timestamp =
    value?.type === 'chips' ? value.timestamp : undefined;
  const multi = config.multi !== false;
  // Wrap by default so every option is visible (no hidden sideways scrolling).
  const shouldWrap = config.wrap ?? true;

  const updateSelection = (nextSelected: string[], nextTimestamp?: string) => {
    if (nextSelected.length === 0) {
      onChange(null);
      return;
    }

    onChange({
      type: 'chips',
      value: nextSelected,
      timestamp: nextTimestamp ?? timestamp,
    });
  };

  const handleToggle = (option: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (multi) {
      if (selected.includes(option)) {
        updateSelection(selected.filter((item) => item !== option));
      } else {
        updateSelection([...selected, option]);
      }
      return;
    }

    if (selected.includes(option)) {
      onChange(null);
      return;
    }

    updateSelection([option]);
  };

  const chipNodes = useMemo(
    () =>
      config.options.map((option) => {
        const isSelected = selected.includes(option);

        return (
          <TouchableOpacity
            key={option}
            activeOpacity={0.7}
            onPress={() => handleToggle(option)}
            style={[
              styles.chip,
              isSelected && styles.chipSelected,
              isSelected && {
                backgroundColor: colorWithOpacity(color.accent, SELECTED_WASH_OPACITY),
                borderColor: colorWithOpacity(color.accent, SELECTED_BORDER_OPACITY),
              },
            ]}>
            <View style={styles.marker} />
            <Text
              style={[
                styles.chipLabel,
                isSelected && styles.chipLabelSelected,
              ]}>
              {sentenceCase(option)}
            </Text>
          </TouchableOpacity>
        );
      }),
    [config.options, selected],
  );

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      {shouldWrap ? (
        <View style={styles.wrapRow}>{chipNodes}</View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollRow}>
          {chipNodes}
        </ScrollView>
      )}
      {config.showTimestamp && selected.length > 0 ? (
        <TimeBlockPicker
          context="Logged at"
          onChange={(time) => updateSelection(selected, time)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
  },
  scrollRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingRight: space.lg,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: CHIP_RADIUS,
    paddingHorizontal: 10,
    paddingVertical: space.sm,
    flexShrink: 0,
  },
  chipSelected: {
    borderColor: color.accent,
  },
  marker: {
    width: CHIP_MARKER_SIZE,
    height: CHIP_MARKER_SIZE,
    borderRadius: 2,
    backgroundColor: color.accent,
    marginRight: 6,
  },
  chipLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
    color: color.text2,
  },
  chipLabelSelected: {
    color: color.accent,
  },
});
