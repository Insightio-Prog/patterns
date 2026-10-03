import type { TrackerModule } from '@/types';

/** Which home-screen tab a module's card lives in (related modules share a tab). */
export function getModulePage(
  module: TrackerModule,
  index: number,
): { id: string; title: string } {
  const props = (module.props ?? {}) as Record<string, unknown>;
  switch (module.type) {
    case 'medical':
      return { id: 'health', title: props.showSymptoms === false ? 'Health' : 'Symptoms' };
    case 'mentalWellbeing':
      return { id: 'mind', title: 'Mind' };
    case 'food':
    case 'mealdraft':
      return { id: 'food', title: 'Food' };
    case 'environment':
    case 'environmentExtended':
      return { id: 'context', title: 'Context' };
    case 'sleep':
      return { id: 'sleep', title: 'Sleep' };
    case 'fitness':
    case 'weight':
    case 'timer':
      return { id: 'activity', title: 'Activity' };
    case 'pet':
      return { id: 'pet', title: 'Pet' };
    case 'plant':
      return { id: 'plant', title: 'Plant' };
    case 'baby':
      return { id: 'baby', title: 'Baby' };
    case 'social':
      return { id: 'social', title: 'Social' };
    case 'hobbies':
      return { id: 'hobbies', title: 'Hobbies' };
    case 'academic':
      return { id: 'academic', title: 'Study' };
    case 'metrics':
      return { id: 'metrics', title: 'Metrics' };
    case 'photo':
      return { id: 'photos', title: 'Photos' };
    case 'custom':
      return {
        id: `custom-${index}`,
        title: typeof props.title === 'string' && props.title ? props.title : 'Log',
      };
    default:
      return { id: 'log', title: 'Log' };
  }
}
