import {
  BottomSheetModal,
  BottomSheetBackdrop,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { IconFile, IconPhoto } from '@tabler/icons-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import type { DiaryEntry } from '@/types';
import { colorWithOpacity } from '@/utils/colorWithOpacity';
import { resolveDiaryMediaDisplay } from '@/utils/formatDiaryMedia';
import {
  color,
  font,
  fontSize,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import { sentenceCase } from '@/utils/sentenceCase';

export interface DiaryModuleProps {
  label: string;
  entries: DiaryEntry[];
}

export type { DiaryEntry };

const INLINE_MAX = 4;
const VIEW_ALL_BUTTON_HEIGHT = 40;
const CLOSE_BUTTON_SIZE = 32;
const ENTRY_THUMB_SIZE = 22;
const ENTRY_MEDIA_GLYPH_SIZE = 16;

interface HourGroup {
  hour: string;
  items: DiaryEntry[];
}

interface DiarySheetRef {
  present: () => void;
  dismiss: () => void;
}

function formatTimeHHMM(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:--';
  }

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

function formatHourLabel(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return '--:00';
  }

  return `${String(date.getHours()).padStart(2, '0')}:00`;
}

function sortEntriesNewestFirst(entries: DiaryEntry[]): DiaryEntry[] {
  return [...entries].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  );
}

function groupEntriesByHour(entries: DiaryEntry[]): HourGroup[] {
  const sorted = sortEntriesNewestFirst(entries);
  const groups: HourGroup[] = [];

  for (const entry of sorted) {
    const hour = formatHourLabel(entry.timestamp);
    const lastGroup = groups[groups.length - 1];

    if (lastGroup && lastGroup.hour === hour) {
      lastGroup.items.push(entry);
      continue;
    }

    groups.push({ hour, items: [entry] });
  }

  return groups;
}

interface EntryRowProps {
  entry: DiaryEntry;
  showSeparator?: boolean;
}

function EntryMediaGlyph({
  showImageThumbnail,
  mediaUri,
}: {
  showImageThumbnail: boolean;
  mediaUri?: string;
}) {
  const [thumbFailed, setThumbFailed] = useState(false);
  const Glyph = showImageThumbnail ? IconPhoto : IconFile;

  if (showImageThumbnail && mediaUri && !thumbFailed) {
    return (
      <Image
        source={{ uri: mediaUri }}
        style={styles.entryThumb}
        resizeMode="cover"
        onError={() => setThumbFailed(true)}
      />
    );
  }

  return (
    <Glyph color={color.accent} size={ENTRY_MEDIA_GLYPH_SIZE} strokeWidth={1.75} />
  );
}

function EntryRow({ entry, showSeparator = true }: EntryRowProps) {
  const { displayValue, mediaUri, showImageThumbnail } =
    resolveDiaryMediaDisplay(entry);
  const isMediaEntry = Boolean(mediaUri) || entry.type === 'photo';

  return (
    <View style={[styles.entryRow, showSeparator && styles.entryRowSeparator]}>
      <View style={styles.entryLeft}>
        <Text style={styles.entryTime}>{formatTimeHHMM(entry.timestamp)}</Text>
        <Text style={styles.entryDot}> · </Text>
        <Text style={styles.entryLabel} numberOfLines={1}>
          {sentenceCase(entry.label)}
        </Text>
      </View>
      {isMediaEntry ? (
        <View style={styles.entryValueMedia}>
          <EntryMediaGlyph
            showImageThumbnail={showImageThumbnail}
            mediaUri={mediaUri}
          />
          <Text style={styles.entryValue} numberOfLines={1}>
            {sentenceCase(displayValue)}
          </Text>
        </View>
      ) : (
        <Text style={styles.entryValue} numberOfLines={1}>
          {sentenceCase(displayValue)}
        </Text>
      )}
    </View>
  );
}

export default function DiaryModule({ label, entries }: DiaryModuleProps) {
  const sheetRef = useRef<DiarySheetRef>(null);
  const snapPoints = useMemo(() => ['60%', '90%'], []);
  const sortedEntries = useMemo(
    () => sortEntriesNewestFirst(entries),
    [entries],
  );
  const inlineEntries = useMemo(
    () => sortedEntries.slice(0, INLINE_MAX),
    [sortedEntries],
  );
  const hourGroups = useMemo(() => groupEntriesByHour(entries), [entries]);

  const openSheet = () => {
    sheetRef.current?.present();
  };

  const closeSheet = () => {
    sheetRef.current?.dismiss();
  };

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.65}
        style={[props.style, { backgroundColor: colorWithOpacity(color.bg, 0.65) }]}
      />
    ),
    [],
  );

  return (
    <>
      <View>
        <Text style={styles.sectionLabel}>{sentenceCase(label)}</Text>

        {entries.length === 0 ? (
          <Text style={styles.emptyLabel}>Nothing logged yet today. Log something above and it will appear here.</Text>
        ) : (
          <View style={styles.inlineList}>
            {inlineEntries.map((entry, index) => (
              <EntryRow
                key={entry.id}
                entry={entry}
                showSeparator={index < inlineEntries.length - 1}
              />
            ))}
          </View>
        )}

        {entries.length > INLINE_MAX ? (
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={openSheet}
            style={styles.viewAllButton}>
            <Text style={styles.viewAllLabel}>VIEW ALL</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <BottomSheetModal
        ref={sheetRef as never}
        snapPoints={snapPoints}
        enablePanDownToClose
        enableOverDrag
        enableHandlePanningGesture
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>ALL ENTRIES</Text>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={closeSheet}
            style={styles.closeButton}
            hitSlop={space.sm}>
            <Text style={styles.closeLabel}>×</Text>
          </TouchableOpacity>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={styles.sheetContent}
          showsVerticalScrollIndicator={false}>
          {hourGroups.map((group) => (
            <View key={group.hour}>
              <Text style={styles.hourDivider}>{group.hour}</Text>
              {group.items.map((entry, index) => (
                <EntryRow
                  key={entry.id}
                  entry={entry}
                  showSeparator={index < group.items.length - 1}
                />
              ))}
            </View>
          ))}
        </BottomSheetScrollView>
      </BottomSheetModal>
    </>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.headline,
    color: color.title,
    marginBottom: space.md,
  },
  emptyLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  inlineList: {
    marginBottom: space.sm,
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  entryRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  entryLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 0,
  },
  entryTime: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  entryDot: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  entryLabel: {
    flex: 1,
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
    color: color.text2,
  },
  entryValueMedia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 1,
    maxWidth: '52%',
    justifyContent: 'flex-end',
  },
  entryThumb: {
    width: ENTRY_THUMB_SIZE,
    height: ENTRY_THUMB_SIZE,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface2,
    flexShrink: 0,
  },
  entryValue: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
    color: color.accent,
    flexShrink: 1,
    maxWidth: '42%',
    textAlign: 'right',
  },
  viewAllButton: {
    width: '100%',
    height: VIEW_ALL_BUTTON_HEIGHT,
    marginTop: space.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.sm,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  sheetBackground: {
    backgroundColor: color.surface,
  },
  sheetHandle: {
    backgroundColor: color.border2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.lg,
    paddingBottom: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  sheetTitle: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  closeButton: {
    width: CLOSE_BUTTON_SIZE,
    height: CLOSE_BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text3,
    lineHeight: fontSize.headline,
  },
  sheetContent: {
    paddingHorizontal: space.lg,
    paddingBottom: space.xxl,
  },
  hourDivider: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoMicro,
    color: color.text3,
    marginTop: space.md,
    marginBottom: space.xs,
  },
});
