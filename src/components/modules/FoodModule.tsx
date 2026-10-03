import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import MealDraftModule, { type DraftItem } from '@/components/MealDraftModule';
import ModuleCard from '@/components/ModuleCard';
import ModuleRow from '@/components/rows/ModuleRow';
import TimerModule from '@/components/TimerModule';
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
  letterSpacing,
  radius,
  space,
} from '@/theme/theme';

export interface FoodModuleProps {
  showMealLog?: boolean;
  showBarcodeScanner?: boolean;
  showManualEntry?: boolean;
  showTimestamp?: boolean;
  showBodyPosition?: boolean;

  showMealType?: boolean;
  showHungerLevel?: boolean;
  showFullnessLevel?: boolean;
  showHydration?: boolean;
  showCaffeine?: boolean;
  showAlcohol?: boolean;
  showIngredients?: boolean;
  showFoodMood?: boolean;
  showFasting?: boolean;

  ingredientOptions?: string[];
  mealTypeOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  mealCardTitle?: string;
  nutritionCardTitle?: string;
  terminology?: {
    subject?: string;
    mealDraft?: string;
  };

  onMealLog?: (items: DraftItem[]) => void;
  onNutritionLog?: (entries: RowBatchLogEntry[]) => void;
  onFastingLog?: (durationSeconds: number) => void;
}

const DEFAULT_MEAL_TYPE_OPTIONS = [
  'BREAKFAST',
  'LUNCH',
  'DINNER',
  'SNACK',
  'DRINK',
];

const DEFAULT_NUTRITION_ROW_ORDER = [
  'mealType',
  'hungerLevel',
  'fullnessLevel',
  'hydration',
  'caffeine',
  'alcohol',
  'ingredients',
  'foodMood',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];

const BODY_POSITION_OPTIONS = ['UPRIGHT', 'RECLINED', 'LYING DOWN'];

const BODY_POSITION_CONFIG: ChipsRowConfig = {
  id: 'bodyPosition',
  type: 'chips',
  label: 'BODY POSITION',
  options: BODY_POSITION_OPTIONS,
  wrap: true,
  multi: false,
};

function hasNutritionRows(props: FoodModuleProps): boolean {
  return !!(
    props.showMealType ||
    props.showHungerLevel ||
    props.showFullnessLevel ||
    props.showHydration ||
    props.showCaffeine ||
    props.showAlcohol ||
    props.showIngredients ||
    props.showFoodMood
  );
}

function buildNutritionRows(props: FoodModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showMealType) {
    rows.set('mealType', {
      id: 'mealType',
      type: 'chips',
      label: 'MEAL TYPE',
      options: props.mealTypeOptions ?? DEFAULT_MEAL_TYPE_OPTIONS,
      wrap: true,
      multi: false,
    });
  }

  if (props.showHungerLevel) {
    rows.set('hungerLevel', {
      id: 'hungerLevel',
      type: 'scale',
      label: 'HUNGER BEFORE',
      max: 5,
    });
  }

  if (props.showFullnessLevel) {
    rows.set('fullnessLevel', {
      id: 'fullnessLevel',
      type: 'scale',
      label: 'FULLNESS AFTER',
      max: 5,
    });
  }

  if (props.showHydration) {
    rows.set('hydration', {
      id: 'hydration',
      type: 'counter',
      label: 'WATER TODAY',
      unitLabel: 'GLASSES',
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

  if (props.showAlcohol) {
    rows.set('alcohol', {
      id: 'alcohol',
      type: 'counter',
      label: 'ALCOHOL',
      unitLabel: 'UNITS',
    });
  }

  if (props.showIngredients) {
    rows.set('ingredients', {
      id: 'ingredients',
      type: 'chips',
      label: 'INGREDIENTS TO WATCH',
      options: props.ingredientOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showFoodMood) {
    rows.set('foodMood', {
      id: 'foodMood',
      type: 'level',
      label: 'HOW YOU FEEL',
      options: LEVEL_OPTIONS,
    });
  }

  return rows;
}

function orderNutritionRows(
  enabledRows: Map<string, RowConfig>,
  rowOrder?: string[],
): RowConfig[] {
  const ordered: RowConfig[] = [];
  const seen = new Set<string>();
  const order = rowOrder ?? [...DEFAULT_NUTRITION_ROW_ORDER];

  for (const rowId of order) {
    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
      seen.add(rowId);
    }
  }

  for (const rowId of DEFAULT_NUTRITION_ROW_ORDER) {
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

function buildNutritionConfig(props: FoodModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'food';
  const title = props.nutritionCardTitle ?? 'NUTRITION TODAY';
  const enabledRows = buildNutritionRows(props);

  return {
    id: moduleId,
    title,
    rows: orderNutritionRows(enabledRows, props.rowOrder),
  };
}

interface MealCardProps {
  moduleId: string;
  title: string;
  showBarcodeScanner: boolean;
  showManualEntry: boolean;
  showBodyPosition: boolean;
  mealDraftTerminology?: string;
  onMealLog?: (items: DraftItem[]) => void;
  onBodyPositionLog?: (entry: RowBatchLogEntry) => void;
}

function MealCard({
  moduleId,
  title,
  showBarcodeScanner,
  showManualEntry,
  showBodyPosition,
  mealDraftTerminology,
  onMealLog,
  onBodyPositionLog,
}: MealCardProps) {
  const [bodyPosition, setBodyPosition] = useState<RowValue | null>(null);

  const handleMealLog = (items: DraftItem[]) => {
    void Promise.resolve(onMealLog?.(items)).catch(() => {
      // fail silently
    });

    if (
      showBodyPosition &&
      bodyPosition?.type === 'chips' &&
      bodyPosition.value.length > 0
    ) {
      const ts = new Date().toISOString();
      const entry: RowBatchLogEntry = {
        id: generateId(),
        rowId: 'bodyPosition',
        moduleId,
        type: 'chips',
        value: bodyPosition,
        ts,
      };

      void Promise.resolve(onBodyPositionLog?.(entry)).catch(() => {
        // fail silently
      });
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <MealDraftModule
        label=""
        terminology={mealDraftTerminology}
        enableBarcodeScanner={showBarcodeScanner}
        enableManualEntry={showManualEntry}
        storageKey={`food_${moduleId}`}
        onLog={handleMealLog}
      />

      {showBodyPosition ? (
        <>
          <View style={styles.divider} />
          <ModuleRow
            config={BODY_POSITION_CONFIG}
            value={bodyPosition}
            onChange={setBodyPosition}
            moduleId={moduleId}
          />
        </>
      ) : null}
    </View>
  );
}

interface FastingCardProps {
  moduleId: string;
  onFastingLog?: (durationSeconds: number) => void;
}

function FastingCard({ moduleId: _moduleId, onFastingLog }: FastingCardProps) {
  const handleLog = (durationSeconds: number) => {
    void Promise.resolve(onFastingLog?.(durationSeconds)).catch(() => {
      // fail silently
    });
  };

  return (
    <View style={styles.card}>
      <TimerModule
        label="FASTING"
        terminology="Fasting window"
        onLog={handleLog}
      />
    </View>
  );
}

export default function FoodModule(props: FoodModuleProps) {
  const {
    moduleId = 'food',
    mealCardTitle = 'MEAL LOG',
    showMealLog = false,
    showBarcodeScanner = false,
    showManualEntry = true,
    showBodyPosition = false,
    showFasting = false,
    terminology,
    onMealLog,
    onNutritionLog,
    onFastingLog,
  } = props;

  const showNutritionCard = hasNutritionRows(props);
  const nutritionConfig = showNutritionCard ? buildNutritionConfig(props) : null;

  const handleNutritionLog = (payload: RowLogPayload[]) => {
    const ts = new Date().toISOString();
    const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
      id: generateId(),
      rowId,
      moduleId,
      type: value.type,
      value,
      ts,
    }));

    void Promise.resolve(onNutritionLog?.(entries)).catch(() => {
      // fail silently
    });
  };

  const handleBodyPositionLog = (entry: RowBatchLogEntry) => {
    void Promise.resolve(onNutritionLog?.([entry])).catch(() => {
      // fail silently
    });
  };

  return (
    <View>
      {showMealLog ? (
        <MealCard
          moduleId={moduleId}
          title={mealCardTitle}
          showBarcodeScanner={showBarcodeScanner}
          showManualEntry={showManualEntry}
          showBodyPosition={showBodyPosition}
          mealDraftTerminology={terminology?.mealDraft}
          onMealLog={onMealLog}
          onBodyPositionLog={handleBodyPositionLog}
        />
      ) : null}

      {showNutritionCard && nutritionConfig ? (
        <View style={styles.nutritionCard}>
          <ModuleCard config={nutritionConfig} onLog={handleNutritionLog} />
        </View>
      ) : null}

      {showFasting ? (
        <FastingCard moduleId={`fasting_${moduleId}`} onFastingLog={onFastingLog} />
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
  nutritionCard: {
    marginBottom: space.cardGap,
  },
});
