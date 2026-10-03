import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import {
  copyAsync,
  deleteAsync,
  documentDirectory,
  getInfoAsync,
  makeDirectoryAsync,
  readDirectoryAsync,
} from 'expo-file-system/legacy';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from '@/components/AppModal';

import { generateId } from '@/utils/generateId';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface PhotoLogProps {
  label: string;
  storageKey: string;
  onLog: (photoUri: string) => void;
}

type PermissionNotice = 'camera' | 'gallery' | null;

const THUMB_SIZE = 72;
const MAX_VISIBLE = 4;
const ACTION_BUTTON_HEIGHT = 36;
const DELETE_BUTTON_SIZE = 22;
const PLACEHOLDER_FONT_SIZE = 24;
const LOG_BUTTON_HEIGHT = 40;
const LOGGED_CONFIRM_MS = 1000;
const STAGED_DIR_NAME = 'staged';

function getPhotoExtension(uri: string): string {
  const match = uri.match(/\.(jpe?g|png|heic|webp)$/i);
  return match ? match[0].toLowerCase() : '.jpg';
}

function getFileName(uri: string): string {
  const parts = uri.split('/');
  return parts[parts.length - 1] ?? uri;
}

export default function PhotoLog({ label, storageKey, onLog }: PhotoLogProps) {
  const [loggedPhotos, setLoggedPhotos] = useState<string[]>([]);
  const [stagedPhotos, setStagedPhotos] = useState<string[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [permissionNotice, setPermissionNotice] = useState<PermissionNotice>(null);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getStorageDir = useCallback(() => {
    if (!documentDirectory) {
      return null;
    }

    return `${documentDirectory}${storageKey}/`;
  }, [storageKey]);

  const getStagingDir = useCallback(() => {
    const dir = getStorageDir();
    if (!dir) {
      return null;
    }

    return `${dir}${STAGED_DIR_NAME}/`;
  }, [getStorageDir]);

  const loadDirectoryPhotos = useCallback(async (dir: string) => {
    const dirInfo = await getInfoAsync(dir);
    if (!dirInfo.exists) {
      return [] as string[];
    }

    const files = await readDirectoryAsync(dir);
    const imageFiles = files.filter((file) =>
      /\.(jpe?g|png|heic|webp)$/i.test(file),
    );

    const withTimes = await Promise.all(
      imageFiles.map(async (file) => {
        const uri = `${dir}${file}`;
        try {
          const info = await getInfoAsync(uri);
          return {
            uri,
            time: info.exists && info.modificationTime ? info.modificationTime : 0,
          };
        } catch {
          return { uri, time: 0 };
        }
      }),
    );

    withTimes.sort((a, b) => a.time - b.time);
    return withTimes.map((item) => item.uri);
  }, []);

  const loadPhotos = useCallback(async () => {
    try {
      const dir = getStorageDir();
      if (!dir) {
        return;
      }

      const stagingDir = getStagingDir();
      const [logged, staged] = await Promise.all([
        loadDirectoryPhotos(dir),
        stagingDir ? loadDirectoryPhotos(stagingDir) : Promise.resolve([]),
      ]);

      setLoggedPhotos(logged);
      setStagedPhotos(staged);
    } catch {
      // fail silently
    }
  }, [getStorageDir, getStagingDir, loadDirectoryPhotos]);

  useEffect(() => {
    void loadPhotos();
  }, [loadPhotos]);

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const ensureDir = async (dir: string | null): Promise<string | null> => {
    try {
      if (!dir) {
        return null;
      }

      const dirInfo = await getInfoAsync(dir);
      if (!dirInfo.exists) {
        await makeDirectoryAsync(dir, { intermediates: true });
      }

      return dir;
    } catch {
      return null;
    }
  };

  const persistPhoto = async (
    sourceUri: string,
    targetDir: string | null,
  ): Promise<string | null> => {
    try {
      const dir = await ensureDir(targetDir);
      if (!dir) {
        return null;
      }

      const extension = getPhotoExtension(sourceUri);
      const destUri = `${dir}${generateId()}${extension}`;
      await copyAsync({ from: sourceUri, to: destUri });
      return destUri;
    } catch {
      return null;
    }
  };

  const handlePhotoResult = async (result: ImagePicker.ImagePickerResult) => {
    if (result.canceled || !result.assets?.[0]?.uri) {
      return;
    }

    const localUri = await persistPhoto(result.assets[0].uri, getStagingDir());
    if (!localUri) {
      return;
    }

    setStagedPhotos((current) => [...current, localUri]);
    setPermissionNotice(null);
  };

  const handleCamera = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setPermissionNotice('camera');
        return;
      }

      setPermissionNotice(null);
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      await handlePhotoResult(result);
    } catch {
      // fail silently
    }
  };

  const handleGallery = async () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPermissionNotice('gallery');
        return;
      }

      setPermissionNotice(null);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });
      await handlePhotoResult(result);
    } catch {
      // fail silently
    }
  };

  const handleDelete = async (uri: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await deleteAsync(uri, { idempotent: true });
    } catch {
      // fail silently
    }

    setLoggedPhotos((current) => current.filter((photo) => photo !== uri));
    setStagedPhotos((current) => current.filter((photo) => photo !== uri));

    if (previewUri === uri) {
      setPreviewUri(null);
    }
  };

  const handleLog = async () => {
    if (stagedPhotos.length === 0) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const mainDir = await ensureDir(getStorageDir());
    const committed: string[] = [];

    if (mainDir) {
      for (const uri of stagedPhotos) {
        try {
          onLog(uri);
          const fileName = getFileName(uri);
          const destUri = `${mainDir}${fileName}`;
          await copyAsync({ from: uri, to: destUri });
          await deleteAsync(uri, { idempotent: true });
          committed.push(destUri);
        } catch {
          // fail silently per photo
        }
      }
    }

    if (committed.length > 0) {
      setLoggedPhotos((current) => [...current, ...committed]);
    }

    setStagedPhotos([]);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    const count = stagedPhotos.length;
    return count === 1 ? 'LOG · 1 PHOTO' : `LOG · ${count} PHOTOS`;
  };

  const visibleLoggedPhotos =
    loggedPhotos.length > MAX_VISIBLE
      ? loggedPhotos.slice(-MAX_VISIBLE)
      : loggedPhotos;

  const displayPhotos = [...visibleLoggedPhotos, ...stagedPhotos];

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>

      <View style={styles.thumbRow}>
        {displayPhotos.length === 0 ? (
          <View style={styles.placeholder}>
            <Text style={styles.placeholderGlyph}>+</Text>
          </View>
        ) : (
          displayPhotos.map((uri) => (
            <View key={uri} style={styles.thumbWrap}>
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => setPreviewUri(uri)}
                style={styles.thumbButton}>
                <Image source={{ uri }} style={styles.thumb} resizeMode="cover" />
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  void handleDelete(uri);
                }}
                style={styles.deleteButton}
                hitSlop={space.xs}>
                <Text style={styles.deleteLabel}>×</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            void handleCamera();
          }}
          style={styles.actionButton}>
          <Text style={styles.actionLabel}>CAMERA</Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            void handleGallery();
          }}
          style={styles.actionButton}>
          <Text style={styles.actionLabel}>GALLERY</Text>
        </TouchableOpacity>
      </View>

      {stagedPhotos.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => {
            void handleLog();
          }}
          style={styles.logButton}>
          <Text style={styles.logButtonLabel}>{getLogLabel()}</Text>
        </TouchableOpacity>
      ) : null}

      {permissionNotice === 'camera' ? (
        <Text style={styles.permissionNotice}>
          Camera access needed — check Settings
        </Text>
      ) : null}
      {permissionNotice === 'gallery' ? (
        <Text style={styles.permissionNotice}>
          Photo library access needed — check Settings
        </Text>
      ) : null}

      <Modal
        visible={previewUri !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewUri(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPreviewUri(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            {previewUri ? (
              <Image
                source={{ uri: previewUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setPreviewUri(null)}
              style={styles.closeButton}>
              <Text style={styles.closeLabel}>CLOSE</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
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
  thumbRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.sm,
    marginBottom: space.md,
  },
  thumbWrap: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
  },
  thumbButton: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border,
    overflow: 'hidden',
  },
  thumb: {
    width: '100%',
    height: '100%',
  },
  deleteButton: {
    position: 'absolute',
    top: -space.xs,
    right: -space.xs,
    width: DELETE_BUTTON_SIZE,
    height: DELETE_BUTTON_SIZE,
    borderRadius: DELETE_BUTTON_SIZE / 2,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.monoLabel,
    marginTop: -1,
  },
  placeholder: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  placeholderGlyph: {
    fontFamily: font.mono,
    fontSize: PLACEHOLDER_FONT_SIZE,
    color: color.text3,
  },
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
  },
  actionButton: {
    flex: 1,
    height: ACTION_BUTTON_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
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
  permissionNotice: {
    marginTop: space.sm,
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: color.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.lg,
  },
  modalContent: {
    width: '100%',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
  closeButton: {
    marginTop: space.lg,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
  },
  closeLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text2,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
  },
});
