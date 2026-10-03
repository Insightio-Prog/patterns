import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import ModuleRow, { filterRenderableRows } from '@/components/rows/ModuleRow';
import type {
  ModuleCardConfig,
  RowLogPayload,
  RowValue,
} from '@/types/rows';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface ModuleCardProps {
  config: ModuleCardConfig;
  onLog: (values: RowLogPayload[]) => void;
}

const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;

function getStagedCount(staged: Record<string, RowValue>): number {
  return Object.keys(staged).length;
}

function getLogLabel(count: number, logged: boolean): string {
  if (logged) {
    return 'Logged ✓';
  }

  if (count === 1) {
    return 'Log · 1 entry';
  }

  return `Log · ${count} entries`;
}

export default function ModuleCard({ config, onLog }: ModuleCardProps) {
  const [staged, setStaged] = useState<Record<string, RowValue>>({});
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const renderableRows = filterRenderableRows(config.rows);
  const stagedCount = getStagedCount(staged);
  const canLog = stagedCount > 0 && !loggedConfirm;

  useEffect(() => {
    return () => {
      if (confirmTimeoutRef.current) {
        clearTimeout(confirmTimeoutRef.current);
      }
    };
  }, []);

  const handleRowChange = (rowId: string, value: RowValue | null) => {
    setStaged((current) => {
      const next = { ...current };

      if (value === null) {
        delete next[rowId];
        return next;
      }

      next[rowId] = value;
      return next;
    });
  };

  const handleLog = () => {
    if (!canLog) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const payload: RowLogPayload[] = Object.entries(staged).map(
      ([rowId, value]) => ({
        rowId,
        value,
      }),
    );

    setLoggedConfirm(true);
    setStaged({});

    void Promise.resolve(onLog(payload)).catch(() => {
      // fail silently — never block or show error to user
    });

    if (confirmTimeoutRef.current) {
      clearTimeout(confirmTimeoutRef.current);
    }

    confirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      confirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{sentenceCase(config.title)}</Text>

      {renderableRows.map((row, index) => (
        <View
          key={row.id}
          style={[
            styles.rowBlock,
            index < renderableRows.length - 1 && styles.rowBlockDivider,
          ]}>
          <ModuleRow
            config={row}
            value={staged[row.id] ?? null}
            onChange={(value) => handleRowChange(row.id, value)}
            moduleId={config.id}
          />
        </View>
      ))}

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
          {getLogLabel(stagedCount, loggedConfirm)}
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
  },
  title: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.headline,
    color: color.title,
    marginBottom: space.sm,
  },
  rowBlock: {
    paddingVertical: space.lg,
  },
  rowBlockDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border2,
  },
  logButton: {
    width: '100%',
    height: LOG_BUTTON_HEIGHT,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.lg,
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
    fontFamily: font.uiSemiBold,
    fontSize: fontSize.rowLabel,
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
