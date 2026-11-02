import { describe, it, expect } from 'vitest';
import { stageReducer, type Stage, type StageEvent } from './bluebookStage';

const walk = (events: StageEvent[]) => {
  const names: string[] = [];
  events.reduce<Stage>((s, e) => { const n = stageReducer(s, e); names.push(n.name); return n; }, { name: 'loading' });
  return names;
};

describe('stage flow', () => {
  it('math-only path', () => expect(walk([
    { type: 'ready' }, { type: 'openReview', at: 0 }, { type: 'reviewNext', next: { kind: 'same-section', moduleId: 'm2' }, at: 5000 },
    { type: 'advanced' }, { type: 'ready' }, { type: 'openReview', at: 9000 }, { type: 'moduleDone', next: { kind: 'finish' } },
    { type: 'scored' }, { type: 'irisClosed' },
  ])).toEqual(['test', 'review', 'moduleOver', 'switching', 'test', 'review', 'standby', 'iris', 'results']));

  it('full test goes through the break', () => expect(walk([
    { type: 'ready' }, { type: 'moduleDone', next: { kind: 'break', moduleId: 'm1' } },
    { type: 'breakDone' }, { type: 'resumeClicked' }, { type: 'ready' },
  ])).toEqual(['test', 'break', 'resume', 'switching', 'test']));

  it('Back on Check Your Work returns to the questions', () =>
    expect(stageReducer({ name: 'review', since: 0 }, { type: 'backToQuestions' })).toEqual({ name: 'test' }));

  it('module over and break carry the next module', () => {
    expect(stageReducer({ name: 'test' }, { type: 'moduleDone', next: { kind: 'same-section', moduleId: 'm2' } })).toEqual({ name: 'moduleOver', moduleId: 'm2' });
    expect(stageReducer({ name: 'break', moduleId: 'm1' }, { type: 'breakDone' })).toEqual({ name: 'resume', moduleId: 'm1' });
  });

  it('time running out on Check Your Work ends the module once', () => {
    const over = stageReducer({ name: 'review', since: 0 }, { type: 'moduleDone', next: { kind: 'same-section', moduleId: 'm2' } });
    expect(stageReducer(over, { type: 'moduleDone', next: { kind: 'finish' } })).toBe(over);
    expect(stageReducer(over, { type: 'reviewNext', next: { kind: 'finish' }, at: 99999 })).toBe(over);
  });

  it('a quick second click on Next after the last question does not end the module', () => {
    const review = stageReducer({ name: 'test' }, { type: 'openReview', at: 1000 });
    expect(stageReducer(review, { type: 'reviewNext', next: { kind: 'finish' }, at: 1200 })).toBe(review);
    expect(stageReducer(review, { type: 'reviewNext', next: { kind: 'finish' }, at: 1600 })).toEqual({ name: 'standby' });
  });

  it('a stray ready during the test does nothing', () => { const s = { name: 'test' } as const; expect(stageReducer(s, { type: 'ready' })).toBe(s); });
});
