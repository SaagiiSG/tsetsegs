import type { NextStep } from './bluebookTest';

// The whole Bluebook test flow as one pure reducer. Events that don't fit the current stage return the
// same object, so a late timer tick or a double click can't end a module twice.

export type Stage =
  | { name: 'loading' } | { name: 'switching' } | { name: 'test' } | { name: 'review' }
  | { name: 'moduleOver'; moduleId: string } | { name: 'break'; moduleId: string } | { name: 'resume'; moduleId: string }
  | { name: 'standby' } | { name: 'iris' } | { name: 'results' };

export type StageEvent =
  | { type: 'ready' } | { type: 'openReview' } | { type: 'backToQuestions' }
  | { type: 'moduleDone'; next: NextStep } | { type: 'advanced' }
  | { type: 'breakDone' } | { type: 'resumeClicked' } | { type: 'scored' } | { type: 'irisClosed' };

export function stageReducer(s: Stage, e: StageEvent): Stage {
  switch (e.type) {
    case 'ready':
      return s.name === 'loading' || s.name === 'switching' ? { name: 'test' } : s;
    case 'openReview':
      return s.name === 'test' ? { name: 'review' } : s;
    case 'backToQuestions':
      return s.name === 'review' ? { name: 'test' } : s;
    case 'moduleDone':
      if (s.name !== 'test' && s.name !== 'review') return s;
      if (e.next.kind === 'same-section') return { name: 'moduleOver', moduleId: e.next.moduleId };
      if (e.next.kind === 'break') return { name: 'break', moduleId: e.next.moduleId };
      return { name: 'standby' };
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
