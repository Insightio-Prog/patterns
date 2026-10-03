export type { MedicalModuleProps } from '@/components/modules/MedicalModule';
export type {
  CustomMetricConfig,
  MetricsModuleProps,
} from '@/components/modules/MetricsModule';
export type { FoodModuleProps } from '@/components/modules/FoodModule';
export type { SleepModuleProps } from '@/components/modules/SleepModule';
export type {
  DistanceUnit,
  ExerciseItem,
  WeightUnit,
} from '@/types/fitness';
export type { FitnessModuleProps } from '@/components/modules/FitnessModule';
export type {
  BowelMovementMode,
  PetModuleProps,
} from '@/components/modules/PetModule';
export type { MentalWellbeingModuleProps } from '@/components/modules/MentalWellbeingModule';
export type { HobbiesModuleProps } from '@/components/modules/HobbiesModule';
export type { AcademicModuleProps } from '@/components/modules/AcademicModule';
export type {
  PlantModuleProps,
  WateringMode,
} from '@/components/modules/PlantModule';
export type {
  BabyModuleProps,
  FeedEntry,
  FeedType,
  LengthUnit,
  NappyEntry,
  SleepEntry,
} from '@/types/baby';
export type { SocialModuleProps } from '@/components/modules/SocialModule';
export type {
  CustomModuleProps,
  CustomRowSpec,
} from '@/components/modules/CustomModule';
export type {
  EnvironmentModuleExtendedProps,
  ExerciseMode,
} from '@/components/modules/EnvironmentModuleExtended';

export interface Message {

  id: string;

  role: 'ai' | 'user';

  text?: string;

  isConfig?: boolean;

  isSetupConfirmation?: boolean;

  config?: TrackerConfig;

  timestamp?: string;

}



export type ModuleType =

  | 'scale'

  | 'toggle'

  | 'level'

  | 'chips'

  | 'note'

  | 'counter'

  | 'multiselect'

  | 'photo'

  | 'diary'

  | 'mealdraft'

  | 'checklist'

  | 'weight'

  | 'timer'

  | 'environment'

  | 'medical'

  | 'metrics'

  | 'food'

  | 'environmentExtended'

  | 'sleep'

  | 'timeInput'

  | 'fitness'

  | 'pet'

  | 'mentalWellbeing'

  | 'hobbies'

  | 'academic'

  | 'plant'

  | 'baby'

  | 'social'

  | 'correlationChart'

  | 'custom';



export interface TrackerModule {

  type: ModuleType;

  props: Record<string, unknown>;

}



export interface TrackerConfig {
  /** Optional display name chosen by the user (shown on the home tab). */
  name?: string;

  profile: string;

  subject: string;

  trackingGoal: string;

  modules: TrackerModule[];

  terminology: {

    subject: string;

    event: string;

    mealDraft: string;

    timerSession: string;

    pdfRecipient: string;

  };

  aiContext: string;

  /** Row ids whose logs count as an "event" (episode) on the home screen. */

  eventRows?: string[];

}



export type ConversationStage =

  | 'opening'

  | 'goal'

  | 'inputs'

  | 'confirm'

  | 'complete';



export type DiaryEntryType = string;



export interface DiaryEntry {

  id: string;

  timestamp: string;

  type: DiaryEntryType;

  label: string;

  value: string;

  mediaUri?: string;

}



export interface WeatherSnapshot {
  fetchedAtTs: number;
  lat: number;
  lng: number;
  temperatureC: number;
  temperatureF: number;
  humidity: number;
  conditions: string;
  uvIndex?: number;
  windSpeedKph?: number;
}



export interface LogEntry {

  id: string;

  timestamp: string;

  type: ModuleType;

  label: string;

  value: unknown;

  /** True for demo entries created by "Load sample data". */
  sample?: boolean;

}



export interface CachedInsight {

  kicker: string;

  insight: string;

  boldTerms?: string[];

}


