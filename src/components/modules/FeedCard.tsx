import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';

import {
  babyCardStyles as styles,
  getCurrentTimeHHMM,
  LOGGED_CONFIRM_MS,
  RemoveButton,
  SelectChips,
  Stepper,
  TimeSplitInput,
} from '@/components/modules/babyCardShared';
import type { FeedEntry, FeedType } from '@/types/baby';
import { generateId } from '@/utils/generateId';
import { color } from '@/theme/theme';

export interface FeedCardProps {
  title: string;
  showBreastfeeding?: boolean;
  showBottle?: boolean;
  showSolids?: boolean;
  onLog?: (entries: FeedEntry[]) => void;
}

function formatFeedSummary(entry: FeedEntry): string {
  if (entry.type === 'breast') {
    const side = entry.side ?? '';
    const duration = entry.durationMins ?? 0;
    return `${side} ${duration}m`.trim();
  }

  if (entry.type === 'bottle') {
    return `${entry.amountMl ?? 0}ml`;
  }

  const food = entry.food?.trim() || 'SOLIDS';
  const amount = entry.amountSolids ?? '';
  return amount ? `${food} · ${amount}` : food;
}

function getEnabledFeedTypes(
  showBreastfeeding: boolean,
  showBottle: boolean,
  showSolids: boolean,
): FeedType[] {
  const types: FeedType[] = [];

  if (showBreastfeeding) {
    types.push('breast');
  }

  if (showBottle) {
    types.push('bottle');
  }

  if (showSolids) {
    types.push('solids');
  }

  return types;
}

function feedTypeLabel(type: FeedType): string {
  if (type === 'breast') {
    return 'BREAST';
  }

  if (type === 'bottle') {
    return 'BOTTLE';
  }

  return 'SOLIDS';
}

export default function FeedCard({
  title,
  showBreastfeeding = false,
  showBottle = false,
  showSolids = false,
  onLog,
}: FeedCardProps) {
  const enabledTypes = useMemo(
    () => getEnabledFeedTypes(showBreastfeeding, showBottle, showSolids),
    [showBreastfeeding, showBottle, showSolids],
  );

  const [activeType, setActiveType] = useState<FeedType>(
    enabledTypes[0] ?? 'breast',
  );
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [time, setTime] = useState(getCurrentTimeHHMM);
  const [side, setSide] = useState<'LEFT' | 'RIGHT' | 'BOTH' | null>(null);
  const [durationMins, setDurationMins] = useState(10);
  const [amountMl, setAmountMl] = useState(0);
  const [food, setFood] = useState('');
  const [amountSolids, setAmountSolids] = useState<string | null>(null);

  const showTypeSelector = enabledTypes.length > 1;
  const canLog = entries.length > 0 && !loggedConfirm;

  useEffect(() => {
    if (!enabledTypes.includes(activeType) && enabledTypes.length > 0) {
      setActiveType(enabledTypes[0]);
    }
  }, [activeType, enabledTypes]);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setTime(getCurrentTimeHHMM());
    setSide(null);
    setDurationMins(10);
    setAmountMl(0);
    setFood('');
    setAmountSolids(null);
  };

  const canAddBreast = time.length > 0 && side !== null;
  const canAddBottle = time.length > 0 && amountMl > 0;
  const canAddSolids = time.length > 0;
  const canAdd =
    activeType === 'breast'
      ? canAddBreast
      : activeType === 'bottle'
        ? canAddBottle
        : canAddSolids;

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const base = {
      id: generateId(),
      time,
    };

    let entry: FeedEntry;

    if (activeType === 'breast') {
      entry = {
        ...base,
        type: 'breast',
        side: side ?? undefined,
        durationMins,
      };
    } else if (activeType === 'bottle') {
      entry = {
        ...base,
        type: 'bottle',
        amountMl,
      };
    } else {
      entry = {
        ...base,
        type: 'solids',
        food: food.trim() || undefined,
        amountSolids: amountSolids ?? undefined,
      };
    }

    setEntries((current) => [entry, ...current]);
    resetForm();
  };

  const handleRemove = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEntries((current) => current.filter((entry) => entry.id !== id));
  };

  const handleLog = () => {
    if (!canLog) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload = [...entries];
    setLoggedConfirm(true);
    setEntries([]);

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

    if (entries.length === 1) {
      return 'LOG · 1 FEED';
    }

    return `LOG · ${entries.length} FEEDS`;
  };

  if (enabledTypes.length === 0) {
    return null;
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {showTypeSelector ? (
        <View style={styles.formSection}>
          <SelectChips
            label="FEED TYPE"
            options={enabledTypes.map(feedTypeLabel)}
            value={feedTypeLabel(activeType)}
            onChange={(label) => {
              if (label === 'BREAST') {
                setActiveType('breast');
              } else if (label === 'BOTTLE') {
                setActiveType('bottle');
              } else {
                setActiveType('solids');
              }
            }}
          />
        </View>
      ) : null}

      <View style={styles.formSection}>
        {activeType === 'breast' ? (
          <View style={styles.formRow}>
            <TimeSplitInput label="TIME" value={time} onChange={setTime} />
            <SelectChips
              label="SIDE"
              options={['LEFT', 'RIGHT', 'BOTH']}
              value={side}
              onChange={(value) =>
                setSide(value as 'LEFT' | 'RIGHT' | 'BOTH')
              }
            />
            <Stepper
              label="DURATION"
              unitLabel="MINS"
              value={durationMins}
              step={1}
              min={1}
              onChange={setDurationMins}
            />
          </View>
        ) : null}

        {activeType === 'bottle' ? (
          <View style={styles.formRow}>
            <TimeSplitInput label="TIME" value={time} onChange={setTime} />
            <Stepper
              label="AMOUNT"
              unitLabel="ML"
              value={amountMl}
              step={10}
              min={0}
              onChange={setAmountMl}
            />
          </View>
        ) : null}

        {activeType === 'solids' ? (
          <>
            <View style={styles.formRow}>
              <TimeSplitInput label="TIME" value={time} onChange={setTime} />
              <TextInput
                style={[
                  styles.foodInput,
                  food.length === 0 && styles.foodInputPlaceholder,
                ]}
                value={food}
                onChangeText={setFood}
                placeholder="WHAT DID THEY EAT?"
                placeholderTextColor={color.text3}
              />
            </View>
            <SelectChips
              label="AMOUNT"
              options={['SMALL', 'MEDIUM', 'LARGE']}
              value={amountSolids}
              onChange={setAmountSolids}
            />
          </>
        ) : null}

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

      <View style={styles.listDivider} />

      <View style={styles.stagedList}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateLabel}>NO FEEDS LOGGED YET</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <View key={entry.id}>
              <View style={styles.stagedItemRow}>
                <View style={styles.stagedItemContent}>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillLabel}>
                      {feedTypeLabel(entry.type)}
                    </Text>
                  </View>
                  <Text style={styles.accentTime}>{entry.time}</Text>
                  <Text style={styles.summaryText}>
                    {formatFeedSummary(entry)}
                  </Text>
                </View>
                <RemoveButton onPress={() => handleRemove(entry.id)} />
              </View>
              {index < entries.length - 1 ? (
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
