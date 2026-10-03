import type { DiaryEntry } from '@/types';
import { humanizeVariableName } from '@/utils/humanizeVariableName';

const GENERIC_MEDIA_LABELS = new Set(['photo log', 'photo', 'photos', 'file log', 'file']);

export function isMediaUri(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  return (
    /^(file|content|ph|assets-library):\/\//i.test(trimmed) ||
    /^\/data\//i.test(trimmed)
  );
}

export function isImageUri(uri: string): boolean {
  return /\.(jpe?g|png|heic|webp|gif|bmp)$/i.test(uri);
}

export function formatMediaDiaryLabel(label: string, uri?: string): string {
  const isImage = !uri || isImageUri(uri);
  const noun = isImage ? 'Photo' : 'File';
  const trimmed = label.trim();

  if (!trimmed) {
    return `${noun} added`;
  }

  const normalized = trimmed.toLowerCase().replace(/_/g, ' ');

  if (GENERIC_MEDIA_LABELS.has(normalized)) {
    return `${noun} added`;
  }

  const friendly = humanizeVariableName(trimmed);
  return `${friendly} added`;
}

export interface DiaryMediaDisplay {
  displayValue: string;
  mediaUri?: string;
  showImageThumbnail: boolean;
}

export function resolveDiaryMediaDisplay(entry: DiaryEntry): DiaryMediaDisplay {
  const mediaUri =
    entry.mediaUri ??
    (isMediaUri(entry.value) ? entry.value : undefined);

  if (!mediaUri && entry.type !== 'photo') {
    return {
      displayValue: entry.value,
      showImageThumbnail: false,
    };
  }

  if (mediaUri) {
    const legacyUriInValue = !entry.mediaUri && isMediaUri(entry.value);

    return {
      displayValue: legacyUriInValue
        ? formatMediaDiaryLabel(entry.label, mediaUri)
        : entry.value,
      mediaUri,
      showImageThumbnail: isImageUri(mediaUri),
    };
  }

  return {
    displayValue: formatMediaDiaryLabel(entry.label),
    showImageThumbnail: false,
  };
}
