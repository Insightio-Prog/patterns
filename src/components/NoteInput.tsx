import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import TimeBlockPicker from '@/components/TimeBlockPicker';
import { sentenceCase } from '@/utils/sentenceCase';

export interface NoteInputProps {
  label?: string;
  onSave: (note: string) => void;
  showTimePicker?: boolean;
  onTimeChange?: (time: string) => void;
}

const COLLAPSED_HEIGHT = 40;
const GLYPH_FONT_SIZE = 16;
const INPUT_MIN_HEIGHT = 80;
const ACTION_BUTTON_HEIGHT = 32;
const SAVED_CONFIRM_MS = 1000;

export default function NoteInput({
  label = 'Add note',
  onSave,
  showTimePicker,
  onTimeChange,
}: NoteInputProps) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState('');
  const [saved, setSaved] = useState(false);
  const [loggedTime, setLoggedTime] = useState<string | null>(null);
  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (savedTimeoutRef.current) {
        clearTimeout(savedTimeoutRef.current);
      }
    };
  }, []);

  const handleCancel = () => {
    setText('');
    setExpanded(false);
    setSaved(false);
  };

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSave(trimmed);
    setSaved(true);

    if (savedTimeoutRef.current) {
      clearTimeout(savedTimeoutRef.current);
    }

    savedTimeoutRef.current = setTimeout(() => {
      setText('');
      setExpanded(false);
      setSaved(false);
      savedTimeoutRef.current = null;
    }, SAVED_CONFIRM_MS);
  };

  if (!expanded) {
    return (
      <View>
        <TouchableOpacity
          activeOpacity={0.6}
          onPress={() => setExpanded(true)}
          style={styles.collapsedButton}>
          <Text style={styles.glyph}>+</Text>
          <Text style={styles.collapsedLabel}>{sentenceCase(label)}</Text>
        </TouchableOpacity>
        {showTimePicker && (
          <TimeBlockPicker
            context="Logged at"
            onChange={(time) => {
              setLoggedTime(time);
              onTimeChange?.(time);
            }}
          />
        )}
      </View>
    );
  }

  return (
    <View>
      <TextInput
        style={styles.input}
        placeholder="Write a note..."
        placeholderTextColor={color.text3}
        value={text}
        onChangeText={setText}
        multiline
        textAlignVertical="top"
        autoFocus
      />
      <View style={styles.actionsRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleCancel}
          style={styles.cancelButton}>
          <Text style={styles.cancelLabel}>CANCEL</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSave}
          style={styles.saveButton}>
          <Text style={styles.saveLabel}>{saved ? 'SAVED ✓' : 'SAVE'}</Text>
        </TouchableOpacity>
      </View>
      {showTimePicker && (
        <TimeBlockPicker
          context="Logged at"
          onChange={(time) => {
            setLoggedTime(time);
            onTimeChange?.(time);
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  collapsedButton: {
    width: '100%',
    height: COLLAPSED_HEIGHT,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.md,
    backgroundColor: 'transparent',
  },
  glyph: {
    fontFamily: font.mono,
    fontSize: GLYPH_FONT_SIZE,
    color: color.accent,
    marginRight: space.xs,
  },
  collapsedLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    color: color.text2,
  },
  input: {
    width: '100%',
    minHeight: INPUT_MIN_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.md,
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text1,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: space.sm,
    gap: space.sm,
  },
  cancelButton: {
    paddingHorizontal: space.md,
    height: ACTION_BUTTON_HEIGHT,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text2,
    letterSpacing: letterSpacing.monoLabel,
  },
  saveButton: {
    paddingHorizontal: space.md,
    height: ACTION_BUTTON_HEIGHT,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.monoLabel,
  },
});
