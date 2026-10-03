import type { WeightUnit } from '@/types/fitness';
import type { RowBatchLogEntry } from '@/types/rows';

export type FeedType = 'breast' | 'bottle' | 'solids';
export type LengthUnit = 'cm' | 'in';

export interface FeedEntry {
  id: string;
  type: FeedType;
  time: string;
  durationMins?: number;
  side?: 'LEFT' | 'RIGHT' | 'BOTH';
  amountMl?: number;
  food?: string;
  amountSolids?: string;
  notes?: string;
}

export interface SleepEntry {
  id: string;
  startTime: string;
  endTime?: string;
  durationMins?: number;
  type: 'NAP' | 'NIGHT';
}

export interface NappyEntry {
  id: string;
  time: string;
  type: 'WET' | 'DIRTY' | 'BOTH' | 'DRY';
  notes?: string;
}

export interface BabyModuleProps {
  showFeedLog?: boolean;
  showBreastfeeding?: boolean;
  showBottle?: boolean;
  showSolids?: boolean;

  showSleepLog?: boolean;
  showNappyLog?: boolean;

  showWeight?: boolean;
  showLength?: boolean;
  showHeadCircumference?: boolean;

  showMood?: boolean;
  showParentEnergy?: boolean;
  showSymptoms?: boolean;
  showMedication?: boolean;

  weightUnit?: WeightUnit;
  lengthUnit?: LengthUnit;

  symptomOptions?: string[];
  medicationOptions?: string[];

  growthRowOrder?: string[];
  wellbeingRowOrder?: string[];

  moduleId?: string;
  feedCardTitle?: string;
  sleepCardTitle?: string;
  nappyCardTitle?: string;
  growthCardTitle?: string;
  wellbeingCardTitle?: string;
  terminology?: {
    subject?: string;
  };

  onFeedLog?: (entries: FeedEntry[]) => void;
  onSleepLog?: (entries: SleepEntry[]) => void;
  onNappyLog?: (entries: NappyEntry[]) => void;
  onGrowthLog?: (entries: RowBatchLogEntry[]) => void;
  onWellbeingLog?: (entries: RowBatchLogEntry[]) => void;
}
