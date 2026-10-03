import ModuleCard from '@/components/ModuleCard';
import type { CustomMetricConfig } from '@/components/modules/MetricsModule';
import { generateId } from '@/utils/generateId';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
} from '@/types/rows';

export interface AcademicModuleProps {
  showStudyDuration?: boolean;
  showFocus?: boolean;
  showUnderstanding?: boolean;
  showRetention?: boolean;
  showMood?: boolean;
  showEnergy?: boolean;
  showGoalHit?: boolean;
  showRevision?: boolean;
  showExamStress?: boolean;
  showStreak?: boolean;
  showSubjects?: boolean;
  showTopics?: boolean;
  showBlocks?: boolean;

  customMetrics?: CustomMetricConfig[];

  subjectOptions?: string[];
  topicOptions?: string[];
  blockOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_ROW_ORDER = [
  'studyDuration',
  'focus',
  'understanding',
  'retention',
  'mood',
  'energy',
  'goalHit',
  'revision',
  'examStress',
  'subjects',
  'topics',
  'blocks',
  'streak',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];

function buildEnabledRows(props: AcademicModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

  if (props.showStudyDuration) {
    rows.set('studyDuration', {
      id: 'studyDuration',
      type: 'metric',
      label: 'STUDY DURATION',
      unit: 'mins',
      showTrend: true,
      step: 5,
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

  if (props.showUnderstanding) {
    rows.set('understanding', {
      id: 'understanding',
      type: 'scale',
      label: 'UNDERSTANDING',
      max: 5,
    });
  }

  if (props.showRetention) {
    rows.set('retention', {
      id: 'retention',
      type: 'scale',
      label: 'RETENTION',
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

  if (props.showEnergy) {
    rows.set('energy', {
      id: 'energy',
      type: 'level',
      label: 'ENERGY LEVEL',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showGoalHit) {
    rows.set('goalHit', {
      id: 'goalHit',
      type: 'toggle',
      label: 'STUDY GOAL HIT?',
    });
  }

  if (props.showRevision) {
    rows.set('revision', {
      id: 'revision',
      type: 'toggle',
      label: 'REVISION SESSION?',
    });
  }

  if (props.showExamStress) {
    rows.set('examStress', {
      id: 'examStress',
      type: 'scale',
      label: 'EXAM STRESS',
      max: 5,
    });
  }

  if (props.showStreak) {
    rows.set('streak', {
      id: 'streak',
      type: 'counter',
      label: 'STUDY STREAK',
      unitLabel: 'DAYS',
    });
  }

  if (props.showSubjects) {
    rows.set('subjects', {
      id: 'subjects',
      type: 'chips',
      label: 'SUBJECT TODAY',
      options: props.subjectOptions ?? [],
      wrap: true,
      multi: false,
    });
  }

  if (props.showTopics) {
    rows.set('topics', {
      id: 'topics',
      type: 'chips',
      label: 'TOPICS COVERED',
      options: props.topicOptions ?? [],
      wrap: true,
      multi: true,
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
  props: AcademicModuleProps,
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

function buildModuleConfig(props: AcademicModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'academic';
  const title = props.title ?? 'STUDY TODAY';
  const enabledRows = buildEnabledRows(props);

  return {
    id: moduleId,
    title,
    rows: orderRows(enabledRows, props),
  };
}

export default function AcademicModule(props: AcademicModuleProps) {
  const { moduleId = 'academic', onLog } = props;
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
