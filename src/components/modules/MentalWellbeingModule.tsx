import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import ModuleRow from '@/components/rows/ModuleRow';
import { rowStyles } from '@/components/rows/rowStyles';
import { generateId } from '@/utils/generateId';
import type {
  ChipsRowConfig,
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
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

export interface MentalWellbeingModuleProps {
  showMood?: boolean;
  showAnxiety?: boolean;
  showDepression?: boolean;
  showEnergy?: boolean;
  showSleep?: boolean;
  showGratitude?: boolean;
  showGratitudeNote?: boolean;
  showTriggers?: boolean;
  showActivities?: boolean;
  showMedication?: boolean;
  showSocialInteraction?: boolean;
  showScreenTime?: boolean;
  showOutdoorTime?: boolean;
  showAlcohol?: boolean;
  showCaffeine?: boolean;
  showCrisis?: boolean;

  gratitudeOptions?: string[];
  triggerOptions?: string[];
  activityOptions?: string[];
  medicationOptions?: string[];
  crisisLabel?: string;

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_ROW_ORDER = [
  'mood',
  'anxiety',
  'depression',
  'energy',
  'sleep',
  'gratitude',
  'triggers',
  'activities',
  'medication',
  'socialInteraction',
  'screenTime',
  'outdoorTime',
  'alcohol',
  'caffeine',
  'crisis',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const GRATITUDE_NOTE_PLACEHOLDER = 'WHAT ARE YOU GRATEFUL FOR TODAY?';
const GRATITUDE_NOTE_MAX_LENGTH = 300;
const LOG_BUTTON_HEIGHT = 44;
const LOGGED_CONFIRM_MS = 1000;

type OrderedItem =
  | { kind: 'standard'; row: RowConfig }
  | {
      kind: 'gratitude';
      chipsConfig: ChipsRowConfig | null;
      showNote: boolean;
    };

function buildStandardRows(
  props: MentalWellbeingModuleProps,
): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showMood) {
    rows.set('mood', {
      id: 'mood',
      type: 'scale',
      label: 'MOOD TODAY',
      max: 5,
    });
  }

  if (props.showAnxiety) {
    rows.set('anxiety', {
      id: 'anxiety',
      type: 'scale',
      label: 'ANXIETY LEVEL',
      max: 5,
    });
  }

  if (props.showDepression) {
    rows.set('depression', {
      id: 'depression',
      type: 'scale',
      label: 'LOW MOOD LEVEL',
      max: 5,
    });
  }

  if (props.showEnergy) {
    rows.set('energy', {
      id: 'energy',
      type: 'level',
      label: 'ENERGY TODAY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showSleep) {
    rows.set('sleep', {
      id: 'sleep',
      type: 'level',
      label: 'SLEEP LAST NIGHT',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showTriggers) {
    rows.set('triggers', {
      id: 'triggers',
      type: 'chips',
      label: 'TRIGGERS TODAY',
      options: props.triggerOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showActivities) {
    rows.set('activities', {
      id: 'activities',
      type: 'chips',
      label: 'POSITIVE ACTIVITIES',
      options: props.activityOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showMedication) {
    rows.set('medication', {
      id: 'medication',
      type: 'chips',
      label: 'MEDICATION TAKEN',
      options: props.medicationOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showSocialInteraction) {
    rows.set('socialInteraction', {
      id: 'socialInteraction',
      type: 'level',
      label: 'SOCIAL INTERACTION',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showScreenTime) {
    rows.set('screenTime', {
      id: 'screenTime',
      type: 'counter',
      label: 'SCREEN TIME',
      unitLabel: 'HRS',
    });
  }

  if (props.showOutdoorTime) {
    rows.set('outdoorTime', {
      id: 'outdoorTime',
      type: 'counter',
      label: 'OUTDOOR TIME',
      unitLabel: 'MINS',
    });
  }

  if (props.showAlcohol) {
    rows.set('alcohol', {
      id: 'alcohol',
      type: 'counter',
      label: 'ALCOHOL',
      unitLabel: 'UNITS',
    });
  }

  if (props.showCaffeine) {
    rows.set('caffeine', {
      id: 'caffeine',
      type: 'counter',
      label: 'CAFFEINE',
      unitLabel: 'CUPS',
    });
  }

  if (props.showCrisis) {
    rows.set('crisis', {
      id: 'crisis',
      type: 'toggle',
      label: props.crisisLabel ?? 'DIFFICULT DAY?',
    });
  }

  return rows;
}

function buildGratitudeChipsConfig(
  props: MentalWellbeingModuleProps,
): ChipsRowConfig {
  return {
    id: 'gratitude',
    type: 'chips',
    label: 'GRATEFUL FOR TODAY',
    options: props.gratitudeOptions ?? [],
    wrap: true,
    multi: true,
  };
}

function buildOrderedItems(props: MentalWellbeingModuleProps): OrderedItem[] {
  const standardRows = buildStandardRows(props);
  const items: OrderedItem[] = [];
  const seen = new Set<string>();
  const order = props.rowOrder ?? [...DEFAULT_ROW_ORDER];

  const appendGratitude = () => {
    if (seen.has('gratitude')) {
      return;
    }

    if (!props.showGratitude && !props.showGratitudeNote) {
      return;
    }

    items.push({
      kind: 'gratitude',
      chipsConfig: props.showGratitude ? buildGratitudeChipsConfig(props) : null,
      showNote: !!props.showGratitudeNote,
    });
    seen.add('gratitude');
  };

  for (const rowId of order) {
    if (rowId === 'gratitude') {
      appendGratitude();
      continue;
    }

    const row = standardRows.get(rowId);
    if (row) {
      items.push({ kind: 'standard', row });
      seen.add(rowId);
    }
  }

  for (const rowId of DEFAULT_ROW_ORDER) {
    if (seen.has(rowId)) {
      continue;
    }

    if (rowId === 'gratitude') {
      appendGratitude();
      continue;
    }

    const row = standardRows.get(rowId);
    if (row) {
      items.push({ kind: 'standard', row });
    }
  }

  return items;
}

function buildModuleConfig(props: MentalWellbeingModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'wellbeing';
  const title = props.title ?? 'WELLBEING TODAY';

  return {
    id: moduleId,
    title,
    rows: [],
  };
}

function getStagedCount(
  staged: Record<string, RowValue>,
  gratitudeNote: string,
): number {
  const noteCount = gratitudeNote.trim().length > 0 ? 1 : 0;
  return Object.keys(staged).length + noteCount;
}

function getLogLabel(count: number, logged: boolean): string {
  if (logged) {
    return 'LOGGED ✓';
  }

  if (count === 1) {
    return 'LOG · 1 ENTRY';
  }

  return `LOG · ${count} ENTRIES`;
}

interface GratitudeNoteInputProps {
  value: string;
  onChange: (text: string) => void;
}

function GratitudeNoteInput({ value, onChange }: GratitudeNoteInputProps) {
  const showCount = value.length > 0;

  return (
    <View style={styles.gratitudeNoteWrap}>
      <TextInput
        multiline
        maxLength={GRATITUDE_NOTE_MAX_LENGTH}
        placeholder={GRATITUDE_NOTE_PLACEHOLDER}
        placeholderTextColor={color.text3}
        style={[
          styles.gratitudeNoteInput,
          value.length === 0 && styles.gratitudeNoteInputPlaceholder,
        ]}
        value={value}
        onChangeText={onChange}
      />
      {showCount ? (
        <Text style={styles.gratitudeNoteCount}>
          {value.length}/{GRATITUDE_NOTE_MAX_LENGTH}
        </Text>
      ) : null}
    </View>
  );
}

interface WellbeingModuleCardProps {
  config: ModuleCardConfig;
  items: OrderedItem[];
  onLog: (entries: RowBatchLogEntry[]) => void;
}

function WellbeingModuleCard({
  config,
  items,
  onLog,
}: WellbeingModuleCardProps) {
  const [staged, setStaged] = useState<Record<string, RowValue>>({});
  const [gratitudeNote, setGratitudeNote] = useState('');
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const confirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stagedCount = getStagedCount(staged, gratitudeNote);
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

    const ts = new Date().toISOString();
    const payload: RowLogPayload[] = Object.entries(staged).map(
      ([rowId, value]) => ({
        rowId,
        value,
      }),
    );

    const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
      id: generateId(),
      rowId,
      moduleId: config.id,
      type: value.type,
      value,
      ts,
    }));

    const trimmedNote = gratitudeNote.trim();
    if (trimmedNote.length > 0) {
      entries.push({
        id: generateId(),
        rowId: 'gratitudeNote',
        moduleId: config.id,
        type: 'note',
        value: { type: 'note', value: trimmedNote },
        ts,
      });
    }

    setLoggedConfirm(true);
    setStaged({});
    setGratitudeNote('');

    void Promise.resolve(onLog(entries)).catch(() => {
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
      <Text style={styles.title}>{config.title}</Text>

      {items.map((item, index) => (
        <View
          key={
            item.kind === 'gratitude'
              ? 'gratitude'
              : item.row.id
          }
          style={[
            styles.rowBlock,
            index < items.length - 1 && styles.rowBlockDivider,
          ]}>
          {item.kind === 'standard' ? (
            <ModuleRow
              config={item.row}
              value={staged[item.row.id] ?? null}
              onChange={(value) => handleRowChange(item.row.id, value)}
              moduleId={config.id}
            />
          ) : (
            <View>
              {item.chipsConfig ? (
                <ModuleRow
                  config={item.chipsConfig}
                  value={staged.gratitude ?? null}
                  onChange={(value) => handleRowChange('gratitude', value)}
                  moduleId={config.id}
                />
              ) : (
                <Text style={rowStyles.rowLabel}>GRATEFUL FOR TODAY</Text>
              )}
              {item.showNote ? (
                <GratitudeNoteInput
                  value={gratitudeNote}
                  onChange={setGratitudeNote}
                />
              ) : null}
            </View>
          )}
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
            canLog
              ? styles.logButtonLabelActive
              : styles.logButtonLabelDisabled,
            loggedConfirm && styles.logButtonLabelLogged,
          ]}>
          {getLogLabel(stagedCount, loggedConfirm)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function hasEnabledRows(props: MentalWellbeingModuleProps): boolean {
  return buildOrderedItems(props).length > 0;
}

export default function MentalWellbeingModule(props: MentalWellbeingModuleProps) {
  const { onLog } = props;

  if (!hasEnabledRows(props)) {
    return null;
  }

  const config = buildModuleConfig(props);
  const items = buildOrderedItems(props);

  const handleLog = (entries: RowBatchLogEntry[]) => {
    void Promise.resolve(onLog?.(entries)).catch(() => {
      // fail silently
    });
  };

  return (
    <WellbeingModuleCard config={config} items={items} onLog={handleLog} />
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
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.lg,
  },
  rowBlock: {
    paddingVertical: space.lg,
  },
  rowBlockDivider: {
    borderBottomWidth: 1,
    borderBottomColor: color.border2,
  },
  gratitudeNoteWrap: {
    marginTop: space.sm,
  },
  gratitudeNoteInput: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    minHeight: 80,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    fontFamily: font.mono,
    fontSize: 13,
    color: color.text1,
    textAlignVertical: 'top',
  },
  gratitudeNoteInputPlaceholder: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
  },
  gratitudeNoteCount: {
    marginTop: space.xs,
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    textAlign: 'right',
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
