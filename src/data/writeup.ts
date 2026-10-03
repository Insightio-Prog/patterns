/**
 * Copy for the demo's side panels (wide screens only).
 * Edit freely: this file is just text. First person is Stewart's voice.
 */

export const REPO_URL = ''; // add the GitHub link here when the repo exists

export const DEMO_NOTE =
  'This is a live demo. The AI chat runs on a small, limited budget, so if it pauses, the templates and the builder work without any AI.';

export interface WriteupSection {
  heading: string;
  paragraphs?: string[];
  bullets?: string[];
}

export const WRITEUP_TITLE = 'Patterns';
export const WRITEUP_TAGLINE = 'Describe what you want to track. Claude builds the tracker.';

export const WRITEUP: WriteupSection[] = [
  {
    heading: 'What it does',
    paragraphs: [
      'Patterns is a tracker for anything with inputs and outcomes: a symptom, a pet, a habit, a training block. You tell it what you want to keep an eye on, and it builds a tracker that fits.',
      'Then you log, and it looks for patterns: which foods line up with heartburn, how sleep lines up with mood, how training load lines up with recovery.',
    ],
  },
  {
    heading: 'How it works',
    bullets: [
      'A short chat with Claude works out what you want to track.',
      'Claude picks from a library of pre-built modules and returns a JSON config. It never writes UI code.',
      'The app renders that config as cards, a diary, a weekly view and a correlation chart.',
      'Not keen on AI? Start from a template or build your own in the builder. They all produce the same kind of config.',
    ],
  },
  {
    heading: 'How it was made',
    paragraphs: [
      'I\'m a chef, not a trained developer. I can read a bit of C#, and that\'s about it. I built Patterns by working with Claude and Cursor: I decide what it should do and how it should feel, Claude and Cursor write the code, and I test it, break it and send it back.',
      'I\'m open about that because it\'s the point. The skill I\'ve built is knowing what to ask for, spotting what\'s wrong and steering it until it works.',
    ],
  },
  {
    heading: 'The tech',
    bullets: [
      'Expo, React Native and TypeScript, exported to the web with expo-router.',
      'Config-driven UI: one TrackerConfig type drives every screen.',
      'Claude (Sonnet) through a Cloudflare Worker proxy, in two steps: an interview, then config generation.',
      'Data stays on your device (local storage). There is no account and no backend.',
    ],
  },
  {
    heading: 'What I\'d improve',
    bullets: [
      'Lock the AI proxy down further: fixed prompt and model on the server, rate limits and bot checks.',
      'Let you edit the options on AI-built cards in the builder.',
      'Stronger pattern-finding than the current heavier-day versus lighter-day comparison.',
      'Tests for the config parsing.',
      'A free marketplace where people share the trackers they build.',
    ],
  },
];

export interface ScreenNote {
  title: string;
  body: string;
  tips?: string[];
}

/** Left panel: what the current screen is for. Matched against the route path. */
export const SCREEN_NOTES: Array<{ match: (path: string) => boolean; note: ScreenNote }> = [
  {
    match: (p) => p.startsWith('/launch-fork') || p === '/' || p === '',
    note: {
      title: 'Choose how to start',
      body: 'Three ways in, and they all end up with the same kind of tracker.',
      tips: [
        'Let AI do it: a short chat, then Claude builds the tracker.',
        'Start from a template: instant, no AI needed.',
        'Build your own: pick the cards yourself.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/onboarding'),
    note: {
      title: 'The AI interview',
      body: 'Claude asks a few short questions, one at a time, then returns a tracker config. You see a building screen while the second request generates it.',
      tips: [
        'Try: "my dog", "heartburn" or "a houseplant".',
        'The chat is capped at a handful of messages to keep costs down.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/templates'),
    note: {
      title: 'Templates',
      body: 'Ready-made trackers stored as plain configs, the same shape the AI produces. Nothing is sent anywhere.',
      tips: ['Leave the sample data ticked to see the charts working straight away.'],
    },
  },
  {
    match: (p) => p.startsWith('/builder-canvas'),
    note: {
      title: 'The builder',
      body: 'Edit your tracker: rename it, add or remove cards, reorder rows. Cards the AI built are kept as they are.',
      tips: [
        'Add a custom card for your own inputs.',
        'Add a premade module for things like notes or a counter.',
        'The pencil renames the tracker.',
      ],
    },
  },
  {
    match: (p) => p.startsWith('/builder'),
    note: {
      title: 'Build your own',
      body: 'Start with a blank tracker and add cards one at a time.',
    },
  },
  {
    match: (p) => p.includes('home') || p.includes('patterns') || p.includes('log') || p.includes('report'),
    note: {
      title: 'Your tracker',
      body: 'The top card shows today and this week. Below it, swipe between the input cards, then the pattern chart, notes and the daily summary.',
      tips: [
        'Tap a card, log something, and watch the diary update.',
        'The pattern chart compares inputs with outcomes. Sample data is labelled as such.',
        'The gear opens tracker options: load or remove sample data, or reset.',
        'The pencil opens the builder to change the tracker.',
      ],
    },
  },
];
