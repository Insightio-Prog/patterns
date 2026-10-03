import type { ModuleType } from '@/types';

type PropsRecord = Record<string, unknown>;

function readCard(props: PropsRecord, cardKey: string): PropsRecord | null {
  const card = props[cardKey];
  if (!card || typeof card !== 'object' || Array.isArray(card)) {
    return null;
  }

  const cardObj = card as PropsRecord;
  if (cardObj.enabled === false) {
    return null;
  }

  return cardObj;
}

function mergeCardFields(
  flat: PropsRecord,
  card: PropsRecord,
  enableKey?: string,
): void {
  if (enableKey) {
    flat[enableKey] = true;
  }

  for (const [key, value] of Object.entries(card)) {
    if (key === 'enabled') {
      continue;
    }

    flat[key] = value;
  }
}

const NESTED_CARD_KEYS = [
  'MealCard',
  'NutritionCard',
  'FastingCard',
  'FactorsCard',
  'EnvironmentCard',
  'ExerciseDraftCard',
  'SessionCard',
  'WellbeingCard',
  'FoodCard',
  'HealthCard',
  'PhotoCard',
  'CareCard',
  'FeedCard',
  'SleepCard',
  'NappyCard',
  'GrowthCard',
  'WellbeingCard',
] as const;

function flattenFoodProps(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  const mealCard = readCard(props, 'MealCard');
  if (mealCard) {
    mergeCardFields(flat, mealCard, 'showMealLog');
  }

  const nutritionCard = readCard(props, 'NutritionCard');
  if (nutritionCard) {
    mergeCardFields(flat, nutritionCard);
  }

  const fastingCard = readCard(props, 'FastingCard');
  if (fastingCard) {
    mergeCardFields(flat, fastingCard, 'showFasting');
  }

  return flat;
}

function flattenEnvironmentExtendedProps(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  const factorsCard = readCard(props, 'FactorsCard');
  if (factorsCard) {
    mergeCardFields(flat, factorsCard);
    if (factorsCard.showFactors == null && factorsCard.showPollen == null) {
      flat.showFactors = true;
    }
  }

  const environmentCard = readCard(props, 'EnvironmentCard');
  if (environmentCard) {
    mergeCardFields(flat, environmentCard);
  }

  return flat;
}

function flattenFitnessProps(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  const exerciseCard = readCard(props, 'ExerciseDraftCard');
  if (exerciseCard) {
    mergeCardFields(flat, exerciseCard, 'showExerciseDraft');
  }

  const sessionCard = readCard(props, 'SessionCard');
  if (sessionCard) {
    mergeCardFields(flat, sessionCard);
  }

  const wellbeingCard = readCard(props, 'WellbeingCard');
  if (wellbeingCard) {
    mergeCardFields(flat, wellbeingCard);
  }

  return flat;
}

function flattenPetProps(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  const foodCard = readCard(props, 'FoodCard');
  if (foodCard) {
    mergeCardFields(flat, foodCard);
    if (foodCard.showFoodLog == null && foodCard.showWaterIntake == null) {
      flat.showFoodLog = true;
    }
  }

  const healthCard = readCard(props, 'HealthCard');
  if (healthCard) {
    mergeCardFields(flat, healthCard);
  }

  const photoCard = readCard(props, 'PhotoCard');
  if (photoCard) {
    mergeCardFields(flat, photoCard, 'showPhotoLog');
  }

  return flat;
}

function flattenPlantProps(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  const careCard = readCard(props, 'CareCard');
  if (careCard) {
    mergeCardFields(flat, careCard);
  }

  const photoCard = readCard(props, 'PhotoCard');
  if (photoCard) {
    mergeCardFields(flat, photoCard, 'showPhotoLog');
  }

  return flat;
}

function flattenBabyProps(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  const feedCard = readCard(props, 'FeedCard');
  if (feedCard) {
    mergeCardFields(flat, feedCard, 'showFeedLog');
  }

  const sleepCard = readCard(props, 'SleepCard');
  if (sleepCard) {
    mergeCardFields(flat, sleepCard, 'showSleepLog');
  }

  const nappyCard = readCard(props, 'NappyCard');
  if (nappyCard) {
    mergeCardFields(flat, nappyCard, 'showNappyLog');
  }

  const growthCard = readCard(props, 'GrowthCard');
  if (growthCard) {
    mergeCardFields(flat, growthCard);
  }

  const wellbeingCard = readCard(props, 'WellbeingCard');
  if (wellbeingCard) {
    mergeCardFields(flat, wellbeingCard);
  }

  return flat;
}

function stripNestedCardKeys(props: PropsRecord): PropsRecord {
  const flat = { ...props };

  for (const key of NESTED_CARD_KEYS) {
    delete flat[key];
  }

  return flat;
}

const FLATTENERS: Partial<Record<ModuleType, (props: PropsRecord) => PropsRecord>> =
  {
    food: flattenFoodProps,
    environmentExtended: flattenEnvironmentExtendedProps,
    fitness: flattenFitnessProps,
    pet: flattenPetProps,
    plant: flattenPlantProps,
    baby: flattenBabyProps,
  };

export function flattenCategoryModuleProps(
  type: ModuleType,
  props: PropsRecord,
): PropsRecord {
  const flattener = FLATTENERS[type];
  const flattened = flattener ? flattener(props) : props;
  return stripNestedCardKeys(flattened);
}
