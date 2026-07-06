export interface TourStep {
  /** CSS selector — usually a [data-tour="..."] attribute */
  selector: string;
  title: string;
  body: string;
  /** Preferred placement of the tooltip relative to the target */
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  /** Optional NEW-dot feature id to acknowledge when this step is viewed */
  featureId?: string;
}

export interface TourDefinition {
  key: string; // stable id used for localStorage + Help replay
  /** Route predicate — returns true when this tour applies to the current pathname */
  match: (pathname: string) => boolean;
  steps: TourStep[];
}

/**
 * Release stamp — bump this string to replay tours for every student
 * after a new set of features ships.
 */
export const TOUR_RELEASE = 'v1.2026.07';

export const TOURS: TourDefinition[] = [
  {
    key: 'home',
    match: (p) => p === '/practice/home' || p === '/practice' || p === '/practice/',
    steps: [
      {
        selector: '[data-tour="home-greeting"]',
        title: "What's new 👋",
        body: "We've shipped a bunch of upgrades across your practice area. This quick tour highlights everything new since your last visit.",
        placement: 'bottom',
      },
      {
        selector: '[data-tour="daily-ring"]',
        title: "Today's Goal ring",
        body: 'Close all three rings — Speed, Medium, and Hard — every day. Tap it to edit goals or view your streak history.',
        placement: 'right',
      },
      {
        selector: '[data-tour="streak-chip"]',
        title: 'Streak & freezers',
        body: 'Your daily streak lives here. If you miss a day, a snowflake freezer will save it automatically. Tap for full history.',
        placement: 'bottom',
        featureId: 'streak-chip',
      },
      {
        selector: '[data-tour="quick-fab"]',
        title: 'Quick menu ✨',
        body: 'Tap the sparkle (or swipe up from the bottom edge) to jump anywhere, toggle the calculator, or resume your last question.',
        placement: 'bottom',
        featureId: 'quick-fab',
      },
      {
        selector: '[data-tour="help-button"]',
        title: 'Replay anytime',
        body: 'Stuck? Tap the ❓ button to replay the tour for whatever page you\'re on.',
        placement: 'bottom',
        featureId: 'help-button',
      },
    ],
  },
  {
    key: 'bluebook',
    match: (p) => p.startsWith('/practice/bluebook'),
    steps: [
      {
        selector: '[data-tour="bluebook-videos-tab"]',
        title: 'New: Videos tab',
        body: 'Full walkthroughs for every official practice test — organized by module.',
        placement: 'bottom',
        featureId: 'bluebook-videos-tab',
      },
      {
        selector: '[data-tour="bluebook-test-select"]',
        title: 'Jump between tests',
        body: 'Use this dropdown to hop straight to Practice Test 4 through 10 without leaving the page.',
        placement: 'bottom',
        featureId: 'bluebook-test-select',
      },
      {
        selector: '[data-tour="bluebook-player"]',
        title: 'YouTube-style layout',
        body: 'Watch on the left, browse the up-next list on the right. On mobile it stacks so the player is always front and center.',
        placement: 'top',
        featureId: 'bluebook-player',
      },
    ],
  },
  {
    key: 'dashboard',
    match: (p) => p === '/practice/dashboard',
    steps: [
      {
        selector: '[data-tour="quick-fab"]',
        title: 'Faster navigation',
        body: 'Every practice mode is one tap away from the ✨ quick menu — Smart Practice, Speed Mode, Review Queue, and more.',
        placement: 'bottom',
      },
    ],
  },
  {
    key: 'challenges',
    match: (p) => p.startsWith('/practice/challenges'),
    steps: [
      {
        selector: '[data-tour="challenge-hud"]',
        title: 'Active Challenge HUD',
        body: "Your live challenge floats here. Drag it to any edge, collapse it, or expand it — it remembers where you put it.",
        placement: 'left',
        featureId: 'challenge-hud',
      },
      {
        selector: '[data-tour="challenge-hud-reset"]',
        title: 'Lost the HUD?',
        body: 'If the HUD drifts off-screen on mobile, tap Reset HUD to snap it back to the top-center.',
        placement: 'left',
        featureId: 'challenge-hud-reset',
      },
    ],
  },
];

export function findTourForRoute(pathname: string): TourDefinition | null {
  return TOURS.find((t) => t.match(pathname)) ?? null;
}
