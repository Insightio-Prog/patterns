import {
  BottomSheetBackdrop,
  BottomSheetModal,
  BottomSheetScrollView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import {
  IconArrowsMove,
  IconCamera,
  IconChartBar,
  IconChartDots,
  IconChecklist,
  IconChevronLeft,
  IconClock,
  IconGripVertical,
  IconHash,
  IconLayoutColumns,
  IconLayoutGrid,
  IconLayoutRows,
  IconPencil,
  IconLock,
  IconLeaf,
  IconNumbers,
  IconPlayerPlay,
  IconPlus,
  IconScale,
  IconTags,
  IconToggleRight,
  IconToolsKitchen2,
  IconTrash,
  IconX,
} from '@tabler/icons-react-native';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Modal, { useAppWidth } from '@/components/AppModal';
import DraggableFlatList, {
  ScaleDecorator,
  type RenderItemParams,
} from 'react-native-draggable-flatlist';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import type { CustomRowSpec } from '@/components/modules/CustomModule';
import {
  getTrackerConfig,
  saveTrackerConfig,
  setOnboardingComplete,
} from '@/storage/storage';
import type { TrackerConfig, ModuleType } from '@/types';
import { generateId } from '@/utils/generateId';
import { colorWithOpacity } from '@/utils/colorWithOpacity';
import {
  color,
  font,
  fontSize,
  fontWeight,
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';
import { getModulePage } from '@/utils/modulePages';
import { sentenceCase } from '@/utils/sentenceCase';

const MAX_ROWS = 10;
const MAX_STANDALONES = 6;
const INPUT_FONT_SIZE = 16;
const OPTION_INPUT_FONT_SIZE = 15;
const ICON_BOX_SIZE = 32;
const ICON_BOX_RADIUS = 6;
const ADD_OPTION_BUTTON_SIZE = 44;
const OPTION_MARKER_SIZE = 6;

type Cadence = 'daily' | 'every3days' | 'weekly' | 'off';
type LabelModalMode =
  | 'create-row'
  | 'rename-row'
  | 'rename-card'
  | 'create-card'
  | 'rename-tracker';
type OptionsRowType = 'chips' | 'checklist';

interface BuilderCard {
  id: string;
  title: string;
  rows: CustomRowSpec[];
}

const TYPE_DISPLAY_NAMES: Record<CustomRowSpec['type'], string> = {
  scale: 'Severity scale',
  level: 'Low / Normal / High',
  toggle: 'Yes / No',
  chips: 'Pick from a list',
  counter: 'Counter',
  metric: 'Recorded value',
  checklist: 'Checklist',
  timeInput: 'Time',
};

const CADENCE_LABELS: Record<Cadence, string> = {
  daily: 'DAILY',
  every3days: 'EVERY 3 DAYS',
  weekly: 'WEEKLY',
  off: 'OFF',
};

const ROW_TYPE_OPTIONS: {
  type: CustomRowSpec['type'];
  label: string;
  sublabel: string;
  Icon: typeof IconChartBar;
}[] = [
  {
    type: 'scale',
    label: 'Severity scale',
    sublabel: 'Rate something 1 to 5 or 1 to 10.',
    Icon: IconChartBar,
  },
  {
    type: 'level',
    label: 'Low / Normal / High',
    sublabel: 'Three-level rating with custom labels.',
    Icon: IconLayoutRows,
  },
  {
    type: 'toggle',
    label: 'Yes / No',
    sublabel: 'A simple boolean — did this happen?',
    Icon: IconToggleRight,
  },
  {
    type: 'chips',
    label: 'Pick from a list',
    sublabel: "Chips the user selects from. You'll add the options next.",
    Icon: IconTags,
  },
  {
    type: 'counter',
    label: 'Count something',
    sublabel: 'Tap + to tally episodes, cups, units.',
    Icon: IconHash,
  },
  {
    type: 'metric',
    label: 'Recorded value',
    sublabel: 'A number the user types in — points, weight, distance.',
    Icon: IconNumbers,
  },
  {
    type: 'checklist',
    label: 'Checklist',
    sublabel: "Tick off items from a list. You'll add the items next.",
    Icon: IconChecklist,
  },
  {
    type: 'timeInput',
    label: 'Time',
    sublabel: 'Log a specific time — bedtime, wake time, dose time.',
    Icon: IconClock,
  },
];

type StandaloneModuleKind =
  | 'meal'
  | 'photo'
  | 'timer'
  | 'weight'
  | 'environment'
  | 'correlation';

interface StandaloneModuleSpec {
  id: string;
  type: StandaloneModuleKind;
  label: string;
  /** Original props when editing an existing tracker, so nothing is reset. */
  props?: Record<string, unknown>;
}

/** A module the builder can't edit (e.g. the AI's Symptoms card): kept as-is. */
interface KeptModule {
  id: string;
  module: TrackerConfig['modules'][number];
}

const KEPT_MODULE_LABELS: Record<string, string> = {
  medical: 'SYMPTOMS & MEDICATION',
  mentalWellbeing: 'MIND & MOOD',
  sleep: 'SLEEP',
  fitness: 'FITNESS',
  social: 'SOCIAL',
  baby: 'BABY',
  plant: 'PLANT',
  metrics: 'METRICS',
  hobbies: 'HOBBIES',
  mealdraft: 'MEAL DRAFT',
};

function showsInText(page: { title: string } | null): string {
  return page ? `Shows in the ${page.title} tab` : 'Shows below the tabs';
}

function standaloneShowsIn(standalone: StandaloneModuleSpec): string {
  const runtimeType = mapStandaloneRuntimeType(standalone.type);

  if (runtimeType === 'correlationChart') {
    return showsInText(null);
  }

  return showsInText(
    getModulePage(
      { type: runtimeType, props: standalone.props ?? {} } as TrackerConfig['modules'][number],
      0,
    ),
  );
}

function keptModuleTitle(module: KeptModule['module']): string {
  const props = (module.props ?? {}) as Record<string, unknown>;

  if (typeof props.label === 'string' && props.label.trim()) {
    return props.label.trim().toUpperCase();
  }

  return (
    KEPT_MODULE_LABELS[module.type] ??
    String(module.type).replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase()
  );
}

const STANDALONE_TYPE_LABELS: Record<StandaloneModuleKind, string> = {
  meal: 'MEAL & FOOD LOG',
  photo: 'PHOTO LOG',
  timer: 'TIMER',
  weight: 'WEIGHT TRACKER',
  environment: 'ENVIRONMENT',
  correlation: 'CORRELATION CHART',
};

const STANDALONE_DESCRIPTIONS: Record<StandaloneModuleKind, string> = {
  meal: 'Log meals and track ingredients.',
  photo: 'Capture visual evidence over time.',
  timer: 'Track sessions and durations.',
  weight: 'Record and chart a measured value.',
  environment: 'Log environmental factors and conditions.',
  correlation: 'Chart how one input affects an output.',
};

const STANDALONE_PLACEHOLDERS: Record<StandaloneModuleKind, string> = {
  meal: 'e.g. Food diary, Meal log...',
  photo: 'e.g. Photo evidence, Skin log...',
  timer: 'e.g. Session timer, Focus time...',
  weight: 'e.g. Weight, Blood pressure...',
  environment: 'e.g. Environment, Conditions...',
  correlation: 'e.g. Food vs Symptoms...',
};

const STANDALONE_ICONS: Record<StandaloneModuleKind, typeof IconToolsKitchen2> = {
  meal: IconToolsKitchen2,
  photo: IconCamera,
  timer: IconPlayerPlay,
  weight: IconScale,
  environment: IconLeaf,
  correlation: IconChartDots,
};

const MODULE_OPTIONS: {
  type: StandaloneModuleKind;
  label: string;
  sublabel: string;
  Icon: typeof IconToolsKitchen2;
}[] = [
  {
    type: 'meal',
    label: 'Meal & food log',
    sublabel: STANDALONE_DESCRIPTIONS.meal,
    Icon: IconToolsKitchen2,
  },
  {
    type: 'photo',
    label: 'Photo log',
    sublabel: STANDALONE_DESCRIPTIONS.photo,
    Icon: IconCamera,
  },
  {
    type: 'timer',
    label: 'Timer',
    sublabel: STANDALONE_DESCRIPTIONS.timer,
    Icon: IconPlayerPlay,
  },
  {
    type: 'weight',
    label: 'Weight tracker',
    sublabel: STANDALONE_DESCRIPTIONS.weight,
    Icon: IconScale,
  },
  {
    type: 'environment',
    label: 'Environment',
    sublabel: STANDALONE_DESCRIPTIONS.environment,
    Icon: IconLeaf,
  },
  {
    type: 'correlation',
    label: 'Correlation chart',
    sublabel: STANDALONE_DESCRIPTIONS.correlation,
    Icon: IconChartDots,
  },
];

const MANUAL_TRACKER_PREFIX = 'Manual tracker: ';

const STANDALONE_RUNTIME_TYPES = new Set<ModuleType>([
  'food',
  'photo',
  'timer',
  'weight',
  'environmentExtended',
  'correlationChart',
]);

function mapStandaloneRuntimeType(type: StandaloneModuleKind): ModuleType {
  switch (type) {
    case 'meal':
      return 'food';
    case 'photo':
      return 'photo';
    case 'timer':
      return 'timer';
    case 'weight':
      return 'weight';
    case 'environment':
      return 'environmentExtended';
    case 'correlation':
      return 'correlationChart';
    default:
      return 'photo';
  }
}

function mapRuntimeToStandaloneType(type: ModuleType): StandaloneModuleKind | null {
  switch (type) {
    case 'food':
      return 'meal';
    case 'photo':
      return 'photo';
    case 'timer':
      return 'timer';
    case 'weight':
      return 'weight';
    case 'environmentExtended':
      return 'environment';
    case 'correlationChart':
      return 'correlation';
    default:
      return null;
  }
}

function parseTrackerNameFromGoal(trackingGoal: string): string {
  if (trackingGoal.startsWith(MANUAL_TRACKER_PREFIX)) {
    const stripped = trackingGoal.slice(MANUAL_TRACKER_PREFIX.length).trim();
    return stripped || 'My Tracker';
  }

  return trackingGoal.trim() || 'My Tracker';
}

function isCustomRowSpec(value: unknown): value is CustomRowSpec {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;
  return (
    typeof record.id === 'string' &&
    typeof record.type === 'string' &&
    typeof record.label === 'string'
  );
}

function reconstructFromConfig(config: TrackerConfig): {
  trackerName: string;
  subject: string;
  cadence: Cadence;
  cards: BuilderCard[];
  standalones: StandaloneModuleSpec[];
  kept: KeptModule[];
} {
  const customModules = config.modules.filter((module) => module.type === 'custom');
  const parsedTrackerName = parseTrackerNameFromGoal(config.trackingGoal ?? 'My Tracker');

  let cards: BuilderCard[];

  if (customModules.length > 0) {
    cards = customModules.map((module) => {
      const props = module.props as Record<string, unknown>;
      const title = typeof props.title === 'string' ? props.title : parsedTrackerName;
      const rows = Array.isArray(props.rows)
        ? props.rows.filter(isCustomRowSpec)
        : [];

      return {
        id: generateId(),
        title,
        rows,
      };
    });
  } else {
    cards = [{ id: generateId(), title: parsedTrackerName, rows: [] }];
  }

  const standalones: StandaloneModuleSpec[] = config.modules
    .filter((module) => STANDALONE_RUNTIME_TYPES.has(module.type))
    .map((module) => {
      const standaloneType = mapRuntimeToStandaloneType(module.type);

      if (!standaloneType) {
        return null;
      }

      const props = module.props as Record<string, unknown>;
      const label = typeof props.label === 'string' ? props.label : '';

      const spec: StandaloneModuleSpec = {
        id: generateId(),
        type: standaloneType,
        label,
        props,
      };

      return spec;
    })
    .filter((item): item is StandaloneModuleSpec => item !== null);

  const kept: KeptModule[] = config.modules
    .filter(
      (module) =>
        module.type !== 'custom' &&
        module.type !== 'note' &&
        module.type !== 'diary' &&
        !STANDALONE_RUNTIME_TYPES.has(module.type),
    )
    .map((module) => ({ id: generateId(), module }));

  const cadence =
    typeof (config as TrackerConfig & { aiCadence?: string }).aiCadence === 'string' &&
    (config as TrackerConfig & { aiCadence?: string }).aiCadence! in CADENCE_LABELS
      ? ((config as TrackerConfig & { aiCadence?: string }).aiCadence as Cadence)
      : 'off';

  return {
    trackerName: config.name?.trim() || parseTrackerNameFromGoal(config.trackingGoal ?? 'My Tracker'),
    subject: config.terminology?.subject ?? config.subject ?? '',
    cadence,
    cards,
    standalones,
    kept,
  };
}

function buildStandaloneProps(
  type: StandaloneModuleKind,
  label: string,
): Record<string, unknown> {
  switch (type) {
    case 'meal':
      return { label, showMealLog: true };
    case 'photo':
      return { label };
    case 'timer':
      return { label };
    case 'weight':
      return { label };
    case 'environment':
      return { label, showFactors: true };
    case 'correlation':
      return {
        label,
        input: 'input',
        output: 'output',
        inputLabel: 'Input',
        outputLabel: 'Output',
      };
    default:
      return { label };
  }
}

function isNonEmpty(value: string): boolean {
  return value.trim().length > 0;
}

function needsOptionsEditor(type: CustomRowSpec['type']): type is OptionsRowType {
  return type === 'chips' || type === 'checklist';
}

function formatRowCount(count: number): string {
  return count === 1 ? '1 ROW' : `${count} ROWS`;
}

function formatCadence(value: string | undefined): string {
  if (!value) {
    return '—';
  }

  return CADENCE_LABELS[value as Cadence] ?? value.toUpperCase();
}

function formatOptionsPreview(options: string[] | undefined): string | null {
  if (!options || options.length === 0) {
    return null;
  }

  if (options.length <= 3) {
    return options.join(', ');
  }

  const preview = options.slice(0, 3).join(', ');
  return `${preview}, + ${options.length - 3} more`;
}

function createRowFromType(
  type: CustomRowSpec['type'],
  label: string,
): CustomRowSpec {
  const id = generateId();

  switch (type) {
    case 'scale':
      return { id, label, type: 'scale', max: 10 };
    case 'level':
      return {
        id,
        label,
        type: 'level',
        options: ['LOW', 'NORMAL', 'HIGH'],
      };
    case 'toggle':
      return { id, label, type: 'toggle' };
    case 'counter':
      return { id, label, type: 'counter' };
    case 'metric':
      return { id, label, type: 'metric', unit: '' };
    case 'timeInput':
      return { id, label, type: 'timeInput' };
    default:
      return { id, label, type: 'timeInput' };
  }
}

function createOptionsRow(
  type: OptionsRowType,
  label: string,
  options: string[],
  existingId?: string,
): CustomRowSpec {
  const id = existingId ?? generateId();

  if (type === 'chips') {
    return { id, label, type: 'chips', options, multi: true };
  }

  return { id, label, type: 'checklist', options };
}

function buildTrackerConfig(
  name: string,
  subject: string,
  cards: BuilderCard[],
  standalones: StandaloneModuleSpec[],
  base?: TrackerConfig | null,
  kept: KeptModule[] = [],
  renamed = false,
): TrackerConfig {
  const customModules = cards
    .filter((card) => card.rows.length > 0)
    .map((card) => ({
      type: 'custom' as const,
      props: {
        title: card.title,
        rows: card.rows,
        moduleId: `builder_custom_${card.id}`,
      },
    }));

  const modules = [
    ...kept.map((item) => item.module),
    ...standalones.map((standalone) => ({
      type: mapStandaloneRuntimeType(standalone.type),
      props: standalone.props ?? buildStandaloneProps(standalone.type, standalone.label),
    })),
    ...customModules,
    { type: 'note', props: {} },
    { type: 'diary', props: {} },
  ] as TrackerConfig['modules'];

  if (base) {
    // Editing an existing tracker: keep everything we don't own (terminology,
    // eventRows, AI context, goal...) and only change what the builder edits.
    return {
      ...base,
      subject,
      ...(renamed ? { name } : {}),
      terminology: { ...base.terminology, subject } as TrackerConfig['terminology'],
      modules,
    };
  }

  return {
    profile: 'custom',
    subject,
    trackingGoal: `Manual tracker: ${name}`,
    terminology: {
      subject,
      event: 'log',
      mealDraft: 'MEAL',
      timerSession: 'SESSION',
      pdfRecipient: 'GP',
    },
    modules,
    aiContext: 'Manual tracker created by user.',
  };
}

interface LabelModalProps {
  visible: boolean;
  value: string;
  title: string;
  placeholder: string;
  confirmLabel: string;
  onChange: (text: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  width: number;
}

function LabelModal({
  visible,
  value,
  title,
  placeholder,
  confirmLabel,
  onChange,
  onCancel,
  onConfirm,
  width,
}: LabelModalProps) {
  const canConfirm = isNonEmpty(value);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable
          style={[styles.modalCard, { width: width * 0.85 }]}
          onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>{title}</Text>

          <TextInput
            style={styles.modalInput}
            value={value}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={color.text3}
            autoFocus
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={() => {
              if (canConfirm) {
                onConfirm();
              }
            }}
          />

          <View style={styles.modalActions}>
            <Pressable onPress={onCancel} style={styles.modalCancelButton}>
              <Text style={styles.modalCancelLabel}>CANCEL</Text>
            </Pressable>
            <Pressable
              disabled={!canConfirm}
              onPress={onConfirm}
              style={[styles.modalConfirmButton, !canConfirm && styles.modalConfirmDisabled]}>
              <Text
                style={[
                  styles.modalConfirmLabel,
                  !canConfirm && styles.modalConfirmLabelDisabled,
                ]}>
                {confirmLabel}
              </Text>
            </Pressable>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface OptionsEditorModalProps {
  visible: boolean;
  rowType: OptionsRowType;
  label: string;
  initialOptions: string[];
  onCancel: () => void;
  onDone: (options: string[]) => void;
}

function OptionsEditorModal({
  visible,
  rowType,
  label,
  initialOptions,
  onCancel,
  onDone,
}: OptionsEditorModalProps) {
  const [options, setOptions] = useState<string[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setOptions(initialOptions);
      setInputValue('');
      setInputFocused(false);
    }
  }, [visible, initialOptions]);

  const canAdd = isNonEmpty(inputValue);
  const canDone = options.length > 0;

  const addOption = () => {
    const trimmed = inputValue.trim();

    if (!trimmed) {
      return;
    }

    const isDuplicate = options.some(
      (option) => option.toLowerCase() === trimmed.toLowerCase(),
    );

    if (isDuplicate) {
      return;
    }

    setOptions((current) => [...current, trimmed]);
    setInputValue('');
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  const removeOption = (index: number) => {
    setOptions((current) => current.filter((_, optionIndex) => optionIndex !== index));
  };

  const instruction =
    rowType === 'chips'
      ? 'Add the options your users will pick from.'
      : 'Add the items on your checklist.';

  const placeholder =
    rowType === 'chips'
      ? 'e.g. chicken, stress, exercise...'
      : 'e.g. Took medication, Drank water...';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onCancel}>
      <SafeAreaView style={styles.optionsScreen}>
        <View style={styles.optionsTopBar}>
          <Pressable onPress={onCancel} hitSlop={space.sm} style={styles.optionsTopSide}>
            <Text style={styles.optionsCancelLabel}>CANCEL</Text>
          </Pressable>

          <Text style={styles.optionsTitle}>ADD OPTIONS</Text>

          <Pressable
            disabled={!canDone}
            onPress={() => onDone(options)}
            hitSlop={space.sm}
            style={styles.optionsTopSide}>
            <Text style={[styles.optionsDoneLabel, !canDone && styles.optionsDoneDisabled]}>
              DONE
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.optionsContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <View style={styles.optionsContextPill}>
            <Text style={styles.optionsContextText}>
              <Text style={styles.optionsContextKey}>ROW · </Text>
              <Text style={styles.optionsContextValue}>{label}</Text>
            </Text>
          </View>

          <Text style={styles.optionsInstruction}>{instruction}</Text>

          <View style={styles.addOptionRow}>
            <TextInput
              ref={inputRef}
              style={[
                styles.optionInput,
                inputFocused && styles.optionInputFocused,
              ]}
              value={inputValue}
              onChangeText={setInputValue}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={placeholder}
              placeholderTextColor={color.text3}
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={addOption}
            />
            <Pressable
              disabled={!canAdd}
              onPress={addOption}
              style={[styles.addOptionButton, !canAdd && styles.addOptionButtonDisabled]}>
              <IconPlus
                size={18}
                color={canAdd ? color.accentInk : color.text3}
                strokeWidth={1.75}
              />
            </Pressable>
          </View>

          <Text style={styles.optionsListLabel}>OPTIONS · {options.length}</Text>

          {options.length === 0 ? (
            <Text style={styles.optionsEmpty}>No options added yet.</Text>
          ) : (
            <View>
              {options.map((option, index) => (
                <View key={`${option}-${index}`}>
                  {index > 0 ? <View style={styles.optionRowDivider} /> : null}
                  <View style={styles.optionRow}>
                    <View style={styles.optionMarker} />
                    <Text style={styles.optionLabel}>{option}</Text>
                    <Pressable
                      onPress={() => removeOption(index)}
                      hitSlop={space.sm}
                      style={styles.optionRemoveButton}>
                      <IconX size={16} color={color.text3} strokeWidth={1.5} />
                    </Pressable>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface CardPickerModalProps {
  visible: boolean;
  cards: BuilderCard[];
  sourceCardId: string;
  onCancel: () => void;
  onSelect: (destinationCardId: string) => void;
  width: number;
}

function CardPickerModal({
  visible,
  cards,
  sourceCardId,
  onCancel,
  onSelect,
  width,
}: CardPickerModalProps) {
  const destinations = cards.filter((card) => card.id !== sourceCardId);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={styles.modalOverlay} onPress={onCancel}>
        <Pressable
          style={[styles.modalCard, { width: width * 0.85 }]}
          onPress={(event) => event.stopPropagation()}>
          <Text style={styles.modalTitle}>MOVE TO CARD</Text>

          {destinations.map((card, index) => (
            <View key={card.id}>
              {index > 0 ? <View style={styles.pickerRowDivider} /> : null}
              <Pressable
                onPress={() => onSelect(card.id)}
                style={styles.pickerRow}>
                <Text style={styles.pickerRowTitle}>{card.title}</Text>
                <Text style={styles.pickerRowCount}>{formatRowCount(card.rows.length)}</Text>
              </Pressable>
            </View>
          ))}

          <Pressable onPress={onCancel} style={styles.pickerCancelRow}>
            <Text style={styles.pickerCancelLabel}>CANCEL</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export default function BuilderCanvasScreen() {
  const width = useAppWidth();
  const insets = useSafeAreaInsets();
  const { name, subject, cadence, mode } = useLocalSearchParams<{
    name?: string;
    subject?: string;
    cadence?: string;
    mode?: string;
  }>();

  const isEditMode = mode === 'edit';
  const buildTrackerName = typeof name === 'string' ? name : 'Untitled tracker';
  const buildSubject = typeof subject === 'string' ? subject : 'me';
  const buildCadence: Cadence =
    typeof cadence === 'string' && cadence in CADENCE_LABELS
      ? (cadence as Cadence)
      : 'off';

  const [isEditLoading, setIsEditLoading] = useState(isEditMode);
  const [trackerName, setTrackerName] = useState(() =>
    isEditMode ? '' : buildTrackerName,
  );
  const [trackerSubject, setTrackerSubject] = useState(() =>
    isEditMode ? '' : buildSubject,
  );
  const [displayCadence, setDisplayCadence] = useState<Cadence>(() =>
    isEditMode ? 'off' : buildCadence,
  );
  const [cards, setCards] = useState<BuilderCard[]>(() =>
    isEditMode
      ? []
      : [{ id: generateId(), title: buildTrackerName, rows: [] }],
  );
  const [standalones, setStandalones] = useState<StandaloneModuleSpec[]>([]);
  const [nameEdited, setNameEdited] = useState(false);
  const [baseConfig, setBaseConfig] = useState<TrackerConfig | null>(null);
  const [keptModules, setKeptModules] = useState<KeptModule[]>([]);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [pendingRowType, setPendingRowType] = useState<CustomRowSpec['type'] | null>(null);
  const [pendingStandaloneType, setPendingStandaloneType] =
    useState<StandaloneModuleKind | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [labelModalVisible, setLabelModalVisible] = useState(false);
  const [labelModalMode, setLabelModalMode] = useState<LabelModalMode>('create-row');
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  const [optionsEditorVisible, setOptionsEditorVisible] = useState(false);
  const [optionsEditorType, setOptionsEditorType] = useState<OptionsRowType | null>(null);
  const [optionsEditorLabel, setOptionsEditorLabel] = useState('');
  const [optionsEditorInitialOptions, setOptionsEditorInitialOptions] = useState<string[]>(
    [],
  );

  const [moveRowModalVisible, setMoveRowModalVisible] = useState(false);
  const [moveSourceCardId, setMoveSourceCardId] = useState<string | null>(null);
  const [moveRow, setMoveRow] = useState<CustomRowSpec | null>(null);
  const [hasEverDragged, setHasEverDragged] = useState(false);

  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const moduleSheetRef = useRef<BottomSheetModal>(null);
  const snapPoints = useMemo(() => ['55%'], []);
  const moduleSnapPoints = useMemo(() => ['65%'], []);

  const canSave =
    cards.some((card) => card.rows.length > 0) ||
    standalones.length > 0 ||
    keptModules.length > 0;
  const allModulesAdded = standalones.length >= MAX_STANDALONES;
  const canMoveRows = cards.length > 1;
  const showReorderHint =
    !hasEverDragged &&
    (cards.length > 1 || cards.some((card) => card.rows.length > 1));

  const markDragged = () => {
    setHasEverDragged(true);
  };

  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const loadEditConfig = async () => {
      try {
        const config = await getTrackerConfig();

        if (!config) {
          router.replace('/(tabs)/home' as Href);
          return;
        }

        const reconstructed = reconstructFromConfig(config);
        setTrackerName(reconstructed.trackerName);
        setTrackerSubject(reconstructed.subject);
        setDisplayCadence(reconstructed.cadence);
        setCards(reconstructed.cards);
        setStandalones(reconstructed.standalones);
        setKeptModules(reconstructed.kept);
        setBaseConfig(config);
      } catch {
        router.replace('/(tabs)/home' as Href);
      } finally {
        setIsEditLoading(false);
      }
    };

    void loadEditConfig();
  }, [isEditMode]);

  const isStandaloneAdded = useCallback(
    (type: StandaloneModuleKind) => standalones.some((item) => item.type === type),
    [standalones],
  );

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.65}
      />
    ),
    [],
  );

  const resetLabelFlow = () => {
    setLabelModalVisible(false);
    setLabelModalMode('create-row');
    setPendingRowType(null);
    setPendingStandaloneType(null);
    setLabelDraft('');
    setEditingRowId(null);
    setEditingCardId(null);
    setActiveCardId(null);
  };

  const resetOptionsEditorFlow = () => {
    setOptionsEditorVisible(false);
    setOptionsEditorType(null);
    setOptionsEditorLabel('');
    setOptionsEditorInitialOptions([]);
    setPendingRowType(null);
    setEditingRowId(null);
    setEditingCardId(null);
    setActiveCardId(null);
  };

  const openSheet = (cardId: string) => {
    const card = cards.find((item) => item.id === cardId);

    if (card && card.rows.length < MAX_ROWS) {
      setActiveCardId(cardId);
      bottomSheetRef.current?.present();
    }
  };

  const closeSheet = () => {
    bottomSheetRef.current?.dismiss();
  };

  const openModuleSheet = () => {
    if (!allModulesAdded) {
      moduleSheetRef.current?.present();
    }
  };

  const closeModuleSheet = () => {
    moduleSheetRef.current?.dismiss();
  };

  const handleBack = () => {
    if (isEditMode) {
      Alert.alert('Discard changes?', "Your edits won't be saved.", [
        { text: 'Keep editing', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => router.replace('/(tabs)/home' as Href),
        },
      ]);
      return;
    }

    Alert.alert('Discard tracker?', 'Your rows will be lost.', [
      { text: 'Keep building', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () => router.back(),
      },
    ]);
  };

  const handleTypeSelect = (type: CustomRowSpec['type']) => {
    closeSheet();
    setLabelModalMode('create-row');
    setEditingRowId(null);
    setEditingCardId(null);
    setPendingStandaloneType(null);
    setPendingRowType(type);
    setLabelDraft('');
    setLabelModalVisible(true);
  };

  const handleModuleSelect = (type: StandaloneModuleKind) => {
    if (isStandaloneAdded(type)) {
      return;
    }

    closeModuleSheet();
    setLabelModalMode('create-row');
    setEditingRowId(null);
    setEditingCardId(null);
    setPendingRowType(null);
    setPendingStandaloneType(type);
    setLabelDraft('');
    setLabelModalVisible(true);
  };

  const handleAddCard = () => {
    setLabelModalMode('create-card');
    setEditingRowId(null);
    setEditingCardId(null);
    setPendingRowType(null);
    setPendingStandaloneType(null);
    setLabelDraft('');
    setLabelModalVisible(true);
  };

  const handleRenameTracker = () => {
    setLabelModalMode('rename-tracker');
    setEditingCardId(null);
    setEditingRowId(null);
    setPendingRowType(null);
    setPendingStandaloneType(null);
    setLabelDraft(trackerName);
    setLabelModalVisible(true);
  };

  const handleRenameCard = (card: BuilderCard) => {
    setLabelModalMode('rename-card');
    setEditingCardId(card.id);
    setEditingRowId(null);
    setPendingRowType(null);
    setPendingStandaloneType(null);
    setLabelDraft(card.title);
    setLabelModalVisible(true);
  };

  const handleCancelLabel = () => {
    resetLabelFlow();
  };

  const openOptionsEditor = (
    cardId: string,
    type: OptionsRowType,
    rowLabel: string,
    initialOptions: string[],
    rowId: string | null,
  ) => {
    setEditingCardId(cardId);
    setOptionsEditorType(type);
    setOptionsEditorLabel(rowLabel);
    setOptionsEditorInitialOptions(initialOptions);
    setEditingRowId(rowId);
    setOptionsEditorVisible(true);
  };

  const handleConfirmLabel = () => {
    if (!isNonEmpty(labelDraft)) {
      return;
    }

    const trimmedLabel = labelDraft.trim();

    if (labelModalMode === 'rename-tracker') {
      setTrackerName(trimmedLabel);
      setNameEdited(true);
      resetLabelFlow();
      return;
    }

    if (labelModalMode === 'rename-card' && editingCardId) {
      setCards((current) =>
        current.map((card) =>
          card.id === editingCardId ? { ...card, title: trimmedLabel } : card,
        ),
      );
      resetLabelFlow();
      return;
    }

    if (labelModalMode === 'rename-row' && editingRowId && editingCardId) {
      setCards((current) =>
        current.map((card) =>
          card.id === editingCardId
            ? {
                ...card,
                rows: card.rows.map((row) =>
                  row.id === editingRowId ? { ...row, label: trimmedLabel } : row,
                ),
              }
            : card,
        ),
      );
      resetLabelFlow();
      return;
    }

    if (labelModalMode === 'create-card') {
      setCards((current) => [
        ...current,
        { id: generateId(), title: trimmedLabel, rows: [] },
      ]);
      resetLabelFlow();
      return;
    }

    if (pendingStandaloneType) {
      setStandalones((current) => [
        ...current,
        {
          id: generateId(),
          type: pendingStandaloneType,
          label: trimmedLabel,
        },
      ]);
      resetLabelFlow();
      return;
    }

    if (!pendingRowType || !activeCardId) {
      return;
    }

    const activeCard = cards.find((card) => card.id === activeCardId);

    if (!activeCard || activeCard.rows.length >= MAX_ROWS) {
      return;
    }

    if (needsOptionsEditor(pendingRowType)) {
      setLabelModalVisible(false);
      setLabelDraft('');
      openOptionsEditor(activeCardId, pendingRowType, trimmedLabel, [], null);
      return;
    }

    const row = createRowFromType(pendingRowType, trimmedLabel);
    setCards((current) =>
      current.map((card) =>
        card.id === activeCardId ? { ...card, rows: [...card.rows, row] } : card,
      ),
    );
    resetLabelFlow();
  };

  const handleOptionsEditorCancel = () => {
    resetOptionsEditorFlow();
  };

  const handleOptionsEditorDone = (options: string[]) => {
    if (!optionsEditorType || !isNonEmpty(optionsEditorLabel) || options.length === 0) {
      return;
    }

    if (editingRowId && editingCardId) {
      setCards((current) =>
        current.map((card) => {
          if (card.id !== editingCardId) {
            return card;
          }

          return {
            ...card,
            rows: card.rows.map((row) =>
              row.id === editingRowId
                ? createOptionsRow(
                    optionsEditorType,
                    optionsEditorLabel,
                    options,
                    editingRowId,
                  )
                : row,
            ),
          };
        }),
      );
    } else if (pendingRowType && needsOptionsEditor(pendingRowType) && activeCardId) {
      const row = createOptionsRow(pendingRowType, optionsEditorLabel, options);
      setCards((current) =>
        current.map((card) =>
          card.id === activeCardId ? { ...card, rows: [...card.rows, row] } : card,
        ),
      );
    }

    resetOptionsEditorFlow();
  };

  const handleRowPress = (cardId: string, row: CustomRowSpec) => {
    if (needsOptionsEditor(row.type)) {
      openOptionsEditor(cardId, row.type, row.label, row.options ?? [], row.id);
      return;
    }

    setLabelModalMode('rename-row');
    setEditingCardId(cardId);
    setEditingRowId(row.id);
    setPendingRowType(null);
    setLabelDraft(row.label);
    setLabelModalVisible(true);
  };

  const handleDeleteCard = (card: BuilderCard) => {
    if (cards.length <= 1) {
      return;
    }

    Alert.alert('Remove card?', `"${card.title}" and all its rows will be deleted.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setCards((current) => current.filter((item) => item.id !== card.id));
        },
      },
    ]);
  };

  const handleMoveRowPress = (cardId: string, row: CustomRowSpec) => {
    setMoveSourceCardId(cardId);
    setMoveRow(row);
    setMoveRowModalVisible(true);
  };

  const handleMoveRowSelect = (destinationCardId: string) => {
    if (!moveSourceCardId || !moveRow) {
      return;
    }

    const destinationCard = cards.find((card) => card.id === destinationCardId);

    if (!destinationCard || destinationCard.rows.length >= MAX_ROWS) {
      setMoveRowModalVisible(false);
      setMoveSourceCardId(null);
      setMoveRow(null);
      return;
    }

    setCards((current) =>
      current.map((card) => {
        if (card.id === moveSourceCardId) {
          return {
            ...card,
            rows: card.rows.filter((row) => row.id !== moveRow.id),
          };
        }

        if (card.id === destinationCardId) {
          return {
            ...card,
            rows: [...card.rows, moveRow],
          };
        }

        return card;
      }),
    );

    setMoveRowModalVisible(false);
    setMoveSourceCardId(null);
    setMoveRow(null);
  };

  const handleDeleteStandalone = (standalone: StandaloneModuleSpec) => {
    Alert.alert('Remove module?', `"${standalone.label}" will be removed.`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setStandalones((current) =>
            current.filter((item) => item.id !== standalone.id),
          );
        },
      },
    ]);
  };

  const handleDeleteKept = (item: KeptModule) => {
    Alert.alert(
      'Remove card?',
      `"${keptModuleTitle(item.module)}" will be removed from your tracker. Data already logged is kept in your logs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setKeptModules((current) =>
              current.filter((entry) => entry.id !== item.id),
            );
          },
        },
      ],
    );
  };

  const handleDeleteRow = (cardId: string, row: CustomRowSpec) => {
    const message = isEditMode
      ? `"${row.label}" will be removed from your tracker. Any data already logged for this row will be retained in your logs but will no longer appear on screen.`
      : `"${row.label}" will be deleted.`;

    Alert.alert('Remove row?', message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          setCards((current) =>
            current.map((card) =>
              card.id === cardId
                ? { ...card, rows: card.rows.filter((item) => item.id !== row.id) }
                : card,
            ),
          );
        },
      },
    ]);
  };

  const handleSave = async () => {
    if (!canSave) {
      return;
    }

    try {
      const config = buildTrackerConfig(
        trackerName,
        trackerSubject,
        cards,
        standalones,
        isEditMode ? baseConfig : null,
        keptModules,
        nameEdited,
      );
      await saveTrackerConfig(config);

      if (!isEditMode) {
        await setOnboardingComplete();
      }

      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/(tabs)/home' as Href);
    } catch {
      // fail silently
    }
  };

  const labelConfirmText = pendingStandaloneType
    ? 'ADD MODULE'
    : labelModalMode === 'create-card'
      ? 'ADD CARD'
      : labelModalMode === 'rename-card' || labelModalMode === 'rename-row' || labelModalMode === 'rename-tracker'
        ? 'SAVE'
        : 'ADD ROW';
  const labelModalTitle =
    labelModalMode === 'rename-tracker'
      ? 'NAME THIS TRACKER'
      : labelModalMode === 'create-card' || labelModalMode === 'rename-card'
      ? 'NAME THIS CARD'
      : pendingStandaloneType
        ? 'NAME THIS MODULE'
        : 'NAME THIS ROW';
  const labelModalPlaceholder =
    labelModalMode === 'rename-tracker'
      ? 'e.g. Heartburn, Mum\'s sleep, Garden...'
      : labelModalMode === 'create-card' || labelModalMode === 'rename-card'
      ? 'e.g. Symptoms, Triggers, Outcomes...'
      : pendingStandaloneType
        ? STANDALONE_PLACEHOLDERS[pendingStandaloneType]
        : 'e.g. Severity, Energy, Cups of coffee...';

  const renderBuilderRow = (
    card: BuilderCard,
    { item, drag, isActive }: RenderItemParams<CustomRowSpec>,
  ) => {
    const optionsPreview = formatOptionsPreview(item.options);

    const handleRowLongPress = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      drag();
    };

    return (
      <ScaleDecorator>
        <View style={[styles.rowItem, isActive && styles.rowItemActive]}>
          <Pressable
            onPress={() => handleRowPress(card.id, item)}
            onLongPress={handleRowLongPress}
            delayLongPress={200}
            style={styles.rowDragArea}>
            <View style={styles.gripHandle}>
              <IconGripVertical size={16} color={color.text3} strokeWidth={1.5} />
            </View>

            <View style={styles.rowMiddle}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowTypeBadge} numberOfLines={1}>
                {item.type === 'level' && item.options && item.options.length > 0
                  ? item.options.map((option) => sentenceCase(option)).join(' / ')
                  : optionsPreview
                    ? `${TYPE_DISPLAY_NAMES[item.type]} · ${optionsPreview}`
                    : TYPE_DISPLAY_NAMES[item.type]}
              </Text>
            </View>
          </Pressable>

          <View style={styles.rowActions}>
            {canMoveRows ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleMoveRowPress(card.id, item)}
                hitSlop={space.sm}
                style={styles.deleteButton}>
                <IconArrowsMove size={16} color={color.text3} strokeWidth={1.5} />
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => handleDeleteRow(card.id, item)}
              hitSlop={space.sm}
              style={styles.deleteButton}>
              <IconTrash size={16} color={color.text3} strokeWidth={1.5} />
            </TouchableOpacity>
          </View>
        </View>
      </ScaleDecorator>
    );
  };

  const renderBuilderCard = ({
    item: card,
    drag,
    isActive,
  }: RenderItemParams<BuilderCard>) => {
    const handleCardHeaderLongPress = () => {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      drag();
    };

    return (
      <ScaleDecorator>
        <View style={[styles.canvasCard, isActive && styles.canvasCardActive]}>
          <View style={styles.cardHeader}>
            <Pressable
              onPress={() => handleRenameCard(card)}
              onLongPress={handleCardHeaderLongPress}
              delayLongPress={200}
              style={styles.cardTitlePress}>
              <Text style={[styles.cardTitle, isActive && styles.cardTitleActive]}>
                {card.title}
              </Text>
            </Pressable>
            <Pressable
              disabled={cards.length <= 1}
              onPress={() => handleDeleteCard(card)}
              hitSlop={space.sm}
              style={[styles.deleteButton, cards.length <= 1 && styles.cardDeleteDisabled]}>
              <IconTrash size={16} color={color.text3} strokeWidth={1.5} />
            </Pressable>
          </View>

          <Text style={styles.showsIn}>{showsInText({ title: card.title })}</Text>
          <View style={styles.cardDivider} />

          {card.rows.length === 0 ? (
            <View style={styles.cardEmptyState}>
              <Text style={styles.cardEmptyTitle}>No rows yet</Text>
              <Text style={styles.cardEmptyBody}>Tap + below to add a row to this card.</Text>
            </View>
          ) : (
            <DraggableFlatList
              data={card.rows}
              keyExtractor={(row) => row.id}
              scrollEnabled={false}
              dragItemOverflow
              activationDistance={10}
              onDragEnd={({ data }) => {
                markDragged();
                setCards((current) =>
                  current.map((item) =>
                    item.id === card.id ? { ...item, rows: data } : item,
                  ),
                );
              }}
              renderItem={(params) => renderBuilderRow(card, params)}
              ItemSeparatorComponent={() => <View style={styles.rowDivider} />}
            />
          )}

          <Pressable
            disabled={card.rows.length >= MAX_ROWS}
            onPress={() => openSheet(card.id)}
            style={styles.cardAddRowButton}>
            {card.rows.length >= MAX_ROWS ? (
              <Text style={styles.cardAddRowCap}>Max rows reached</Text>
            ) : (
              <>
                <IconPlus size={14} color={color.text3} strokeWidth={1.5} />
                <Text style={styles.cardAddRowLabel}>Add row</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScaleDecorator>
    );
  };

  if (isEditLoading) {
    return (
      <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={color.text3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'left', 'right']}>
      <View style={styles.topBar}>
        <Pressable onPress={handleBack} hitSlop={space.sm} style={styles.topBarSide}>
          {isEditMode ? (
            <IconX size={22} color={color.text2} strokeWidth={1.5} />
          ) : (
            <IconChevronLeft size={22} color={color.text2} strokeWidth={1.5} />
          )}
        </Pressable>

        <Pressable
          onPress={handleRenameTracker}
          hitSlop={space.sm}
          style={styles.topBarTitleButton}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {!nameEdited && !baseConfig?.name && trackerName.length > 26 && trackerSubject.trim()
              ? `${sentenceCase(trackerSubject.trim())} tracker`
              : trackerName}
          </Text>
          <IconPencil size={13} color={color.text3} strokeWidth={1.5} />
        </Pressable>

        <Pressable
          disabled={!canSave}
          onPress={() => {
            void handleSave();
          }}
          hitSlop={space.sm}
          style={[styles.topBarSide, styles.topBarSideRight]}>
          <Text style={[styles.saveLabel, !canSave && styles.saveLabelDisabled]}>SAVE</Text>
        </Pressable>
      </View>

      <View style={styles.pillRow}>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            <Text style={styles.pillKey}>Tracking · </Text>
            <Text style={styles.pillValue}>{trackerSubject}</Text>
          </Text>
        </View>
        <View style={styles.pill}>
          <Text style={styles.pillText}>
            <Text style={styles.pillKey}>AI insights · </Text>
            <Text style={styles.pillValue}>{sentenceCase(formatCadence(displayCadence))}</Text>
          </Text>
        </View>
      </View>

      {showReorderHint ? (
        <View style={styles.reorderHint}>
          <IconGripVertical size={12} color={color.text3} strokeWidth={1.5} />
          <Text style={styles.reorderHintText}>  LONG PRESS TO REORDER ROWS OR CARDS</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled">
        {keptModules.map((item) => (
          <View key={item.id} style={styles.standaloneCard}>
            <View style={styles.standaloneHeader}>
              <Text style={styles.standaloneHeaderLabel}>
                {sentenceCase(keptModuleTitle(item.module))}
              </Text>
              <Pressable
                onPress={() => handleDeleteKept(item)}
                hitSlop={space.sm}
                style={styles.deleteButton}>
                <IconTrash size={16} color={color.text3} strokeWidth={1.5} />
              </Pressable>
            </View>

            <Text style={styles.showsIn}>{showsInText(getModulePage(item.module, 0))}</Text>
            <View style={styles.cardDivider} />

            <View style={styles.standaloneBody}>
              <IconLock size={22} color={color.text2} strokeWidth={1.5} />
              <View style={styles.standaloneBodyText}>
                <Text style={styles.standaloneLabel}>Built by your AI chat</Text>
                <Text style={styles.standaloneDescription}>
                  Kept exactly as it is. Rebuild with the chat to change its options.
                </Text>
              </View>
            </View>
          </View>
        ))}

        {standalones.map((standalone) => {
          const StandaloneIcon = STANDALONE_ICONS[standalone.type];

          return (
            <View key={standalone.id} style={styles.standaloneCard}>
              <View style={styles.standaloneHeader}>
                <Text style={styles.standaloneHeaderLabel}>
                  {sentenceCase(STANDALONE_TYPE_LABELS[standalone.type])}
                </Text>
                <Pressable
                  onPress={() => handleDeleteStandalone(standalone)}
                  hitSlop={space.sm}
                  style={styles.deleteButton}>
                  <IconTrash size={16} color={color.text3} strokeWidth={1.5} />
                </Pressable>
              </View>

              <Text style={styles.showsIn}>{standaloneShowsIn(standalone)}</Text>
              <View style={styles.cardDivider} />

              <View style={styles.standaloneBody}>
                <StandaloneIcon size={22} color={color.text2} strokeWidth={1.5} />
                <View style={styles.standaloneBodyText}>
                  <Text style={styles.standaloneLabel}>{sentenceCase(standalone.label)}</Text>
                  <Text style={styles.standaloneDescription}>
                    {STANDALONE_DESCRIPTIONS[standalone.type]}
                  </Text>
                </View>
              </View>
            </View>
          );
        })}

        <DraggableFlatList
          data={cards}
          keyExtractor={(card) => card.id}
          scrollEnabled={false}
          dragItemOverflow
          activationDistance={10}
          onDragEnd={({ data }) => {
            markDragged();
            setCards(data);
          }}
          renderItem={renderBuilderCard}
        />

        <Pressable onPress={handleAddCard} style={styles.addCardButton}>
          <IconLayoutColumns size={16} color={color.text2} strokeWidth={1.5} />
          <Text style={styles.addCardLabel}>Add a custom card</Text>
        </Pressable>
        <Text style={styles.addHint}>Build your own rows: scales, yes/no, lists and more.</Text>
      </ScrollView>

      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + space.lg }]}>
        <Pressable
          disabled={allModulesAdded}
          onPress={openModuleSheet}
          style={styles.addModuleButton}>
          {allModulesAdded ? (
            <Text style={styles.addModuleCapLabel}>All modules added</Text>
          ) : (
            <>
              <IconLayoutGrid size={16} color={color.text2} strokeWidth={1.5} />
              <Text style={styles.addModuleLabel}>Add a premade module</Text>
            </>
          )}
        </Pressable>
        <Text style={styles.addHint}>Meal log, photo log, timer, weight, chart.</Text>
      </View>

      <BottomSheetModal
        ref={bottomSheetRef}
        snapPoints={snapPoints}
        topInset={insets.top}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetHeaderLabel}>CHOOSE A ROW TYPE</Text>
          <View style={styles.sheetHeaderDivider} />
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}>
          {ROW_TYPE_OPTIONS.map((option, index) => {
            const TypeIcon = option.Icon;

            return (
              <View key={option.type}>
                {index > 0 ? <View style={styles.sheetRowDivider} /> : null}
                <Pressable
                  onPress={() => handleTypeSelect(option.type)}
                  style={styles.sheetRow}>
                  <View style={styles.sheetIconBox}>
                    <TypeIcon size={16} color={color.text2} strokeWidth={1.5} />
                  </View>
                  <View style={styles.sheetRowText}>
                    <Text style={styles.sheetRowLabel}>{option.label}</Text>
                    <Text style={styles.sheetRowSublabel}>{option.sublabel}</Text>
                  </View>
                </Pressable>
              </View>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={moduleSheetRef}
        snapPoints={moduleSnapPoints}
        topInset={insets.top}
        enablePanDownToClose
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.sheetHandle}>
        <View style={styles.sheetHeader}>
          <Text style={styles.sheetHeaderLabel}>ADD A MODULE</Text>
          <View style={styles.sheetHeaderDivider} />
        </View>

        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.lg }}>
          {MODULE_OPTIONS.map((option, index) => {
            const ModuleIcon = option.Icon;
            const added = isStandaloneAdded(option.type);

            return (
              <View key={option.type}>
                {index > 0 ? <View style={styles.sheetRowDivider} /> : null}
                {added ? (
                  <View style={[styles.sheetRow, styles.sheetRowAdded]}>
                    <View style={styles.sheetIconBox}>
                      <ModuleIcon size={16} color={color.text3} strokeWidth={1.5} />
                    </View>
                    <View style={styles.sheetRowText}>
                      <Text style={[styles.sheetRowLabel, styles.sheetRowLabelAdded]}>
                        {option.label}
                      </Text>
                      <Text style={[styles.sheetRowSublabel, styles.sheetRowSublabelAdded]}>
                        {option.sublabel}
                      </Text>
                    </View>
                    <Text style={styles.sheetAddedBadge}>ADDED</Text>
                  </View>
                ) : (
                  <Pressable
                    onPress={() => handleModuleSelect(option.type)}
                    style={styles.sheetRow}>
                    <View style={styles.sheetIconBox}>
                      <ModuleIcon size={16} color={color.text2} strokeWidth={1.5} />
                    </View>
                    <View style={styles.sheetRowText}>
                      <Text style={styles.sheetRowLabel}>{option.label}</Text>
                      <Text style={styles.sheetRowSublabel}>{option.sublabel}</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            );
          })}
        </BottomSheetScrollView>
      </BottomSheetModal>

      <LabelModal
        visible={labelModalVisible}
        value={labelDraft}
        title={labelModalTitle}
        placeholder={labelModalPlaceholder}
        confirmLabel={labelConfirmText}
        onChange={setLabelDraft}
        onCancel={handleCancelLabel}
        onConfirm={handleConfirmLabel}
        width={width}
      />

      {optionsEditorType ? (
        <OptionsEditorModal
          visible={optionsEditorVisible}
          rowType={optionsEditorType}
          label={optionsEditorLabel}
          initialOptions={optionsEditorInitialOptions}
          onCancel={handleOptionsEditorCancel}
          onDone={handleOptionsEditorDone}
        />
      ) : null}

      <CardPickerModal
        visible={moveRowModalVisible}
        cards={cards}
        sourceCardId={moveSourceCardId ?? ''}
        onCancel={() => {
          setMoveRowModalVisible(false);
          setMoveSourceCardId(null);
          setMoveRow(null);
        }}
        onSelect={handleMoveRowSelect}
        width={width}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.bg,
  },
  flex: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
    gap: space.sm,
  },
  topBarSide: {
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  topBarSideRight: {
    alignItems: 'flex-end',
  },
  topBarTitleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  showsIn: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    color: color.text3,
    marginTop: 2,
  },
  topBarTitle: {
    flexShrink: 1,
    fontFamily: font.uiMedium,
    fontSize: 15,
    fontWeight: fontWeight.medium,
    color: color.text1,
    textAlign: 'center',
  },
  saveLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textAlign: 'right',
    width: '100%',
  },
  saveLabelDisabled: {
    color: color.text3,
  },
  scrollContent: {
    padding: space.lg,
    paddingBottom: space.xxl,
  },
  bottomBar: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    backgroundColor: color.bg,
    borderTopWidth: 1,
    borderTopColor: color.border,
  },
  bottomActions: {
    gap: 10,
  },
  standaloneCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  standaloneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  standaloneHeaderLabel: {
    fontFamily: font.uiMedium,
    fontSize: 15,
    color: color.title,
    flex: 1,
    paddingRight: space.sm,
  },
  standaloneBody: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  standaloneBodyText: {
    flex: 1,
  },
  standaloneLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    color: color.text2,
  },
  standaloneDescription: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    color: color.text3,
    marginTop: 3,
  },
  addModuleButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  addHint: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    color: color.text3,
    textAlign: 'center',
    marginTop: space.sm,
  },
  addModuleLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    color: color.text2,
  },
  addModuleCapLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  pillRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    alignItems: 'flex-start',
  },
  pill: {
    alignSelf: 'flex-start',
    backgroundColor: color.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: color.border,
  },
  pillText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
  },
  pillKey: {
    color: color.text3,
  },
  pillValue: {
    fontFamily: font.ui,
    color: color.text2,
    textTransform: 'none',
  },
  reorderHint: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.sm,
    paddingHorizontal: space.lg,
    marginBottom: space.sm,
  },
  reorderHintText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    letterSpacing: 0.8,
    color: color.text3,
    textTransform: 'uppercase',
  },
  canvasCard: {
    backgroundColor: color.surface,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.lg,
    padding: space.lg,
    marginBottom: space.md,
  },
  canvasCardActive: {
    backgroundColor: color.surface2,
    borderColor: color.border2,
    opacity: 0.96,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitlePress: {
    flex: 1,
    paddingRight: space.sm,
  },
  cardTitle: {
    fontFamily: font.uiMedium,
    fontSize: 15,
    fontWeight: fontWeight.medium,
    color: color.title,
  },
  cardTitleActive: {
    color: color.accent,
  },
  cardDeleteDisabled: {
    opacity: 0.3,
  },
  cardHeaderLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
  },
  cardHeaderCount: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
  },
  cardDivider: {
    height: 1,
    backgroundColor: color.border,
    marginVertical: space.md,
  },
  cardEmptyState: {
    alignItems: 'center',
    paddingVertical: space.xl,
  },
  cardEmptyTitle: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
    color: color.text2,
  },
  cardEmptyBody: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text3,
    marginTop: space.xs,
    textAlign: 'center',
  },
  cardAddRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: space.sm,
  },
  cardAddRowLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.secondary,
    color: color.text2,
  },
  cardAddRowCap: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
  },
  addCardButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.xs,
    marginBottom: space.lg,
  },
  addCardLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    color: color.text2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: space.xxl,
  },
  emptyTitle: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: 1,
    color: color.text3,
    textTransform: 'uppercase',
  },
  emptyBody: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text3,
    marginTop: 6,
    textAlign: 'center',
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  rowItemActive: {
    backgroundColor: color.surface3,
    opacity: 0.95,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.border2,
  },
  rowDragArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gripHandle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
  },
  rowMiddle: {
    flex: 1,
    paddingHorizontal: 10,
    gap: space.xs,
  },
  rowLabel: {
    fontFamily: font.uiMedium,
    fontSize: fontSize.rowLabel,
    fontWeight: fontWeight.medium,
    color: color.title,
  },
  rowTypeBadge: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  rowOptionsPreview: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  rowDivider: {
    height: 1,
    backgroundColor: color.border,
  },
  deleteButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: color.border2,
    borderRadius: radius.md,
    paddingVertical: space.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
  },
  addButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
  },
  addButtonCapLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text3,
  },
  sheetBackground: {
    backgroundColor: color.surface,
  },
  sheetHandle: {
    backgroundColor: color.border2,
  },
  sheetHeader: {
    paddingHorizontal: space.xl,
    paddingTop: space.lg,
  },
  sheetHeaderLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
  },
  sheetHeaderDivider: {
    height: 1,
    backgroundColor: color.border,
    marginTop: space.md,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: space.xl,
    paddingVertical: 14,
  },
  sheetRowDivider: {
    height: 1,
    backgroundColor: color.border,
    marginHorizontal: space.xl,
  },
  sheetIconBox: {
    width: ICON_BOX_SIZE,
    height: ICON_BOX_SIZE,
    borderRadius: ICON_BOX_RADIUS,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRowText: {
    flex: 1,
    gap: space.xs,
  },
  sheetRowLabel: {
    fontFamily: font.uiMedium,
    fontSize: 15,
    fontWeight: fontWeight.medium,
    color: color.text1,
  },
  sheetRowSublabel: {
    fontFamily: font.ui,
    fontSize: fontSize.monoData,
    lineHeight: 18,
    color: color.text2,
  },
  sheetRowAdded: {
    opacity: 0.5,
  },
  sheetRowLabelAdded: {
    color: color.text3,
  },
  sheetRowSublabelAdded: {
    color: color.text3,
  },
  sheetAddedBadge: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    letterSpacing: 1,
    color: color.text3,
    textTransform: 'uppercase',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colorWithOpacity(color.bg, 0.92),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  modalCard: {
    backgroundColor: color.surface,
    borderRadius: radius.lg,
    padding: space.xl,
    borderWidth: 1,
    borderColor: color.border,
  },
  modalTitle: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: 1,
    color: color.text3,
    textTransform: 'uppercase',
    marginBottom: space.lg,
  },
  pickerRowDivider: {
    height: 1,
    backgroundColor: color.border,
  },
  pickerRow: {
    paddingVertical: space.md,
  },
  pickerRowTitle: {
    fontFamily: font.ui,
    fontSize: 15,
    color: color.text1,
  },
  pickerRowCount: {
    fontFamily: font.mono,
    fontSize: fontSize.monoMicro,
    color: color.text3,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  pickerCancelRow: {
    paddingVertical: space.md,
    borderTopWidth: 1,
    borderTopColor: color.border,
    marginTop: space.lg,
    alignItems: 'center',
  },
  pickerCancelLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
    textTransform: 'uppercase',
  },
  modalInput: {
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: space.lg,
    fontFamily: font.ui,
    fontSize: INPUT_FONT_SIZE,
    color: color.text1,
    marginBottom: space.lg,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: color.surface2,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  modalCancelLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: color.accent,
    borderRadius: radius.sm,
    paddingVertical: space.md,
    alignItems: 'center',
  },
  modalConfirmDisabled: {
    backgroundColor: color.surface2,
  },
  modalConfirmLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    fontWeight: fontWeight.semibold,
    color: color.accentInk,
  },
  modalConfirmLabelDisabled: {
    color: color.text3,
  },
  optionsScreen: {
    flex: 1,
    backgroundColor: color.bg,
  },
  optionsTopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
    paddingBottom: space.md,
  },
  optionsTopSide: {
    width: 72,
  },
  optionsCancelLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.text2,
  },
  optionsTitle: {
    flex: 1,
    fontFamily: font.mono,
    fontSize: fontSize.secondary,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  optionsDoneLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoData,
    color: color.accent,
    textAlign: 'right',
  },
  optionsDoneDisabled: {
    color: color.text3,
  },
  optionsContent: {
    paddingHorizontal: space.xxl,
    paddingBottom: space.xxl,
  },
  optionsContextPill: {
    alignSelf: 'flex-start',
    backgroundColor: color.surface2,
    borderRadius: radius.sm,
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: color.border,
    marginBottom: space.xl,
  },
  optionsContextText: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
  },
  optionsContextKey: {
    color: color.text3,
    textTransform: 'uppercase',
  },
  optionsContextValue: {
    fontFamily: font.ui,
    color: color.text2,
    textTransform: 'none',
  },
  optionsInstruction: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text2,
    marginBottom: space.xl,
  },
  addOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: space.xl,
  },
  optionInput: {
    flex: 1,
    backgroundColor: color.surface2,
    borderWidth: 1,
    borderColor: color.border,
    borderRadius: radius.md,
    padding: 14,
    fontFamily: font.ui,
    fontSize: OPTION_INPUT_FONT_SIZE,
    color: color.text1,
  },
  optionInputFocused: {
    borderColor: color.accent,
  },
  addOptionButton: {
    width: ADD_OPTION_BUTTON_SIZE,
    height: ADD_OPTION_BUTTON_SIZE,
    borderRadius: radius.md,
    backgroundColor: color.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addOptionButtonDisabled: {
    backgroundColor: color.surface2,
  },
  optionsListLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text3,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  optionsEmpty: {
    fontFamily: font.ui,
    fontSize: fontSize.secondary,
    color: color.text3,
    paddingVertical: space.lg,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
  },
  optionRowDivider: {
    height: 1,
    backgroundColor: color.border,
  },
  optionMarker: {
    width: OPTION_MARKER_SIZE,
    height: OPTION_MARKER_SIZE,
    borderRadius: 1,
    backgroundColor: color.accent,
  },
  optionLabel: {
    flex: 1,
    paddingHorizontal: space.md,
    fontFamily: font.ui,
    fontSize: 15,
    color: color.text1,
  },
  optionRemoveButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
