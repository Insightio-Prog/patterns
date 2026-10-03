import type { TrackerConfig } from '@/types';

export interface TrackerTemplate {
  id: string;
  title: string;
  tag: string;
  blurb: string;
  /** Short list shown on the picker card. */
  tracks: string[];
  config: TrackerConfig;
}

/**
 * Pre-built trackers, so visitors can try the app without using the AI chat.
 * Each one is a normal TrackerConfig, exactly what the AI would produce.
 * (Future idea: a free marketplace where people share trackers they've built.)
 */
export const TRACKER_TEMPLATES: TrackerTemplate[] = [
  {
    id: 'heartburn',
    title: 'Heartburn and food',
    tag: 'Symptom',
    blurb: 'Log what you eat and how bad it gets, then look for trigger foods.',
    tracks: ['Meals and triggers', 'Severity', 'Stress', 'Medication'],
    config: {
      name: 'Heartburn',
      profile: 'heartburn_triggers',
      subject: 'Heartburn',
      trackingGoal: 'Find which foods and habits trigger heartburn.',
      modules: [
        {
          type: 'custom',
          props: {
            title: 'MEALS AND TRIGGERS',
            moduleId: 'heartburn_meals',
            rows: [
              {
                id: 'meal',
                type: 'chips',
                label: 'What did you have?',
                options: ['Coffee', 'Spicy food', 'Fatty meal', 'Alcohol', 'Tomato', 'Late meal', 'Chocolate'],
                wrap: true,
                multi: true,
              },
              { id: 'stress', type: 'level', label: 'Stress today' },
            ],
          },
        },
        {
          type: 'custom',
          props: {
            title: 'HEARTBURN',
            moduleId: 'heartburn_episode',
            rows: [
              { id: 'severity', type: 'scale', label: 'How bad?', max: 5 },
              { id: 'medication', type: 'toggle', label: 'Took antacids?' },
            ],
          },
        },
        {
          type: 'correlationChart',
          props: {
            label: 'FOOD VS HEARTBURN',
            input: 'food_intake',
            output: 'symptom_severity',
            inputLabel: 'Food',
            outputLabel: 'Heartburn severity',
          },
        },
        { type: 'note', props: {} },
        { type: 'diary', props: {} },
      ],
      terminology: {
        subject: 'you',
        event: 'episode',
        mealDraft: 'MEAL',
        timerSession: 'SESSION',
        pdfRecipient: 'GP',
      },
      aiContext:
        'The user tracks meals, stress and heartburn severity to find trigger foods. Compare heavier-heartburn days with what was eaten.',
      eventRows: ['severity'],
    },
  },
  {
    id: 'dog',
    title: 'Dog wellbeing',
    tag: 'Pet',
    blurb: 'Walks, meals and mood for your dog, so changes in routine stand out.',
    tracks: ['Walks', 'Meals', 'Energy', 'Mood'],
    config: {
      name: 'Biscuit',
      profile: 'dog_wellbeing',
      subject: 'Biscuit',
      trackingGoal: 'Track daily routine and how the dog is feeling.',
      modules: [
        {
          type: 'custom',
          props: {
            title: 'ROUTINE',
            moduleId: 'dog_routine',
            rows: [
              { id: 'walks', type: 'counter', label: 'Walks' },
              { id: 'meals', type: 'counter', label: 'Meals' },
              { id: 'treats', type: 'toggle', label: 'Had treats?' },
            ],
          },
        },
        {
          type: 'custom',
          props: {
            title: 'HOW THEY ARE',
            moduleId: 'dog_wellbeing',
            rows: [
              { id: 'energy', type: 'level', label: 'Energy' },
              { id: 'mood', type: 'scale', label: 'Mood', max: 5 },
              {
                id: 'signs',
                type: 'chips',
                label: 'Anything unusual?',
                options: ['Scratching', 'Limping', 'Off food', 'Restless', 'Vomited'],
                wrap: true,
                multi: true,
              },
            ],
          },
        },
        {
          type: 'correlationChart',
          props: {
            label: 'ROUTINE VS MOOD',
            input: 'routine',
            output: 'mood',
            inputLabel: 'Routine',
            outputLabel: 'Mood',
          },
        },
        { type: 'note', props: {} },
        { type: 'diary', props: {} },
      ],
      terminology: {
        subject: 'Biscuit',
        event: 'entry',
        mealDraft: 'MEAL',
        timerSession: 'WALK',
        pdfRecipient: 'vet',
      },
      aiContext:
        "The user tracks their dog's daily walks, meals, energy and mood to spot changes in routine or health worth mentioning to a vet.",
      eventRows: ['mood'],
    },
  },
  {
    id: 'sleep-mood',
    title: 'Sleep and mood',
    tag: 'Wellbeing',
    blurb: 'See how last night’s sleep and your caffeine line up with how you feel.',
    tracks: ['Sleep hours', 'Caffeine', 'Mood', 'Energy'],
    config: {
      name: 'Sleep and mood',
      profile: 'sleep_mood',
      subject: 'Sleep and mood',
      trackingGoal: 'Understand how sleep and caffeine affect mood and energy.',
      modules: [
        {
          type: 'custom',
          props: {
            title: 'LAST NIGHT',
            moduleId: 'sleep_night',
            rows: [
              { id: 'sleep_hours', type: 'metric', label: 'Hours slept', unit: 'H' },
              { id: 'bedtime', type: 'timeInput', label: 'Bedtime' },
              { id: 'caffeine', type: 'counter', label: 'Caffeine drinks' },
            ],
          },
        },
        {
          type: 'custom',
          props: {
            title: 'TODAY',
            moduleId: 'sleep_today',
            rows: [
              { id: 'mood', type: 'scale', label: 'Mood', max: 5 },
              { id: 'energy', type: 'level', label: 'Energy' },
            ],
          },
        },
        {
          type: 'correlationChart',
          props: {
            label: 'SLEEP VS MOOD',
            input: 'sleep',
            output: 'mood',
            inputLabel: 'Sleep',
            outputLabel: 'Mood',
          },
        },
        { type: 'note', props: {} },
        { type: 'diary', props: {} },
      ],
      terminology: {
        subject: 'you',
        event: 'entry',
        mealDraft: 'MEAL',
        timerSession: 'SESSION',
        pdfRecipient: 'GP',
      },
      aiContext:
        'The user logs hours slept, bedtime and caffeine alongside daily mood and energy, to see how sleep habits affect how they feel.',
      eventRows: ['mood'],
    },
  },
  {
    id: 'running',
    title: 'Running and recovery',
    tag: 'Fitness',
    blurb: 'Distance, effort and recovery, to balance training against rest.',
    tracks: ['Distance', 'Effort', 'Soreness', 'Recovery'],
    config: {
      name: 'Running',
      profile: 'running_recovery',
      subject: 'Running',
      trackingGoal: 'Balance training load against recovery.',
      modules: [
        {
          type: 'custom',
          props: {
            title: 'RUN',
            moduleId: 'run_session',
            rows: [
              { id: 'distance', type: 'metric', label: 'Distance', unit: 'KM' },
              { id: 'effort', type: 'scale', label: 'Effort', max: 10 },
              {
                id: 'run_type',
                type: 'chips',
                label: 'Type of run',
                options: ['Easy', 'Tempo', 'Intervals', 'Long run'],
                wrap: true,
              },
            ],
          },
        },
        {
          type: 'custom',
          props: {
            title: 'RECOVERY',
            moduleId: 'run_recovery',
            rows: [
              { id: 'soreness', type: 'level', label: 'Soreness' },
              { id: 'recovery', type: 'scale', label: 'Recovery', max: 5 },
              { id: 'stretched', type: 'toggle', label: 'Stretched?' },
            ],
          },
        },
        {
          type: 'correlationChart',
          props: {
            label: 'TRAINING VS RECOVERY',
            input: 'training_load',
            output: 'recovery',
            inputLabel: 'Training load',
            outputLabel: 'Recovery',
          },
        },
        { type: 'note', props: {} },
        { type: 'diary', props: {} },
      ],
      terminology: {
        subject: 'you',
        event: 'run',
        mealDraft: 'MEAL',
        timerSession: 'RUN',
        pdfRecipient: 'coach',
      },
      aiContext:
        'The user logs runs (distance, effort, type) and recovery (soreness, recovery score) to balance training load against rest.',
      eventRows: ['recovery'],
    },
  },
];
