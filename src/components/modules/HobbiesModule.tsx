import ModuleCard from '@/components/ModuleCard';
import type { CustomMetricConfig } from '@/components/modules/MetricsModule';
import { generateId } from '@/utils/generateId';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
} from '@/types/rows';

export interface HobbiesModuleProps {
  showSessionDuration?: boolean;
  showQuality?: boolean;
  showEnjoyment?: boolean;
  showFocus?: boolean;
  showMood?: boolean;
  showProgress?: boolean;
  showStreak?: boolean;
  showGoalHit?: boolean;
  showMilestone?: boolean;
  showBlocks?: boolean;
  showActivities?: boolean;

  customMetrics?: CustomMetricConfig[];

  blockOptions?: string[];
  activityOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_ROW_ORDER = [
  'sessionDuration',
  'quality',
  'enjoyment',
  'focus',
  'mood',
  'progress',
  'goalHit',
  'milestone',
  'activities',
  'blocks',
  'streak',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];

function buildEnabledRows(props: HobbiesModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showSessionDuration) {
    rows.set('sessionDuration', {
      id: 'sessionDuration',
      type: 'metric',
      label: 'SESSION DURATION',
      unit: 'mins',
      showTrend: true,
      step: 5,
    });
  }

  if (props.showQuality) {
    rows.set('quality', {
      id: 'quality',
      type: 'scale',
      label: 'SESSION QUALITY',
      max: 5,
    });
  }

  if (props.showEnjoyment) {
    rows.set('enjoyment', {
      id: 'enjoyment',
      type: 'scale',
      label: 'ENJOYMENT',
      max: 5,
    });
  }

  if (props.showFocus) {
    rows.set('focus', {
      id: 'focus',
      type: 'scale',
      label: 'FOCUS LEVEL',
      max: 5,
    });
  }

  if (props.showMood) {
    rows.set('mood', {
      id: 'mood',
      type: 'level',
      label: 'MOOD GOING IN',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showProgress) {
    rows.set('progress', {
      id: 'progress',
      type: 'level',
      label: 'PROGRESS TODAY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showStreak) {
    rows.set('streak', {
      id: 'streak',
      type: 'counter',
      label: 'DAY STREAK',
      unitLabel: 'DAYS',
    });
  }

  if (props.showGoalHit) {
    rows.set('goalHit', {
      id: 'goalHit',
      type: 'toggle',
      label: 'GOAL HIT TODAY?',
    });
  }

  if (props.showMilestone) {
    rows.set('milestone', {
      id: 'milestone',
      type: 'toggle',
      label: 'MILESTONE REACHED?',
    });
  }

  if (props.showBlocks) {
    rows.set('blocks', {
      id: 'blocks',
      type: 'chips',
      label: 'WHAT GOT IN THE WAY',
      options: props.blockOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  if (props.showActivities) {
    rows.set('activities', {
      id: 'activities',
      type: 'chips',
      label: 'ACTIVITIES TODAY',
      options: props.activityOptions ?? [],
      wrap: true,
      multi: true,
    });
  }

  for (const metric of props.customMetrics ?? []) {
    rows.set(metric.id, {
      id: metric.id,
      type: 'metric',
      label: metric.label,
      unit: metric.unit,
      showTrend: true,
      step: metric.step ?? 1,
    });
  }

  return rows;
}

function getDefaultOrder(customMetrics?: CustomMetricConfig[]): string[] {
  return [
    ...DEFAULT_ROW_ORDER,
    ...(customMetrics?.map((metric) => metric.id) ?? []),
  ];
}

function orderRows(
  enabledRows: Map<string, RowConfig>,
  props: HobbiesModuleProps,
): RowConfig[] {
  const ordered: RowConfig[] = [];
  const seen = new Set<string>();
  const order = props.rowOrder ?? getDefaultOrder(props.customMetrics);

  const pushRow = (rowId: string) => {
    if (seen.has(rowId)) {
      return;
    }

    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
      seen.add(rowId);
    }
  };

  for (const rowId of order) {
    pushRow(rowId);
  }

  for (const rowId of getDefaultOrder(props.customMetrics)) {
    pushRow(rowId);
  }

  return ordered;
}

function buildModuleConfig(props: HobbiesModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'hobbies';
  const title = props.title ?? 'SESSION TODAY';
  const enabledRows = buildEnabledRows(props);

  return {
    id: moduleId,
    title,
    rows: orderRows(enabledRows, props),
  };
}

export default function HobbiesModule(props: HobbiesModuleProps) {
  const { moduleId = 'hobbies', onLog } = props;
  const config = buildModuleConfig(props);

  if (config.rows.length === 0) {
    return null;
  }

  const handleLog = (payload: RowLogPayload[]) => {
    const ts = new Date().toISOString();
    const entries: RowBatchLogEntry[] = payload.map(({ rowId, value }) => ({
      id: generateId(),
      rowId,
      moduleId,
      type: value.type,
      value,
      ts,
    }));

    void Promise.resolve(onLog?.(entries)).catch(() => {
      // fail silently — never block or show error to user
    });
  };

  return <ModuleCard config={config} onLog={handleLog} />;
}
