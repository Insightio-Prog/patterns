import * as Haptics from 'expo-haptics';

import { IconHeart, IconHeartFilled } from '@tabler/icons-react-native';

import { useEffect, useRef, useState } from 'react';

import {

  ScrollView,

  StyleSheet,

  Text,

  TextInput,

  TouchableOpacity,

  View,

} from 'react-native';



import QuantityInput from '@/components/QuantityInput';

import { saveCustomItem } from '@/storage/storage';

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



export interface QuickLogChipsProps {

  label: string;

  items: string[];

  onLog: (

    item: string,

    quantity?: { amount: string; unit: string },

    time?: string,

  ) => void;

  onItemSaved?: () => void;

  showTimePicker?: boolean;

  onTimeChange?: (time: string) => void;

  showQuantityInput?: boolean;

}



const MARKER_SIZE = 7;

const MARKER_RADIUS = 2;

const MARKER_MARGIN = 6;

const CHIP_PADDING_H = 10;

const CHIP_PADDING_V = 6;

const CHIP_LABEL_LETTER_SPACING = 0.8;

const INPUT_HEIGHT = 36;

const HEART_BUTTON_SIZE = 36;

const LOG_ENTRY_BUTTON_HEIGHT = 40;

const LOGGED_CONFIRM_MS = 1000;



export default function QuickLogChips({

  label,

  items,

  onLog,

  onItemSaved,

  showTimePicker,

  onTimeChange,

  showQuantityInput,

}: QuickLogChipsProps) {

  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  const [selectedQuantity, setSelectedQuantity] = useState<{

    amount: string;

    unit: string;

  } | null>(null);

  const [loggedConfirm, setLoggedConfirm] = useState(false);

  const [savedItem, setSavedItem] = useState<string | null>(null);

  const [otherExpanded, setOtherExpanded] = useState(false);

  const [otherText, setOtherText] = useState('');

  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    return () => {

      if (logConfirmTimeoutRef.current) {

        clearTimeout(logConfirmTimeoutRef.current);

      }

      if (savedTimeoutRef.current) {

        clearTimeout(savedTimeoutRef.current);

      }

    };

  }, []);



  const clearSavedTimeout = () => {

    if (savedTimeoutRef.current) {

      clearTimeout(savedTimeoutRef.current);

      savedTimeoutRef.current = null;

    }

  };



  const handleSelectChip = (item: string) => {

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);



    if (selectedItem === item) {

      setSelectedItem(null);

      setSelectedQuantity(null);

      setSelectedTime(null);

      return;

    }



    setSelectedItem(item);

    setSelectedQuantity(null);

    setSelectedTime(null);

  };



  const buildLogLabel = () => {
    if (!selectedItem) return '';

    const parts: string[] = ['LOG', selectedItem.toUpperCase()];

    if (selectedQuantity?.amount) {
      parts.push(selectedQuantity.amount + selectedQuantity.unit);
    }

    if (selectedTime) {
      parts.push(selectedTime);
    }

    return parts.join(' · ');
  };

  const handleLogEntry = () => {

    if (!selectedItem) {

      return;

    }



    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);



    onLog(

      selectedItem,

      selectedQuantity ?? undefined,

      selectedTime ?? undefined,

    );



    setLoggedConfirm(true);



    if (logConfirmTimeoutRef.current) {

      clearTimeout(logConfirmTimeoutRef.current);

    }



    logConfirmTimeoutRef.current = setTimeout(() => {

      setLoggedConfirm(false);

      setSelectedItem(null);

      setSelectedQuantity(null);

      setSelectedTime(null);

      logConfirmTimeoutRef.current = null;

    }, LOGGED_CONFIRM_MS);

  };



  const handleToggleOther = () => {

    setSelectedItem(null);

    setOtherExpanded((expanded) => !expanded);

  };



  const handleAddOther = () => {

    const trimmed = otherText.trim();

    if (!trimmed) {

      return;

    }



    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    setSelectedItem(trimmed);

    setSelectedQuantity(null);

    setSelectedTime(null);

    setOtherText('');

    setOtherExpanded(false);

  };



  const handleSaveHeart = async () => {

    const trimmed = otherText.trim();

    if (!trimmed) {

      return;

    }



    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    await saveCustomItem(trimmed);

    onItemSaved?.();



    clearSavedTimeout();

    setSavedItem(trimmed);

    savedTimeoutRef.current = setTimeout(() => {

      setSavedItem(null);

      setOtherText('');

      setOtherExpanded(false);

      savedTimeoutRef.current = null;

    }, LOGGED_CONFIRM_MS);

  };



  const isHeartSaved = savedItem !== null && otherText.trim() === savedItem;



  return (

    <View>

      <Text style={styles.sectionLabel}>{label}</Text>

      <ScrollView

        horizontal

        showsHorizontalScrollIndicator={false}

        contentContainerStyle={styles.chipRow}>

        {items.map((item) => {

          const isSelected = selectedItem === item;



          return (

            <TouchableOpacity

              key={item}

              activeOpacity={0.7}

              onPress={() => handleSelectChip(item)}

              style={[styles.chip, isSelected && styles.chipSelected]}>

              <View style={styles.marker} />

              <Text style={[styles.chipLabel, isSelected && styles.chipLabelSelected]}>

                {item}

              </Text>

            </TouchableOpacity>

          );

        })}

        <TouchableOpacity

          activeOpacity={0.7}

          onPress={handleToggleOther}

          style={styles.otherChip}>

          <Text style={styles.otherLabel}>+ OTHER</Text>

        </TouchableOpacity>

      </ScrollView>



      {otherExpanded ? (

        <View style={styles.otherRow}>

          <TextInput

            style={styles.otherInput}

            placeholder="Type item..."

            placeholderTextColor={color.text3}

            value={otherText}

            onChangeText={setOtherText}

          />

          <TouchableOpacity

            activeOpacity={0.7}

            onPress={handleAddOther}

            style={styles.addButton}>

            <Text style={styles.addButtonLabel}>ADD</Text>

          </TouchableOpacity>

          <TouchableOpacity

            activeOpacity={0.7}

            onPress={() => {

              void handleSaveHeart();

            }}

            style={[styles.heartButton, isHeartSaved && styles.heartButtonSaved]}>

            {isHeartSaved ? (

              <IconHeartFilled size={16} color={color.accentInk} />

            ) : (

              <IconHeart size={16} color={color.text1} strokeWidth={1.5} />

            )}

          </TouchableOpacity>

        </View>

      ) : null}



      {showQuantityInput && selectedItem ? (

        <QuantityInput

          key={selectedItem}

          context={selectedItem.toUpperCase() + ' — HOW MUCH?'}

          onChange={(q) => setSelectedQuantity(q)}

        />

      ) : null}



      {showTimePicker && selectedItem ? (

        <TimeBlockPicker

          context="Logged at"

          onChange={(time) => {

            setSelectedTime(time);

            onTimeChange?.(time);

          }}

        />

      ) : null}



      {selectedItem ? (

        <TouchableOpacity

          style={styles.logButton}

          activeOpacity={0.7}

          onPress={handleLogEntry}>

          <Text style={styles.logButtonLabel}>

            {loggedConfirm

              ? 'LOGGED ✓'

              : buildLogLabel()}

          </Text>

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

  chipRow: {

    paddingRight: space.lg,

  },

  chip: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: color.surface2,

    borderWidth: 1,

    borderColor: color.border,

    borderRadius: radius.md,

    paddingHorizontal: CHIP_PADDING_H,

    paddingVertical: CHIP_PADDING_V,

    marginRight: space.sm,

  },

  chipSelected: {

    backgroundColor: color.surface3,

    borderColor: color.accent,

    borderWidth: 1,

  },

  marker: {

    width: MARKER_SIZE,

    height: MARKER_SIZE,

    backgroundColor: color.accent,

    borderRadius: MARKER_RADIUS,

    marginRight: MARKER_MARGIN,

  },

  chipLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoData,

    color: color.text2,

    textTransform: 'uppercase',

    letterSpacing: CHIP_LABEL_LETTER_SPACING,

  },

  chipLabelSelected: {

    color: color.text1,

  },

  otherChip: {

    flexDirection: 'row',

    alignItems: 'center',

    backgroundColor: color.surface,

    borderWidth: 1,

    borderStyle: 'dashed',

    borderColor: color.border2,

    borderRadius: radius.md,

    paddingHorizontal: CHIP_PADDING_H,

    paddingVertical: CHIP_PADDING_V,

    marginRight: space.sm,

  },

  otherLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoData,

    color: color.text3,

    textTransform: 'uppercase',

    letterSpacing: CHIP_LABEL_LETTER_SPACING,

  },

  otherRow: {

    flexDirection: 'row',

    marginTop: space.sm,

    gap: space.sm,

  },

  otherInput: {

    flex: 1,

    height: INPUT_HEIGHT,

    backgroundColor: color.surface2,

    borderWidth: 1,

    borderColor: color.border,

    borderRadius: radius.md,

    paddingHorizontal: space.md,

    fontFamily: font.mono,

    fontSize: fontSize.monoData,

    color: color.text1,

  },

  addButton: {

    backgroundColor: color.accent,

    borderRadius: radius.md,

    paddingHorizontal: space.md,

    height: INPUT_HEIGHT,

    alignItems: 'center',

    justifyContent: 'center',

  },

  addButtonLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoLabel,

    color: color.accentInk,

    fontWeight: fontWeight.semibold,

    letterSpacing: CHIP_LABEL_LETTER_SPACING,

  },

  heartButton: {

    width: HEART_BUTTON_SIZE,

    height: HEART_BUTTON_SIZE,

    borderRadius: radius.md,

    backgroundColor: color.surface2,

    borderWidth: 1,

    borderColor: color.border,

    alignItems: 'center',

    justifyContent: 'center',

  },

  heartButtonSaved: {

    backgroundColor: color.accent,

    borderColor: color.accent,

  },

  logButton: {

    width: '100%',

    height: LOG_ENTRY_BUTTON_HEIGHT,

    marginTop: space.md,

    backgroundColor: color.accent,

    borderRadius: radius.md,

    alignItems: 'center',

    justifyContent: 'center',

  },

  logButtonLabel: {

    fontFamily: font.mono,

    fontSize: fontSize.monoLabel,

    color: color.accentInk,

    fontWeight: fontWeight.semibold,

    letterSpacing: letterSpacing.monoLabel,

    textTransform: 'uppercase',

  },

});


