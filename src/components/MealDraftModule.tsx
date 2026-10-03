import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal from '@/components/AppModal';
import { SafeAreaView } from 'react-native-safe-area-context';

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

export interface DraftItem {
  id: string;
  name: string;
  quantity: string;
  unit: string;
}

export interface MealDraftModuleProps {
  label: string;
  terminology?: string;
  enableBarcodeScanner?: boolean;
  enableManualEntry?: boolean;
  storageKey: string;
  onLog: (items: DraftItem[]) => void;
}

const UNIT_OPTIONS = ['g', 'ml', 'qty'] as const;
const ACTION_BUTTON_HEIGHT = 40;
const LOG_BUTTON_HEIGHT = 40;
const INPUT_HEIGHT = 36;
const CONFIRM_BUTTON_SIZE = 36;
const VIEWFINDER_WIDTH = 280;
const VIEWFINDER_HEIGHT = 180;
const CORNER_LENGTH = 18;
const CORNER_WIDTH = 2;
const LOGGED_CONFIRM_MS = 1000;
const DEFAULT_TERMINOLOGY = 'MEAL';

function stripMarkdown(text: string): string {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/(\*\*|__)(.*?)\1/g, '$2')
    .replace(/(\*|_)(.*?)\1/g, '$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^#+\s+/gm, '')
    .trim();
}

async function fetchProductName(barcode: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(barcode)}.json`,
    );

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      status?: number;
      product?: {
        product_name?: string;
        product_name_en?: string;
      };
    };

    if (data.status !== 1 || !data.product) {
      return null;
    }

    const rawName =
      data.product.product_name_en?.trim() ||
      data.product.product_name?.trim() ||
      '';

    if (!rawName) {
      return null;
    }

    return stripMarkdown(rawName);
  } catch {
    return null;
  }
}

interface DraftItemRowProps {
  item: DraftItem;
  showSeparator: boolean;
  isEditing: boolean;
  onStartEdit: () => void;
  onUpdate: (patch: Partial<Pick<DraftItem, 'quantity' | 'unit'>>) => void;
  onFinishEdit: () => void;
  onRemove: () => void;
}

function DraftItemRow({
  item,
  showSeparator,
  isEditing,
  onStartEdit,
  onUpdate,
  onFinishEdit,
  onRemove,
}: DraftItemRowProps) {
  const [editQuantity, setEditQuantity] = useState(item.quantity);

  useEffect(() => {
    if (isEditing) {
      setEditQuantity(item.quantity);
    }
  }, [isEditing, item.quantity]);

  const handleQuantityChange = (text: string) => {
    const digits = text.replace(/[^\d.]/g, '');
    setEditQuantity(digits);
    onUpdate({ quantity: digits });
  };

  return (
    <View style={[styles.draftRow, showSeparator && styles.draftRowSeparator]}>
      <Text style={styles.draftName} numberOfLines={1}>
        {item.name}
      </Text>

      {isEditing ? (
        <View style={styles.editQtyRow}>
          <TextInput
            style={styles.qtyInput}
            value={editQuantity}
            onChangeText={handleQuantityChange}
            onBlur={onFinishEdit}
            keyboardType="decimal-pad"
            placeholder="0"
            placeholderTextColor={color.text3}
            autoFocus
          />
          <View style={styles.unitPillRow}>
            {UNIT_OPTIONS.map((unitOption) => {
              const isSelected = item.unit === unitOption;

              return (
                <TouchableOpacity
                  key={unitOption}
                  activeOpacity={0.7}
                  onPress={() => onUpdate({ unit: unitOption })}
                  style={[
                    styles.unitPill,
                    isSelected && styles.unitPillSelected,
                  ]}>
                  <Text
                    style={[
                      styles.unitPillLabel,
                      isSelected && styles.unitPillLabelSelected,
                    ]}>
                    {unitOption}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      ) : (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onStartEdit}
          style={styles.qtyTouchable}>
          <Text style={styles.draftQty}>
            {item.quantity} {item.unit}
          </Text>
        </TouchableOpacity>
      )}

      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onRemove}
        style={styles.removeButton}
        hitSlop={space.xs}>
        <Text style={styles.removeLabel}>×</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MealDraftModule({
  label,
  terminology,
  enableBarcodeScanner = true,
  enableManualEntry = true,
  storageKey,
  onLog,
}: MealDraftModuleProps) {
  const logTerminology = (terminology ?? DEFAULT_TERMINOLOGY).toUpperCase();
  const [items, setItems] = useState<DraftItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualQuantity, setManualQuantity] = useState('');
  const [manualUnit, setManualUnit] = useState<string>('g');
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [scanLocked, setScanLocked] = useState(false);
  const [barcodeNotice, setBarcodeNotice] = useState<string | null>(null);
  const [cameraNotice, setCameraNotice] = useState(false);
  const [loggedConfirm, setLoggedConfirm] = useState(false);
  const logConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();

  const persistDraft = useCallback(async (draft: DraftItem[]) => {
    try {
      await AsyncStorage.setItem(storageKey, JSON.stringify(draft));
    } catch {
      // fail silently
    }
  }, [storageKey]);

  const clearDraftStorage = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(storageKey);
    } catch {
      // fail silently
    }
  }, [storageKey]);

  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const raw = await AsyncStorage.getItem(storageKey);

        if (raw) {
          const parsed = JSON.parse(raw) as unknown;

          if (Array.isArray(parsed)) {
            setItems(
              parsed.filter(
                (entry): entry is DraftItem =>
                  typeof entry === 'object' &&
                  entry !== null &&
                  typeof (entry as DraftItem).id === 'string' &&
                  typeof (entry as DraftItem).name === 'string' &&
                  typeof (entry as DraftItem).quantity === 'string' &&
                  typeof (entry as DraftItem).unit === 'string',
              ),
            );
          }
        }
      } catch {
        // fail silently
      } finally {
        setHydrated(true);
      }
    };

    void restoreDraft();
  }, [storageKey]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    void persistDraft(items);
  }, [hydrated, items, persistDraft]);

  useEffect(() => {
    return () => {
      if (logConfirmTimeoutRef.current) {
        clearTimeout(logConfirmTimeoutRef.current);
      }
    };
  }, []);

  const addItem = (item: Omit<DraftItem, 'id'>) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBarcodeNotice(null);
    setItems((current) => [
      ...current,
      { ...item, id: generateId() },
    ]);
  };

  const removeItem = (id: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setItems((current) => current.filter((entry) => entry.id !== id));

    if (editingItemId === id) {
      setEditingItemId(null);
    }
  };

  const updateItem = (id: string, patch: Partial<Pick<DraftItem, 'quantity' | 'unit'>>) => {
    setItems((current) =>
      current.map((entry) =>
        entry.id === id ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const resetManualEntry = () => {
    setManualName('');
    setManualQuantity('');
    setManualUnit('g');
    setShowManualEntry(false);
  };

  const handleConfirmManual = () => {
    const name = manualName.trim();

    if (!name) {
      return;
    }

    addItem({
      name,
      quantity: manualQuantity.trim() || '1',
      unit: manualUnit,
    });
    resetManualEntry();
  };

  const handleOpenScanner = async () => {
    setBarcodeNotice(null);
    setCameraNotice(false);

    if (!cameraPermission?.granted) {
      const result = await requestCameraPermission();

      if (!result?.granted) {
        setCameraNotice(true);
        return;
      }
    }

    setScanLocked(false);
    setScannerVisible(true);
  };

  const handleBarcodeScanned = async ({ data }: { data: string }) => {
    if (scanLocked || !data) {
      return;
    }

    setScanLocked(true);

    const productName = await fetchProductName(data);

    if (!productName) {
      setScannerVisible(false);
      setScanLocked(false);
      setBarcodeNotice('Product not found — add manually');
      return;
    }

    addItem({
      name: productName,
      quantity: '1',
      unit: 'qty',
    });
    setScannerVisible(false);
    setScanLocked(false);
  };

  const handleLog = () => {
    if (items.length === 0 || loggedConfirm) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onLog(items);
    setLoggedConfirm(true);

    if (logConfirmTimeoutRef.current) {
      clearTimeout(logConfirmTimeoutRef.current);
    }

    logConfirmTimeoutRef.current = setTimeout(() => {
      setLoggedConfirm(false);
      setItems([]);
      setEditingItemId(null);
      void clearDraftStorage();
      logConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getLogLabel = () => {
    if (loggedConfirm) {
      return 'LOGGED ✓';
    }

    return `LOG · ${items.length} · ${logTerminology}`;
  };

  const showAddRow = enableBarcodeScanner || enableManualEntry;

  return (
    <View>
      <Text style={styles.sectionLabel}>{label}</Text>

      {showAddRow ? (
        <View style={styles.actionRow}>
          {enableBarcodeScanner ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                void handleOpenScanner();
              }}
              style={[
                styles.actionButton,
                !enableManualEntry && styles.actionButtonFull,
              ]}>
              <Text style={styles.actionLabel}>SCAN</Text>
            </TouchableOpacity>
          ) : null}

          {enableManualEntry ? (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => {
                setShowManualEntry((current) => !current);
                setBarcodeNotice(null);
              }}
              style={[
                styles.actionButton,
                !enableBarcodeScanner && styles.actionButtonFull,
              ]}>
              <Text style={styles.actionLabel}>ADD MANUALLY</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {cameraNotice ? (
        <Text style={styles.inlineNotice}>
          Camera access needed — check Settings to scan barcodes
        </Text>
      ) : null}

      {barcodeNotice ? (
        <Text style={styles.inlineNotice}>{barcodeNotice}</Text>
      ) : null}

      {showManualEntry && enableManualEntry ? (
        <View style={styles.manualRow}>
          <TextInput
            style={styles.nameInput}
            value={manualName}
            onChangeText={setManualName}
            placeholder="Item name"
            placeholderTextColor={color.text3}
          />
          <TextInput
            style={styles.qtyInputInline}
            value={manualQuantity}
            onChangeText={(text) => setManualQuantity(text.replace(/[^\d.]/g, ''))}
            keyboardType="decimal-pad"
            placeholder="Qty"
            placeholderTextColor={color.text3}
          />
          <View style={styles.unitPillRow}>
            {UNIT_OPTIONS.map((unitOption) => {
              const isSelected = manualUnit === unitOption;

              return (
                <TouchableOpacity
                  key={unitOption}
                  activeOpacity={0.7}
                  onPress={() => setManualUnit(unitOption)}
                  style={[
                    styles.unitPill,
                    isSelected && styles.unitPillSelected,
                  ]}>
                  <Text
                    style={[
                      styles.unitPillLabel,
                      isSelected && styles.unitPillLabelSelected,
                    ]}>
                    {unitOption}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleConfirmManual}
            style={styles.confirmButton}>
            <Text style={styles.confirmLabel}>+</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.draftList}>
        {items.length === 0 ? (
          <View style={styles.emptyPlaceholder}>
            <Text style={styles.emptyPlaceholderLabel}>No items yet</Text>
          </View>
        ) : (
          items.map((item, index) => (
            <DraftItemRow
              key={item.id}
              item={item}
              showSeparator={index < items.length - 1}
              isEditing={editingItemId === item.id}
              onStartEdit={() => setEditingItemId(item.id)}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onFinishEdit={() => setEditingItemId(null)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}
      </View>

      {items.length > 0 ? (
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleLog}
          style={styles.logButton}>
          <Text style={styles.logButtonLabel}>{getLogLabel()}</Text>
        </TouchableOpacity>
      ) : null}

      <Modal
        visible={scannerVisible}
        animationType="slide"
        onRequestClose={() => {
          setScannerVisible(false);
          setScanLocked(false);
        }}>
        <SafeAreaView style={styles.scannerSafeArea}>
          <View style={styles.scannerBody}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              onBarcodeScanned={scanLocked ? undefined : handleBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: [
                  'ean13',
                  'ean8',
                  'upc_a',
                  'upc_e',
                  'code128',
                  'code39',
                  'qr',
                ],
              }}
            />

            <View style={styles.scannerOverlay} pointerEvents="box-none">
              <View style={styles.viewfinder}>
                <View style={[styles.corner, styles.cornerTopLeft]} />
                <View style={[styles.corner, styles.cornerTopRight]} />
                <View style={[styles.corner, styles.cornerBottomLeft]} />
                <View style={[styles.corner, styles.cornerBottomRight]} />
              </View>

              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => {
                  setScannerVisible(false);
                  setScanLocked(false);
                }}
                style={styles.cancelButton}>
                <Text style={styles.cancelLabel}>CANCEL</Text>
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
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
  actionRow: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
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
  actionButtonFull: {
    flex: 1,
  },
  actionLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
  inlineNotice: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
    marginBottom: space.sm,
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
    flexWrap: 'wrap',
  },
  nameInput: {
    flex: 1,
    minWidth: 120,
    height: INPUT_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text1,
  },
  qtyInputInline: {
    width: 56,
    height: INPUT_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    paddingHorizontal: space.sm,
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text1,
    textAlign: 'center',
  },
  unitPillRow: {
    flexDirection: 'row',
    gap: space.xs,
  },
  unitPill: {
    height: INPUT_HEIGHT,
    paddingHorizontal: space.sm,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitPillSelected: {
    borderColor: color.accent,
    backgroundColor: color.surface3,
  },
  unitPillLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text2,
    textTransform: 'uppercase',
  },
  unitPillLabelSelected: {
    color: color.accent,
  },
  confirmButton: {
    width: CONFIRM_BUTTON_SIZE,
    height: CONFIRM_BUTTON_SIZE,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.accentInk,
    fontWeight: fontWeight.semibold,
    lineHeight: fontSize.headline,
  },
  draftList: {
    marginTop: space.xs,
  },
  emptyPlaceholder: {
    height: ACTION_BUTTON_HEIGHT,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.surface,
  },
  emptyPlaceholderLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
    textTransform: 'uppercase',
  },
  draftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingVertical: space.sm,
  },
  draftRowSeparator: {
    borderBottomWidth: 1,
    borderBottomColor: color.border,
  },
  draftName: {
    flex: 1,
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text1,
    minWidth: 0,
  },
  qtyTouchable: {
    flexShrink: 0,
  },
  draftQty: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textTransform: 'uppercase',
  },
  editQtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flexShrink: 1,
  },
  qtyInput: {
    width: 48,
    height: INPUT_HEIGHT,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.accent,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textAlign: 'center',
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  removeLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.headline,
    color: color.text3,
    lineHeight: fontSize.headline,
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
  scannerSafeArea: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scannerBody: {
    flex: 1,
    backgroundColor: color.bg,
  },
  scannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  viewfinder: {
    width: VIEWFINDER_WIDTH,
    height: VIEWFINDER_HEIGHT,
    borderWidth: 1,
    borderColor: color.accent,
    backgroundColor: 'transparent',
  },
  corner: {
    position: 'absolute',
    width: CORNER_LENGTH,
    height: CORNER_LENGTH,
    borderColor: color.accent,
  },
  cornerTopLeft: {
    top: -1,
    left: -1,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerTopRight: {
    top: -1,
    right: -1,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cornerBottomLeft: {
    bottom: -1,
    left: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
  },
  cornerBottomRight: {
    bottom: -1,
    right: -1,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
  },
  cancelButton: {
    marginTop: space.xl,
    height: ACTION_BUTTON_HEIGHT,
    paddingHorizontal: space.xl,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    textTransform: 'uppercase',
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
  },
});
