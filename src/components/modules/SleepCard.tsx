import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import {
  babyCardStyles as styles,
  calculateDurationMinutes,
  formatDuration,
  getCurrentTimeHHMM,
  LOGGED_CONFIRM_MS,
  RemoveButton,
  SelectChips,
  TimeSplitInput,
} from '@/components/modules/babyCardShared';
import type { SleepEntry } from '@/types/baby';
import { generateId } from '@/utils/generateId';
import { space } from '@/theme/theme';

const FORM_ROW_SPACING = space.md;

const sleepFormStyles = StyleSheet.create({
  timeFieldsSection: {
    marginTop: FORM_ROW_SPACING,
    marginBottom: FORM_ROW_SPACING,
  },
});

export interface SleepCardProps {
  title: string;
  onLog?: (entries: SleepEntry[]) => void;
}

function formatSleepSummary(entry: SleepEntry): string {
  if (!entry.endTime) {
    return 'IN PROGRESS';
  }

  if (entry.durationMins !== undefined) {
    return formatDuration(entry.durationMins);
  }

  return '';
}

export default function SleepCard({ title, onLog }: SleepCardProps) {
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [sleepType, setSleepType] = useState<'NAP' | 'NIGHT'>('NAP');
  const [startTime, setStartTime] = useState(getCurrentTimeHHMM);
  const [endTime, setEndTime] = useState('');

  const canLog = entries.length > 0 && !loggedConfirm;
  const canAdd = startTime.length > 0;

  const derivedDuration =
    startTime && endTime
      ? calculateDurationMinutes(startTime, endTime)
      : null;

  const totalSleepMins = entries.reduce((total, entry) => {
    if (entry.durationMins !== undefined) {
      return total + entry.durationMins;
    }

    return total;
  }, 0);

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const resetForm = () => {
    setSleepType('NAP');
    setStartTime(getCurrentTimeHHMM());
    setEndTime('');
  };

  const handleAdd = () => {
    if (!canAdd) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const entry: SleepEntry = {
      id: generateId(),
      type: sleepType,
      startTime,
      ...(endTime ? { endTime } : {}),
      ...(startTime && endTime
        ? { durationMins: calculateDurationMinutes(startTime, endTime) }
        : {}),
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
      return 'LOG · 1 SESSION';
    }

    return `LOG · ${entries.length} SESSIONS`;
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.formSection}>
        <SelectChips
          label="TYPE"
          options={['NAP', 'NIGHT']}
          value={sleepType}
          onChange={(value) => setSleepType(value as 'NAP' | 'NIGHT')}
        />

        <View style={[sleepFormStyles.timeFieldsSection, styles.formRow]}>
          <TimeSplitInput
            label="START TIME"
            value={startTime}
            onChange={setStartTime}
          />
          <TimeSplitInput
            label="END TIME"
            value={endTime}
            onChange={setEndTime}
          />
        </View>

        {derivedDuration !== null ? (
          <Text style={styles.derivedDuration}>
            {formatDuration(derivedDuration)}
          </Text>
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

      {entries.length > 0 ? (
        <Text style={styles.summaryLine}>
          TOTAL · {formatDuration(totalSleepMins)}
        </Text>
      ) : null}

      <View style={styles.stagedList}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateLabel}>NO SLEEP LOGGED YET</Text>
          </View>
        ) : (
          entries.map((entry, index) => (
            <View key={entry.id}>
              <View style={styles.stagedItemRow}>
                <View style={styles.stagedItemContent}>
                  <View style={styles.typePill}>
                    <Text style={styles.typePillLabel}>{entry.type}</Text>
                  </View>
                  <Text style={styles.accentTime}>{entry.startTime}</Text>
                  {entry.endTime ? (
                    <Text style={styles.summaryText}>
                      {formatSleepSummary(entry)}
                    </Text>
                  ) : (
                    <Text style={styles.inProgressText}>IN PROGRESS</Text>
                  )}
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
