// Patterns — usage limits and tier configuration
// Update these values here only — never hardcode in components

export const LIMITS = {
  free: {
    trackers: 1,
    aiEnabled: false,
  },
  premium: {
    trackers: 3,
    aiEnabled: true,
    weeklyInsights: 4, // per calendar month
    postEventInsights: 8, // per calendar month
    monthlySummary: 1, // per calendar month
    onboardingExchanges: 8, // hard cap per session
  },
} as const;

export const TOKEN_LIMITS = {
  onboarding: 500, // per exchange — keeps costs <1p total
  weeklyInsight: 300, // matches Perenna/Refluxio
  postEvent: 300, // matches Perenna/Refluxio
  summary: 500, // 90-day summary needs more room
} as const;

export const MONTHLY_RESET_DAY = 1; // resets on 1st of month
