import ModuleCard from '@/components/ModuleCard';
import { generateId } from '@/utils/generateId';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
} from '@/types/rows';

export interface MedicalModuleProps {
  showSymptoms?: boolean;
  showSeverity?: boolean;
  showPain?: boolean;
  showMood?: boolean;
  showEnergy?: boolean;
  showStress?: boolean;
  showSleepQuality?: boolean;
  showPeriod?: boolean;
  showMedication?: boolean;

  symptomOptions?: string[];
  medicationOptions?: string[];

  rowOrder?: string[];

  moduleId?: string;
  title?: string;
  terminology?: {
    subject?: string;
  };

  onLog?: (entries: RowBatchLogEntry[]) => void;
}

const DEFAULT_ROW_ORDER = [
  'symptoms',
  'severity',
  'pain',
  'mood',
  'energy',
  'stress',
  'sleepQuality',
  'period',
  'medication',
] as const;

const LEVEL_OPTIONS = ['LOW', 'NORMAL', 'HIGH'] as [string, string, string];

function buildEnabledRows(props: MedicalModuleProps): Map<string, RowConfig> {
  const rows = new Map<string, RowConfig>();

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

  if (props.showSeverity) {
    rows.set('severity', {
      id: 'severity',
      type: 'scale',
      label: 'OVERALL SEVERITY',
      max: 5,
    });
  }

  if (props.showPain) {
    rows.set('pain', {
      id: 'pain',
      type: 'scale',
      label: 'PAIN LEVEL',
      max: 5,
    });
  }

  if (props.showMood) {
    rows.set('mood', {
      id: 'mood',
      type: 'level',
      label: 'MOOD',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showEnergy) {
    rows.set('energy', {
      id: 'energy',
      type: 'level',
      label: 'ENERGY',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showStress) {
    rows.set('stress', {
      id: 'stress',
      type: 'level',
      label: 'STRESS',
      options: LEVEL_OPTIONS,
    });
  }

  if (props.showSleepQuality) {
    rows.set('sleepQuality', {
      id: 'sleepQuality',
      type: 'scale',
      label: 'SLEEP QUALITY',
      max: 5,
    });
  }

  if (props.showPeriod) {
    rows.set('period', {
      id: 'period',
      type: 'toggle',
      label: 'PERIOD TODAY?',
    });
  }

  if (props.showMedication) {
    const medicationOptions = props.medicationOptions ?? [];

    if (medicationOptions.length > 0) {
      rows.set('medication', {
        id: 'medication',
        type: 'chips',
        label: 'MEDICATION TAKEN',
        options: medicationOptions,
        wrap: true,
        multi: true,
      });
    } else {
      rows.set('medication', {
        id: 'medication',
        type: 'toggle',
        label: 'MEDICATION TAKEN?',
      });
    }
  }

  return rows;
}

function orderRows(
  enabledRows: Map<string, RowConfig>,
  rowOrder?: string[],
): RowConfig[] {
  const ordered: RowConfig[] = [];
  const seen = new Set<string>();

  const order = rowOrder ?? [...DEFAULT_ROW_ORDER];

  for (const rowId of order) {
    const row = enabledRows.get(rowId);
    if (row) {
      ordered.push(row);
      seen.add(rowId);
    }
  }

  for (const rowId of DEFAULT_ROW_ORDER) {
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

function buildModuleConfig(props: MedicalModuleProps): ModuleCardConfig {
  const moduleId = props.moduleId ?? 'medical';
  const title = props.title ?? 'TODAY';
  const enabledRows = buildEnabledRows(props);

  return {
    id: moduleId,
    title,
    rows: orderRows(enabledRows, props.rowOrder),
  };
}

export default function MedicalModule(props: MedicalModuleProps) {
  const { moduleId = 'medical', onLog } = props;
  const config = buildModuleConfig(props);

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
