import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import MealDraftModule, { type DraftItem } from '@/components/MealDraftModule';
import ModuleCard from '@/components/ModuleCard';
import ModuleRow from '@/components/rows/ModuleRow';
import PhotoLog from '@/components/PhotoLog';
import type { WeightUnit } from '@/types/fitness';
import type {
  CounterRowConfig,
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
  RowValue,
} from '@/types/rows';
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

export type BowelMovementMode = 'toggle' | 'counter';

export interface PetModuleProps {
  showFoodLog?: boolean;
  showWaterIntake?: boolean;

  showEpisodes?: boolean;
  showEpisodeSeverity?: boolean;
  showMood?: boolean;
  showEnergy?: boolean;
  showAppetite?: boolean;
  showWeight?: boolean;
  showMedication?: boolean;
  showSymptoms?: boolean;
  showBowelMovement?: boolean;
  showExercise?: boolean;
  showSleep?: boolean;

  showPhotoLog?: boolean;

  bowelMovementMode?: BowelMovementMode;
  episodeLabel?: string;
  weightUnit?: WeightUnit;

  moodOptions?: string[];
  medicationOptions?: string[];
  symptomOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  foodCardTitle?: string;
  healthCardTitle?: string;
  photoCardTitle?: string;
  terminology?: {
    subject?: string;
    mealDraft?: string;
  };

  onFoodLog?: (items: DraftItem[]) => void;
  onHealthLog?: (entries: RowBatchLogEntry[]) => void;
  onPhotoLog?: (photos: string[]) => void;
}

const DEFAULT_HEALTH_ROW_ORDER = [
  'episodes',
  'episodeSeverity',
  'symptoms',
  'mood',
  'energy',
  'appetite',
  'bowelMovement',
  'medication',
  'weight',
  'exercise',
  'sleep',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];
const LOGGED_CONFIRM_MS = 1000;
const LOG_WATER_BUTTON_HEIGHT = 40;

const WATER_COUNTER_CONFIG: CounterRowConfig = {
  id: 'waterIntake',
  type: 'counter',
  label: 'WATER TODAY',
  unitLabel: 'BOWLS',
};

function hasHealthRows(props: PetModuleProps): boolean {
  return !!(
    props.showEpisodes ||
    props.showEpisodeSeverity ||
    props.showMood ||
    props.showEnergy ||
    props.showAppetite ||
    props.showWeight ||
    props.showMedication ||
    props.showSymptoms ||
    props.showBowelMovement ||
    props.showExercise ||
    props.showSleep
  );
}

function buildHealthRows(props: PetModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();
  const episodeLabelUpper = props.episodeLabel?.toUpperCase();
  const bowelMode = props.bowelMovementMode ?? 'toggle';
  const weightUnit = props.weightUnit ?? 'kg';

  if (props.showEpisodes) {
    rows.set('episodes', {
      id: 'episodes',
      type: 'counter',
      label: episodeLabelUpper ?? 'EPISODES TODAY',
      unitLabel: episodeLabelUpper ?? 'EPISODES',
    });
  }

  if (props.showEpisodeSeverity) {
    rows.set('episodeSeverity', {
      id: 'episodeSeverity',
      type: 'scale',
      label: 'EPISODE SEVERITY',
      max: 5,
    });
  }

  if (props.showMood) {
    rows.set('mood', {
      id: 'mood',
      type: 'chips',
      label: 'MOOD TODAY',
      options: props.moodOptions ?? [],
      wrap: true,
      multi: false,
    });
  }

  if (props.showEnergy) {
    rows.set('energy', {
      id: 'energy',
      type: 'level',
      label: 'ENERGY LEVEL',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showAppetite) {
    rows.set('appetite', {
      id: 'appetite',
      type: 'level',
      label: 'APPETITE',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showWeight) {
    rows.set('weight', {
      id: 'weight',
      type: 'metric',
      label: 'WEIGHT',
      unit: weightUnit,
      showTrend: true,
      step: 0.1,
    });
  }

  if (props.showMedication) {
    rows.set('medication', {
      id: 'medication',
      type: 'chips',
      label: 'MEDICATION GIVEN',
      options: props.medicationOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showSymptoms) {
    rows.set('symptoms', {
      id: 'symptoms',
      type: 'chips',
      label: 'SYMPTOMS TODAY',
      options: props.symptomOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showBowelMovement) {
    if (bowelMode === 'counter') {
      rows.set('bowelMovement', {
        id: 'bowelMovement',
        type: 'counter',
        label: 'BOWEL MOVEMENTS',
        unitLabel: 'TIMES',
      });
    } else {
      rows.set('bowelMovement', {
        id: 'bowelMovement',
        type: 'toggle',
        label: 'BOWEL MOVEMENT TODAY?',
      });
    }
  }

  if (props.showExercise) {
    rows.set('exercise', {
      id: 'exercise',
      type: 'metric',
      label: 'EXERCISE TODAY',
      unit: 'mins',
      showTrend: true,
      step: 5,
    });
  }

  if (props.showSleep) {
    rows.set('sleep', {
      id: 'sleep',
      type: 'metric',
      label: 'SLEEP TODAY',
      unit: 'hrs',
      showTrend: true,
      step: 0.5,
    });
  }

  return rows;
}

function orderHealthRows(
  enabledRows: Map<string, RowConfig>,
  rowOrder?: string[],
): RowConfig[] {
  const ordered: RowConfig[] = [];
  const seen = new Set<string>();
  const order = rowOrder ?? [...DEFAULT_HEALTH_ROW_ORDER];

  for (const rowId of order) {
    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
      seen.add(rowId);
    }
  }

  for (const rowId of DEFAULT_HEALTH_ROW_ORDER) {
    if (seen.has(rowId)) {
      continue;
    }

    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
    }
  }

  return ordered;
}

function buildHealthConfig(props: PetModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'pet';
  const title = props.healthCardTitle ?? 'HEALTH TODAY';
  const enabledRows = buildHealthRows(props);

  return {
    id: moduleId,
    title,
    rows: orderHealthRows(enabledRows, props.rowOrder),
  };
}

interface FoodCardProps {
  moduleId: string;
  title: string;
  showFoodLog: boolean;
  showWaterIntake: boolean;
  mealDraftTerminology?: string;
  onFoodLog?: (items: DraftItem[]) => void;
  onWaterLog?: (entries: RowBatchLogEntry[]) => void;
}

function FoodCard({
  moduleId,
  title,
  showFoodLog,
  showWaterIntake,
  mealDraftTerminology,
  onFoodLog,
  onWaterLog,
}: FoodCardProps) {
  const [waterValue, setWaterValue] = useState<RowValue | null>(null);
  const [waterLoggedConfirm, setWaterLoggedConfirm] = useState(false);
  const waterConfirmTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const waterCount =
    waterValue?.type === 'counter' ? waterValue.value : 0;
  const canLogWater = waterCount > 0 && !waterLoggedConfirm;

  useEffect(() => {
    return () => {
      if (waterConfirmTimeoutRef.current) {
        clearTimeout(waterConfirmTimeoutRef.current);
      }
    };
  }, []);

  const handleFoodLog = (items: DraftItem[]) => {
    void Promise.resolve(onFoodLog?.(items)).catch(() => {
      // fail silently
    });
  };

  const handleWaterLog = () => {
    if (!canLogWater || !waterValue) {
      return;
    }

    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const ts = new Date().toISOString();
    const entry: RowBatchLogEntry = {
      id: generateId(),
      rowId: 'waterIntake',
      moduleId,
      type: 'counter',
      value: waterValue,
      ts,
    };

    setWaterLoggedConfirm(true);
    setWaterValue(null);

    void Promise.resolve(onWaterLog?.([entry])).catch(() => {
      // fail silently
    });

    if (waterConfirmTimeoutRef.current) {
      clearTimeout(waterConfirmTimeoutRef.current);
    }

    waterConfirmTimeoutRef.current = setTimeout(() => {
      setWaterLoggedConfirm(false);
      waterConfirmTimeoutRef.current = null;
    }, LOGGED_CONFIRM_MS);
  };

  const getWaterLogLabel = () => {
    if (waterLoggedConfirm) {
      return 'LOGGED ✓';
    }

    return 'LOG WATER';
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      {showFoodLog ? (
        <MealDraftModule
          label=""
          terminology={mealDraftTerminology ?? 'food'}
          enableBarcodeScanner={false}
          enableManualEntry
          storageKey={`pet_food_${moduleId}`}
          onLog={handleFoodLog}
        />
      ) : null}

      {showWaterIntake ? (
        <>
          {showFoodLog ? <View style={styles.divider} /> : null}
          <ModuleRow
            config={WATER_COUNTER_CONFIG}
            value={waterValue}
            onChange={setWaterValue}
            moduleId={moduleId}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            disabled={!canLogWater && !waterLoggedConfirm}
            onPress={handleWaterLog}
            style={[
              styles.logWaterButton,
              canLogWater && styles.logWaterButtonActive,
              waterLoggedConfirm && styles.logWaterButtonLogged,
            ]}>
            <Text
              style={[
                styles.logWaterButtonLabel,
                canLogWater && styles.logWaterButtonLabelActive,
                waterLoggedConfirm && styles.logWaterButtonLabelLogged,
              ]}>
              {getWaterLogLabel()}
            </Text>
          </TouchableOpacity>
        </>
      ) : null}
    </View>
  );
}

interface PhotoCardProps {
  title: string;
  storageKey: string;
  onPhotoLog?: (photos: string[]) => void;
}

function PhotoCard({ title, storageKey, onPhotoLog }: PhotoCardProps) {
  const handlePhotoLog = (photoUri: string) => {
    void Promise.resolve(onPhotoLog?.([photoUri])).catch(() => {
      // fail silently
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      <PhotoLog label="" storageKey={storageKey} onLog={handlePhotoLog} />
    </View>
  );
}

function createHealthLogHandler(
  moduleId: string,
  onHealthLog?: (entries: RowBatchLogEntry[]) => void,
) {
  return (payload: RowLogPayload[]) => {
    const ts = new Date().toISOString();
    const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
      id: generateId(),
      rowId,
      moduleId,
      type: value.type,
      value,
      ts,
    }));

    void Promise.resolve(onHealthLog?.(entries)).catch(() => {
      // fail silently
    });
  };
}

export default function PetModule(props: PetModuleProps) {
  const {
    moduleId = 'pet',
    foodCardTitle = 'FOOD & WATER',
    photoCardTitle = 'PHOTO LOG',
    showFoodLog = false,
    showWaterIntake = false,
    showPhotoLog = false,
    terminology,
    onFoodLog,
    onHealthLog,
    onPhotoLog,
  } = props;

  const showFoodCard = showFoodLog || showWaterIntake;
  const showHealthCard = hasHealthRows(props);
  const healthConfig = showHealthCard ? buildHealthConfig(props) : null;
  const handleHealthLog = createHealthLogHandler(moduleId, onHealthLog);
  const handleWaterLog = createHealthLogHandler(moduleId, onHealthLog);

  return (
    <View>
      {showFoodCard ? (
        <FoodCard
          moduleId={moduleId}
          title={foodCardTitle}
          showFoodLog={showFoodLog}
          showWaterIntake={showWaterIntake}
          mealDraftTerminology={terminology?.mealDraft}
          onFoodLog={onFoodLog}
          onWaterLog={handleWaterLog}
        />
      ) : null}

      {showHealthCard && healthConfig ? (
        <View style={styles.cardSpacing}>
          <ModuleCard config={healthConfig} onLog={handleHealthLog} />
        </View>
      ) : null}

      {showPhotoLog ? (
        <PhotoCard
          title={photoCardTitle}
          storageKey={`pet_photo_${moduleId}`}
          onPhotoLog={onPhotoLog}
        />
      ) : null}
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
    marginBottom: space.cardGap,
  },
  cardSpacing: {
    marginBottom: space.cardGap,
  },
  title: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    color: color.text2,
    textTransform: 'uppercase',
    marginBottom: space.lg,
  },
  divider: {
    height: 1,
    backgroundColor: color.border2,
    marginVertical: space.lg,
  },
  logWaterButton: {
    alignSelf: 'flex-start',
    minWidth: 120,
    height: LOG_WATER_BUTTON_HEIGHT,
    marginTop: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.border,
    backgroundColor: color.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logWaterButtonActive: {
    borderColor: color.accent,
    backgroundColor: color.surface,
  },
  logWaterButtonLogged: {
    borderColor: color.border,
    backgroundColor: color.surface2,
  },
  logWaterButtonLabel: {
    fontFamily: font.mono,
    fontSize: fontSize.monoLabel,
    letterSpacing: letterSpacing.monoLabel,
    textTransform: 'uppercase',
    fontWeight: fontWeight.semibold,
    color: color.text3,
  },
  logWaterButtonLabelActive: {
    color: color.accent,
  },
  logWaterButtonLabelLogged: {
    color: color.text3,
  },
});
