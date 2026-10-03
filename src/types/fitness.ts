export type WeightUnit = 'kg' | 'lbs';
export type DistanceUnit = 'km' | 'miles';

export interface ExerciseItem {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  weightUnit?: WeightUnit;
  duration?: number;
  notes?: string;
}
