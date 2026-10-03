import * as Haptics from 'expo-haptics';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  rowStyles,
  CHECKLIST_TOGGLE_SIZE,
  CHECKMARK_SIZE,
} from '@/components/rows/rowStyles';
import type { ChecklistRowConfig, RowValue } from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  lineHeight,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface ChecklistRowProps {
  config: ChecklistRowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
}

function getTickedItems(value: RowValue | null): Record<string, boolean> {
  if (value?.type !== 'checklist') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value.value).filter(([, ticked]) => ticked),
  );
}

export default function ChecklistRow({
  config,
  value,
  onChange,
}: ChecklistRowProps) {
  const ticked = getTickedItems(value);

  const handleToggle = (item: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const next = { ...ticked };

    if (next[item]) {
      delete next[item];
    } else {
      next[item] = true;
    }

    if (Object.keys(next).length === 0) {
      onChange(null);
      return;
    }

    onChange({ type: 'checklist', value: next });
  };

  return (
    <View>
      <Text style={rowStyles.rowLabel}>{sentenceCase(config.label)}</Text>
      <View style={styles.list}>
        {config.items.map((item, index) => {
          const isTicked = Boolean(ticked[item]);

          return (
            <TouchableOpacity
              key={item}
              activeOpacity={0.7}
              onPress={() => handleToggle(item)}
              style={[
                styles.itemRow,
                index < config.items.length - 1 && styles.itemRowSeparator,
              ]}>
              <Text style={styles.itemLabel}>{item}</Text>
              <View style={[styles.toggle, isTicked && styles.toggleTicked]}>
                {isTicked ? (
                  <Text style={styles.checkmark}>✓</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
  },
  itemRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  itemLabel: {
    flex: 1,
    fontFamily: font.ui,
    fontSize: fontSize.rowLabel,
    color: color.text1,
    lineHeight: fontSize.rowLabel * lineHeight.body,
  },
  toggle: {
    width: CHECKLIST_TOGGLE_SIZE,
    height: CHECKLIST_TOGGLE_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleTicked: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  checkmark: {
    fontFamily: font.mono,
    fontSize: CHECKMARK_SIZE,
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
    lineHeight: CHECKMARK_SIZE,
  },
});
