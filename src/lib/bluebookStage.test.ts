import { describe, it, expect } from 'vitest';
import { stageReducer, type Stage, type StageEvent } from './bluebookStage';

const walk = (events: StageEvent[]) => {
  const names: string[] = [];
  events.reduce<Stage>((s, e) => { const n = stageReducer(s, e); names.push(n.name); return n; }, { name: 'loading' });
  return names;
};

describe('stage flow', () => {
  it('math-only path', () => expect(walk([
    { type: 'ready' }, { type: 'openReview' }, { type: 'moduleDone', next: { kind: 'same-section', moduleId: 'm2' } },
    { type: 'advanced' }, { type: 'ready' }, { type: 'openReview' }, { type: 'moduleDone', next: { kind: 'finish' } },
    { type: 'scored' }, { type: 'irisClosed' },
  ])).toEqual(['test', 'review', 'moduleOver', 'switching', 'test', 'review', 'standby', 'iris', 'results']));

  it('full test goes through the break', () => expect(walk([
    { type: 'ready' }, { type: 'moduleDone', next: { kind: 'break', moduleId: 'm1' } },
    { type: 'breakDone' }, { type: 'resumeClicked' }, { type: 'ready' },
  ])).toEqual(['test', 'break', 'resume', 'switching', 'test']));

  it('Back on Check Your Work returns to the questions', () =>
    expect(stageReducer({ name: 'review' }, { type: 'backToQuestions' })).toEqual({ name: 'test' }));

  it('module over and break carry the next module', () => {
    expect(stageReducer({ name: 'test' }, { type: 'moduleDone', next: { kind: 'same-section', moduleId: 'm2' } })).toEqual({ name: 'moduleOver', moduleId: 'm2' });
    expect(stageReducer({ name: 'break', moduleId: 'm1' }, { type: 'breakDone' })).toEqual({ name: 'resume', moduleId: 'm1' });
  });

  it('time running out on Check Your Work ends the module once', () => {
    const over = stageReducer({ name: 'review' }, { type: 'moduleDone', next: { kind: 'same-section', moduleId: 'm2' } });
    expect(stageReducer(over, { type: 'moduleDone', next: { kind: 'finish' } })).toBe(over);
  });

  it('a stray ready during the test does nothing', () => { const s = { name: 'test' } as const; expect(stageReducer(s, { type: 'ready' })).toBe(s); });
});
