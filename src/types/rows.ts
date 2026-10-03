export type RowType =
  | 'scale'
  | 'level'
  | 'toggle'
  | 'chips'
  | 'counter'
  | 'metric'
  | 'checklist'
  | 'timeInput'
  | 'note';

export interface RowConfigBase {
  id: string;
  type: RowType;
  label: string;
}

export interface ScaleRowConfig extends RowConfigBase {
  type: 'scale';
  max?: 5 | 10;
}

export interface LevelRowConfig extends RowConfigBase {
  type: 'level';
  options?: [string, string, string];
}

export interface ToggleRowConfig extends RowConfigBase {
  type: 'toggle';
}

export interface ChipsRowConfig extends RowConfigBase {
  type: 'chips';
  options: string[];
  wrap?: boolean;
  multi?: boolean;
  showTimestamp?: boolean;
}

export interface CounterRowConfig extends RowConfigBase {
  type: 'counter';
  unitLabel?: string;
}

export interface MetricRowConfig extends RowConfigBase {
  type: 'metric';
  unit?: string;
  showTrend?: boolean;
  step?: number;
}

export interface ChecklistRowConfig extends RowConfigBase {
  type: 'checklist';
  items: string[];
}

export interface TimeInputRowConfig extends RowConfigBase {
  type: 'timeInput';
  placeholder?: string;
  defaultValue?: string;
}

export type RowConfig =
  | ScaleRowConfig
  | LevelRowConfig
  | ToggleRowConfig
  | ChipsRowConfig
  | CounterRowConfig
  | MetricRowConfig
  | ChecklistRowConfig
  | TimeInputRowConfig;

export interface ModuleCardConfig {
  id: string;
  title: string;
  rows: RowConfig[];
}

export type RowValue =
  | { type: 'scale'; value: number }
  | { type: 'level'; value: string }
  | { type: 'toggle'; value: boolean }
  | { type: 'chips'; value: string[]; timestamp?: string }
  | { type: 'counter'; value: number }
  | { type: 'metric'; value: number }
  | { type: 'checklist'; value: Record<string, boolean> }
  | { type: 'timeInput'; value: string }
  | { type: 'note'; value: string };

export interface RowLogPayload {
  rowId: string;
  value: RowValue;
}

export interface RowBatchLogEntry {
  id: string;
  rowId: string;
  moduleId: string;
  type: RowType;
  value: RowValue;
  ts: string;
}
