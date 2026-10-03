import ScaleRow from '@/components/rows/ScaleRow';
import LevelRow from '@/components/rows/LevelRow';
import ToggleRow from '@/components/rows/ToggleRow';
import ChipsRow from '@/components/rows/ChipsRow';
import CounterRow from '@/components/rows/CounterRow';
import MetricRow from '@/components/rows/MetricRow';
import ChecklistRow from '@/components/rows/ChecklistRow';
import TimeInputRow from '@/components/rows/TimeInputRow';
import type { RowConfig, RowValue } from '@/types/rows';

export interface ModuleRowProps {
  config: RowConfig;
  value: RowValue | null;
  onChange: (value: RowValue | null) => void;
  moduleId: string;
}

export function isRowRenderable(config: RowConfig): boolean {
  switch (config.type) {
    case 'chips':
      return Array.isArray(config.options) && config.options.length > 0;
    case 'checklist':
      return Array.isArray(config.items) && config.items.length > 0;
    case 'level': {
      const options = config.options ?? ['LOW', 'NORMAL', 'HIGH'];
      return options.length > 0;
    }
    default:
      return true;
  }
}

export function filterRenderableRows(rows: RowConfig[]): RowConfig[] {
  return rows.filter((row) => {
    if (isRowRenderable(row)) {
      return true;
    }

    if (__DEV__) {
      console.warn('[ModuleRow] skipped empty row:', row.label);
    }

    return false;
  });
}

function warnAndSkipRow(label: string): null {
  if (__DEV__) {
    console.warn('[ModuleRow] skipped empty row:', label);
  }

  return null;
}

export default function ModuleRow({
  config,
  value,
  onChange,
  moduleId,
}: ModuleRowProps) {
  if (!isRowRenderable(config)) {
    return warnAndSkipRow(config.label);
  }

  switch (config.type) {
    case 'scale':
      return (
        <ScaleRow config={config} value={value} onChange={onChange} />
      );
    case 'level':
      return (
        <LevelRow config={config} value={value} onChange={onChange} />
      );
    case 'toggle':
      return (
        <ToggleRow config={config} value={value} onChange={onChange} />
      );
    case 'chips':
      return (
        <ChipsRow config={config} value={value} onChange={onChange} />
      );
    case 'counter':
      return (
        <CounterRow config={config} value={value} onChange={onChange} />
      );
    case 'metric':
      return (
        <MetricRow
          config={config}
          value={value}
          onChange={onChange}
          moduleId={moduleId}
        />
      );
    case 'checklist':
      return (
        <ChecklistRow config={config} value={value} onChange={onChange} />
      );
    case 'timeInput':
      return (
        <TimeInputRow config={config} value={value} onChange={onChange} />
      );
    default: {
      const _exhaustive: never = config;
      return _exhaustive;
    }
  }
}
