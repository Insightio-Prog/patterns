import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import {
  babyCardStyles as styles,
  getCurrentTimeHHMM,
  LOGGED_CONFIRM_MS,
  RemoveButton,
  SelectChips,
  TimeSplitInput,
} from '@/components/modules/babyCardShared';
import type { NappyEntry } from '@/types/baby';
import { generateId } from '@/utils/generateId';

export interface NappyCardProps {
  title: string;
  onLog?: (entries: NappyEntry[]) => void;
}

export default function NappyCard({ title, onLog }: NappyCardProps) {
  const [entries, setEntries] = useState<NappyEntry[]>([]);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [time, setTime] = useState(getCurrentTimeHHMM);
  const [nappyType, setNappyType] = useState<
    'WET' | 'DIRTY' | 'BOTH' | 'DRY' | null
  >(null);

  const canLog = entries.length > 0 && !loggedConfirm;
  const canAdd = time.length > 0 && nappyType !== null;

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setTime(getCurrentTimeHHMM());
    setNappyType(null);
  };

  const handleAdd = () => {
    if (!canAdd || !nappyType) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const entry: NappyEntry = {
      id: generateId(),
      time,
      type: nappyType,
    };

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
      return 'LOG · 1 NAPPY';
    }

    return `LOG · ${entries.length} NAPPIES`;
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.formSection}>
        <View style={styles.formRow}>
          <TimeSplitInput label="TIME" value={time} onChange={setTime} />
        </View>

        <SelectChips
          label="TYPE"
          options={['WET', 'DIRTY', 'BOTH', 'DRY']}
          value={nappyType}
          onChange={(value) =>
            setNappyType(value as 'WET' | 'DIRTY' | 'BOTH' | 'DRY')
          }
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

      <View style={styles.listDivider} />

      {entries.length > 0 ? (
        <Text style={styles.summaryLine}>
          TOTAL · {entries.length} NAPPIES
        </Text>
      ) : null}

      <View style={styles.stagedList}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateLabel}>NO NAPPIES LOGGED YET</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <View key={entry.id}>
              <View style={styles.stagedItemRow}>
                <View style={styles.stagedItemContent}>
                  <Text style={styles.accentTime}>{entry.time}</Text>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillLabel}>{entry.type}</Text>
                  </View>
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
