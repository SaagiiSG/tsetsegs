import type { NextStep } from './bluebookTest';

// The whole Bluebook test flow as one pure reducer. Events that don't fit the current stage return the
// same object, so a late timer tick or a double click can't end a module twice.

/** Check Your Work ignores Next this soon after it opens, so a double click on the last question's Next can't end the module. */
export const REVIEW_GUARD_MS = 400;

export type Stage =
  | { name: 'loading' } | { name: 'switching' } | { name: 'test' } | { name: 'review'; since: number }
  | { name: 'moduleOver'; moduleId: string } | { name: 'break'; moduleId: string } | { name: 'resume'; moduleId: string }
  | { name: 'standby' } | { name: 'iris' } | { name: 'results' };

export type StageEvent =
  | { type: 'ready' } | { type: 'openReview'; at: number } | { type: 'backToQuestions' }
  | { type: 'moduleDone'; next: NextStep } | { type: 'reviewNext'; next: NextStep; at: number } | { type: 'advanced' }
  | { type: 'breakDone' } | { type: 'resumeClicked' } | { type: 'scored' } | { type: 'irisClosed' };

export function stageReducer(s: Stage, e: StageEvent): Stage {
  switch (e.type) {
    case 'ready':
      return s.name === 'loading' || s.name === 'switching' ? { name: 'test' } : s;
    case 'openReview':
      return s.name === 'test' ? { name: 'review', since: e.at } : s;
    case 'backToQuestions':
      return s.name === 'review' ? { name: 'test' } : s;
    case 'reviewNext':
      if (s.name !== 'review' || e.at - s.since < REVIEW_GUARD_MS) return s;
      return endModule(e.next);
    case 'moduleDone':
      return s.name === 'test' || s.name === 'review' ? endModule(e.next) : s;
    case 'advanced':
      return s.name === 'moduleOver' ? { name: 'switching' } : s;
    case 'breakDone':
      return s.name === 'break' ? { name: 'resume', moduleId: s.moduleId } : s;
    case 'resumeClicked':
      return s.name === 'resume' ? { name: 'switching' } : s;
    case 'scored':
      return s.name === 'standby' ? { name: 'iris' } : s;
    case 'irisClosed':
      return s.name === 'iris' ? { name: 'results' } : s;
  }
}

function endModule(next: NextStep): Stage {
  if (next.kind === 'same-section') return { name: 'moduleOver', moduleId: next.moduleId };
  if (next.kind === 'break') return { name: 'break', moduleId: next.moduleId };
  return { name: 'standby' };
}
