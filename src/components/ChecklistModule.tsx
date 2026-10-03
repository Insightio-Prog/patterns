import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import TimeBlockPicker from '@/components/TimeBlockPicker';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface ChecklistItem {
  id: string;
  label: string;
}

export interface ChecklistModuleProps {
  label: string;
  items: ChecklistItem[];
  onLog: (completed: string[]) => void;
  showTimePicker?: boolean;
}

const TOGGLE_SIZE = 24;
const TOGGLE_RADIUS = 6;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;
const CHECKMARK_FONT_SIZE = 14;

interface ChecklistRowProps {
  item: ChecklistItem;
  checked: boolean;
  showSeparator: boolean;
  onToggle: () => void;
}

function ChecklistRow({
  item,
  checked,
  showSeparator,
  onToggle,
}: ChecklistRowProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onToggle}
      style={[styles.row, showSeparator && styles.rowSeparator]}>
      <Text style={styles.rowLabel}>{item.label}</Text>
      <View style={[styles.toggle, checked && styles.toggleChecked]}>
        {checked ? <Text style={styles.checkmark}>✓</Text> : null}
      </View>
    </TouchableOpacity>
  );
}

export default function ChecklistModule({
  label,
  items,
  onLog,
  showTimePicker,
}: ChecklistModuleProps) {
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const visibleItems = items.filter((item) => !hiddenIds.has(item.id));
  const allItemsDone = items.length > 0 && visibleItems.length === 0;

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const toggleItem = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setCheckedIds((current) => {
      const next = new Set(current);

      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }

      return next;
    });
  };

  const handleLog = () => {
    if (checkedIds.size === 0 || loggedConfirm) {
      return;
    }

    const completed = items
      .filter((item) => checkedIds.has(item.id))
      .map((item) => item.id);

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(completed);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setHiddenIds((current) => {
        const next = new Set(current);
        completed.forEach((id) => next.add(id));
        return next;
      });
      setLoggedConfirm(false);
      setCheckedIds(new Set());
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    return `LOG · ${checkedIds.size} DONE`;
  };

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>

      <View style={styles.list}>
        {allItemsDone ? (
          <Text style={styles.allDoneLabel}>All done ✓</Text>
        ) : (
          visibleItems.map((item, index) => (
            <ChecklistRow
              key={item.id}
              item={item}
              checked={checkedIds.has(item.id)}
              showSeparator={index < visibleItems.length - 1}
              onToggle={() => toggleItem(item.id)}
            />
          ))
        )}
      </View>

      {showTimePicker ? (
        <TimeBlockPicker context="Logged at" onChange={() => {}} />
      ) : null}

      {checkedIds.size > 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLog}
          style={styles.logButton}>
          <Text style={styles.logButtonLabel}>{getLogLabel()}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    marginBottom: space.sm,
  },
  list: {
    width: '100%',
  },
  allDoneLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
  },
  rowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  rowLabel: {
    flex: 1,
    fontFamily: font.ui,
    fontSize: fontSize.body,
    color: color.text1,
    lineHeight: fontSize.body * 1.45,
  },
  toggle: {
    width: TOGGLE_SIZE,
    height: TOGGLE_SIZE,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: TOGGLE_RADIUS,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  toggleChecked: {
    backgroundColor: color.accent,
    borderColor: color.accent,
  },
  checkmark: {
    fontFamily: font.mono,
    fontSize: CHECKMARK_FONT_SIZE,
    color: color.accentInk,
    lineHeight: CHECKMARK_FONT_SIZE,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    marginTop: space.md,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.accent,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
});
