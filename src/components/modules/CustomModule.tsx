import ModuleCard from '@/components/ModuleCard';
import { filterRenderableRows } from '@/components/rows/ModuleRow';
import { generateId } from '@/utils/generateId';
import type {
  ModuleCardConfig,
  RowBatchLogEntry,
  RowConfig,
  RowLogPayload,
} from '@/types/rows';

const MAX_ROWS_PER_CARD = 10;

const VALID_ROW_TYPES = new Set<CustomRowSpec['type']>([
  'scale',
  'level',
  'toggle',
  'chips',
  'counter',
  'metric',
  'checklist',
  'timeInput',
]);

export interface CustomRowSpec {
  id: string;
  type:
    | 'scale'
    | 'level'
    | 'toggle'
    | 'chips'
    | 'counter'
    | 'metric'
    | 'checklist'
    | 'timeInput';
  label: string;
  options?: string[];
  max?: number;
  unit?: string;
  prefix?: string;
  wrap?: boolean;
  multi?: boolean;
}

export interface CustomModuleProps {
  title: string;
  rows: CustomRowSpec[];
  moduleId?: string;
  onLog?: (entries: RowBatchLogEntry[]) => void;
}

function resolveScaleMax(max: number | undefined): 5 | 10 | null {
  if (max === undefined) {
    return 5;
  }

  if (max === 5 || max === 10) {
    return max;
  }

  return null;
}

function sanitizeCustomRowSpec(spec: CustomRowSpec): CustomRowSpec | null {
  if (spec.type === 'scale') {
    const max = resolveScaleMax(spec.max);

    if (max === null) {
      if (__DEV__) {
        console.warn(
          '[CustomModule] skipped scale row with invalid max (must be 5 or 10):',
          spec.label,
        );
      }

      return null;
    }

    return { ...spec, max };
  }

  if (spec.type === 'level') {
    if (spec.options && spec.options.length !== 3) {
      if (__DEV__) {
        console.warn(
          '[CustomModule] skipped level row — options must be exactly 3 or omitted:',
          spec.label,
        );
      }

      return null;
    }

    if (!spec.options) {
      const { options: _options, ...rest } = spec;
      return rest;
    }

    return spec;
  }

  if (spec.type === 'metric') {
    if (spec.prefix && spec.unit) {
      if (__DEV__) {
        console.warn(
          '[CustomModule] metric row has both prefix and unit — using prefix only:',
          spec.label,
        );
      }

      const { unit: _unit, ...rest } = spec;
      return rest;
    }

    return spec;
  }

  return spec;
}

function mapCustomRowSpec(spec: CustomRowSpec): RowConfig | null {
  if (!VALID_ROW_TYPES.has(spec.type)) {
    if (__DEV__) {
      console.warn('[CustomModule] skipped unknown row type:', spec.type);
    }

    return null;
  }

  const sanitized = sanitizeCustomRowSpec(spec);

  if (!sanitized) {
    return null;
  }

  switch (sanitized.type) {
    case 'scale':
      return {
        id: sanitized.id,
        type: 'scale',
        label: sanitized.label,
        max: sanitized.max === 10 ? 10 : 5,
      };
    case 'level': {
      const options = sanitized.options;

      if (options && options.length === 3) {
        return {
          id: sanitized.id,
          type: 'level',
          label: sanitized.label,
          options: [options[0], options[1], options[2]],
        };
      }

      return {
        id: sanitized.id,
        type: 'level',
        label: sanitized.label,
      };
    }
    case 'toggle':
      return {
        id: sanitized.id,
        type: 'toggle',
        label: sanitized.label,
      };
    case 'chips':
      return {
        id: sanitized.id,
        type: 'chips',
        label: sanitized.label,
        options: sanitized.options ?? [],
        wrap: sanitized.wrap,
        multi: sanitized.multi,
      };
    case 'counter':
      return {
        id: sanitized.id,
        type: 'counter',
        label: sanitized.label,
        unitLabel: sanitized.unit,
      };
    case 'metric':
      return {
        id: sanitized.id,
        type: 'metric',
        label: sanitized.label,
        unit: sanitized.prefix ?? sanitized.unit,
        showTrend: true,
        step: 1,
      };
    case 'checklist':
      return {
        id: sanitized.id,
        type: 'checklist',
        label: sanitized.label,
        items: sanitized.options ?? [],
      };
    case 'timeInput':
      return {
        id: sanitized.id,
        type: 'timeInput',
        label: sanitized.label,
      };
    default:
      return null;
  }
}

function buildRowConfigs(rows: CustomRowSpec[]): RowConfig[] {
  const cappedRows = rows.slice(0, MAX_ROWS_PER_CARD);

  if (__DEV__ && rows.length > MAX_ROWS_PER_CARD) {
    console.warn(
      `[CustomModule] ignored ${rows.length - MAX_ROWS_PER_CARD} rows over cap of ${MAX_ROWS_PER_CARD}`,
    );
  }

  const mapped = cappedRows
    .map((spec) => mapCustomRowSpec(spec))
    .filter((row): row is RowConfig => row !== null);

  return filterRenderableRows(mapped);
}

export function normalizeCustomModuleProps(
  props: Record<string, unknown>,
): Record<string, unknown> | null {
  const title = typeof props.title === 'string' ? props.title.trim() : '';
  const rowsRaw = Array.isArray(props.rows) ? props.rows : [];
  const rows: CustomRowSpec[] = [];

  for (const row of rowsRaw) {
    if (!row || typeof row !== 'object') {
      continue;
    }

    const record = row as Record<string, unknown>;
    const id = typeof record.id === 'string' ? record.id.trim() : '';
    const type = typeof record.type === 'string' ? record.type.trim() : '';
    const label = typeof record.label === 'string' ? record.label.trim() : '';

    if (!id || !type || !label) {
      if (__DEV__) {
        console.warn('[CustomModule] dropped invalid row spec:', row);
      }

      continue;
    }

    if (!VALID_ROW_TYPES.has(type as CustomRowSpec['type'])) {
      if (__DEV__) {
        console.warn('[CustomModule] skipped unknown row type:', type);
      }

      continue;
    }

    const spec: CustomRowSpec = {
      id,
      type: type as CustomRowSpec['type'],
      label,
    };

    if (Array.isArray(record.options)) {
      spec.options = record.options.filter(
        (option): option is string => typeof option === 'string',
      );
    }

    if (typeof record.max === 'number') {
      spec.max = record.max;
    }

    if (typeof record.unit === 'string') {
      spec.unit = record.unit;
    }

    if (typeof record.prefix === 'string') {
      spec.prefix = record.prefix;
    }

    if (typeof record.wrap === 'boolean') {
      spec.wrap = record.wrap;
    }

    if (typeof record.multi === 'boolean') {
      spec.multi = record.multi;
    }

    const sanitized = sanitizeCustomRowSpec(spec);

    if (sanitized) {
      rows.push(sanitized);
    }
  }

  const renderableRows = buildRowConfigs(rows);

  if (renderableRows.length === 0) {
    return null;
  }

  return {
    ...props,
    title: title || 'TODAY',
    rows: rows.slice(0, MAX_ROWS_PER_CARD),
    moduleId:
      typeof props.moduleId === 'string' ? props.moduleId : undefined,
  };
}

function buildModuleConfig(
  moduleId: string,
  title: string,
  rows: CustomRowSpec[],
): ModuleCardConfig {
  return {
    id: moduleId,
    title,
    rows: buildRowConfigs(rows),
  };
}

export default function CustomModule({
  title,
  rows,
  moduleId = 'custom',
  onLog,
}: CustomModuleProps) {
  const config = buildModuleConfig(moduleId, title, rows);

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
      // fail silently
    });
  };

  return <ModuleCard config={config} onLog={handleLog} />;
}
