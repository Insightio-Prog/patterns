import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import type { ExerciseItem, WeightUnit } from '@/types/fitness';
import { generateId } from '@/utils/generateId';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface ExerciseDraftCardProps {
  title: string;
  showWeightInput?: boolean;
  weightUnit?: WeightUnit;
  commonExercises?: string[];
  onLog?: (items: ExerciseItem[]) => void;
}

const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;
const CHIP_RADIUS = 10;
const CHIP_MARKER_SIZE = 7;
const CHIP_LABEL_LETTER_SPACING = 0.8;
const COMPACT_COUNTER_SIZE = 36;
const STATS_ROW_MIN_HEIGHT = 52;
const ADD_BUTTON_MIN_WIDTH = 64;

function formatExerciseStats(
  item: ExerciseItem,
  defaultWeightUnit: WeightUnit,
): string {
  const parts: string[] = [];

  if (item.sets !== undefined && item.reps !== undefined) {
    parts.push(`${item.sets} x ${item.reps}`);
  }

  if (item.weight !== undefined && item.weight > 0) {
    const unit = item.weightUnit ?? defaultWeightUnit;
    parts.push(`@ ${item.weight}${unit}`);
  }

  if (item.duration !== undefined && item.duration > 0) {
    parts.push(`${item.duration}m`);
  }

  return parts.join(' ');
}

interface CompactCounterProps {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}

function CompactCounter({
  label,
  value,
  min = 1,
  onChange,
}: CompactCounterProps) {
  const handleDecrement = () => {
    if (value <= min) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value - 1);
  };

  const handleIncrement = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value + 1);
  };

  return (
    <View style={styles.compactCounter}>
      <View style={styles.compactCounterControls}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleDecrement}
          disabled={value <= min}
          style={[
            styles.compactCounterButton,
            value <= min && styles.compactCounterButtonDisabled,
          ]}>
          <Text style={styles.compactCounterButtonLabel}>−</Text>
        </TouchableOpacity>
        <Text style={styles.compactCounterValue}>{value}</Text>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleIncrement}
          style={styles.compactCounterButton}>
          <Text style={[styles.compactCounterButtonLabel, styles.compactCounterButtonLabelActive]}>
            +
          </Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.compactCounterLabel}>{label}</Text>
    </View>
  );
}

export default function ExerciseDraftCard({
  title,
  showWeightInput = true,
  weightUnit = 'kg',
  commonExercises,
  onLog,
}: ExerciseDraftCardProps) {
  const [items, setItems] = useState<ExerciseItem[]>([]);
  const [name, setName] = useState('');
  const [sets, setSets] = useState(1);
  const [reps, setReps] = useState(1);
  const [weightText, setWeightText] = useState('');
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canAdd = name.trim().length > 0;
  const canLog = items.length > 0 && !loggedConfirm;

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setName('');
    setSets(1);
    setReps(1);
    setWeightText('');
  };

  const handleQuickPick = (exerciseName: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setName(exerciseName);
  };

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const parsedWeight = Number.parseFloat(weightText);
    const weight =
      showWeightInput && !Number.isNaN(parsedWeight) && parsedWeight > 0
        ? parsedWeight
        : undefined;

    const newItem: ExerciseItem = {
      id: generateId(),
      name: name.trim(),
      sets,
      reps,
      ...(weight !== undefined
        ? { weight, weightUnit }
        : {}),
    };

    setItems((current) => [...current, newItem]);
    resetForm();
  };

  const handleRemove = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const handleLog = () => {
    if (!canLog) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload = [...items];
    setLoggedConfirm(true);
    setItems([]);

    void Promise.resolve(onLog?.(payload)).catch(() => {
      // fail silently
    });

    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }

    confirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      confirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    if (items.length === 1) {
      return 'LOG · 1 EXERCISE';
    }

    return `LOG · ${items.length} EXERCISES`;
  };

  const hasQuickPicks =
    commonExercises !== undefined && commonExercises.length > 0;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {hasQuickPicks ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipScroll}>
          {commonExercises.map((exercise) => (
            <TouchableOpacity
              key={exercise}
              activeOpacity={0.7}
              onPress={() => handleQuickPick(exercise)}
              style={styles.chip}>
              <View style={styles.chipMarker} />
              <Text style={styles.chipLabel}>{exercise}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.formRow}>
        <TextInput
          style={styles.nameInput}
          value={name}
          onChangeText={setName}
          placeholder="EXERCISE NAME"
          placeholderTextColor={color.text3}
          autoCapitalize="characters"
        />
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={!canAdd}
          onPress={handleAdd}
          style={[styles.addButton, !canAdd && styles.addButtonDisabled]}>
          <Text
            style={[
              styles.addButtonLabel,
              !canAdd && styles.addButtonLabelDisabled,
            ]}>
            ADD
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <CompactCounter label="SETS" value={sets} onChange={setSets} />
        <Text style={styles.statsSeparator}>x</Text>
        <CompactCounter label="REPS" value={reps} onChange={setReps} />
        {showWeightInput ? (
          <>
            <Text style={styles.statsSeparator}>@</Text>
            <View style={styles.weightBlock}>
              <TextInput
                style={styles.weightInput}
                value={weightText}
                onChangeText={(text) =>
                  setWeightText(text.replace(/[^\d.]/g, ''))
                }
                keyboardType="decimal-pad"
                placeholder="0"
                placeholderTextColor={color.text3}
              />
              <Text style={styles.weightUnitLabel}>{weightUnit}</Text>
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.listDivider} />

      <View style={styles.stagedList}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateLabel}>NO EXERCISES ADDED YET</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <View key={item.id}>
              <View style={styles.stagedItemRow}>
                <View style={styles.stagedItemContent}>
                  <Text style={styles.stagedItemName}>{item.name}</Text>
                  <Text style={styles.stagedItemStats}>
                    {formatExerciseStats(item, weightUnit)}
                  </Text>
                </View>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleRemove(item.id)}
                  style={styles.removeButton}
                  hitSlop={space.sm}>
                  <Text style={styles.removeButtonLabel}>×</Text>
                </TouchableOpacity>
              </View>
              {index < items.length - 1 ? (
                <View style={styles.itemDivider} />
              ) : null}
            </View>
          ))
        )}
      </View>

      <TouchableOpacity
        activeOpacity={0.7}
        disabled={!canLog && !loggedConfirm}
        onPress={handleLog}
        style={[
          styles.logButton,
          canLog ? styles.logButtonActive : styles.logButtonDisabled,
          loggedConfirm && styles.logButtonLogged,
        ]}>
        <Text
          style={[
            styles.logButtonLabel,
            canLog ? styles.logButtonLabelActive : styles.logButtonLabelDisabled,
            loggedConfirm && styles.logButtonLabelLogged,
          ]}>
          {getLogLabel()}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
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
  chipScroll: {
    flexDirection: 'row',
    gap: space.sm,
    paddingRight: space.lg,
    marginBottom: space.md,
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
  chipMarker: {
    width: CHIP_MARKER_SIZE,
    height: CHIP_MARKER_SIZE,
    borderRadius: 2,
    backgroundColor: color.accent,
    marginRight: 6,
  },
  chipLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    textTransform: 'uppercase',
    letterSpacing: CHIP_LABEL_LETTER_SPACING,
  },
  formRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.md,
  },
  nameInput: {
    flex: 1,
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
  addButton: {
    minWidth: ADD_BUTTON_MIN_WIDTH,
    height: 44,
    backgroundColor: color.accent,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space.sm,
    flexWrap: 'wrap',
    minHeight: STATS_ROW_MIN_HEIGHT,
    marginBottom: space.md,
  },
  statsSeparator: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    marginBottom: 20,
  },
  compactCounter: {
    alignItems: 'center',
    minHeight: STATS_ROW_MIN_HEIGHT,
    justifyContent: 'flex-start',
  },
  compactCounterControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
  },
  compactCounterButton: {
    width: COMPACT_COUNTER_SIZE,
    height: COMPACT_COUNTER_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCounterButtonDisabled: {
    opacity: 0.4,
  },
  compactCounterButtonLabel: {
    fontFamily: font.mono,
    fontSize: 18,
    color: color.text3,
  },
  compactCounterButtonLabelActive: {
    color: color.accent,
  },
  compactCounterValue: {
    fontFamily: font.mono,
    fontSize: 16,
    color: color.text1,
    minWidth: 24,
    textAlign: 'center',
  },
  compactCounterLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    marginTop: space.xs,
  },
  weightBlock: {
    alignItems: 'center',
    minHeight: STATS_ROW_MIN_HEIGHT,
    justifyContent: 'flex-start',
  },
  weightInput: {
    width: 56,
    minHeight: STATS_ROW_MIN_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    fontFamily: font.mono,
    fontSize: 16,
    color: color.text1,
    textAlign: 'center',
    paddingHorizontal: space.xs,
    paddingVertical: space.sm,
  },
  weightUnitLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    textTransform: 'uppercase',
    marginTop: space.xs,
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
  },
  stagedItemName: {
    fontFamily: font.mono,
    fontSize: 13,
    color: color.text1,
    textTransform: 'uppercase',
  },
  stagedItemStats: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    marginTop: 2,
  },
  removeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonLabel: {
    fontFamily: font.mono,
    fontSize: 20,
    color: color.text3,
    lineHeight: 22,
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
});
