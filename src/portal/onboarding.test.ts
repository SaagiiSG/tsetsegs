import { describe, it, expect } from 'vitest';
import { onboardingStep, latchGate, canSkip, welcomeCopy, satDateOptions, helpMePick, defaultIntensity, ringPlanCopy, backStep, questionSubjects, stepSixMessage } from './onboarding';
const goals = (o = {}) => ({ speed: 2, hard: 5, medium: 10, intensity: null, sat_date: null, isSet: true, target_score: null, prior_score: null, weak_section: null, onboarding_step: null, onboarding_done_at: null, ...o });
describe('who sees onboarding', () => {
  it('never shows it to students from before the cutoff', () => { expect(onboardingStep(false, goals({ isSet: false }), false)).toBeNull(); expect(onboardingStep(false, undefined, false)).toBeNull(); });
  it('fails closed when eligibility could not be read', () => expect(onboardingStep(undefined, goals({ isSet: false }), false)).toBeNull());
  it('starts a new student at step 1', () => expect(onboardingStep(true, goals({ isSet: false }), false)).toBe(1));
  it('never forces in a student who answered before onboarding shipped', () => expect(onboardingStep(true, goals({ isSet: false }), true)).toBeNull());
  it('resumes where a closed tab stopped, even after the step-6 answer', () => {
    expect(onboardingStep(true, goals({ onboarding_step: 4 }), false)).toBe(4);
    expect(onboardingStep(true, goals({ isSet: false, onboarding_step: 7 }), true)).toBe(7);
  });
  it('skips a ring set the old way, a finished run, and an unreadable goals row', () => {
    expect(onboardingStep(true, goals(), false)).toBeNull();
    expect(onboardingStep(true, goals({ onboarding_step: 7, onboarding_done_at: '2026-10-25T10:00:00Z' }), false)).toBeNull();
    expect(onboardingStep(true, undefined, false)).toBeNull();
  });
  it('lets only steps 2-5 be skipped, and step 6 after a failed save', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(s => canSkip(s))).toEqual([false, true, true, true, true, false, false]);
    expect([5, 6, 7].map(s => canSkip(s, true))).toEqual([true, true, false]);
  });
});
describe('gate latch', () => {
  it('waits for the reads, then keeps its first decision for that user', () => {
    expect(latchGate(null, 'u', false, 1)).toBeNull();
    const l = latchGate(null, 'u', true, 1);
    expect(l).toEqual({ user: 'u', step: 1 });
    expect(latchGate(l, 'u', true, null)).toBe(l); // the step-6 answer makes the live value null: still onboarding
    const portal = latchGate(null, 'u', true, null);
    expect(latchGate(portal, 'u', true, 4)).toBe(portal); // a late refetch never swaps practice for onboarding
  });
  it('decides afresh for a different user on the same tab', () => expect(latchGate({ user: 'u', step: null }, 'v', true, 1)).toEqual({ user: 'v', step: 1 }));
});
describe('steps', () => {
  it('welcome', () => expect(welcomeCopy('Sky Prep')).toBe('Sky Prep set you up on FlowersOS. 6 quick steps, about 2 minutes.'));
  it('lists real upcoming SAT dates and prefills the center month', () => {
    const o = satDateOptions(new Date('2026-10-25T12:00:00'), null);
    expect(o.options.map(d => d.value)).toEqual(['2026-11-07', '2026-12-05', '2027-03-06', '2027-05-01', '2027-06-05']);
    expect(o.options[0].label).toBe('Sat, Nov 7, 2026'); expect(o.prefill).toBeNull();
    expect(satDateOptions(new Date('2026-10-25T12:00:00'), '2026-12').prefill).toBe('2026-12-05');
    expect(satDateOptions(new Date('2026-10-25T12:00:00'), '2027-05').prefill).toBe('2027-05-01');
    expect(satDateOptions(new Date('2026-10-25T12:00:00'), '2027-04').prefill).toBeNull();
    expect(satDateOptions(new Date('2026-11-08T12:00:00'), '2026-11')).toEqual({ options: expect.any(Array), prefill: null });
  });
  it('help me pick', () => expect([null, 1500, 1200, 1230, 700].map(helpMePick)).toEqual([1300, 1600, 1350, 1400, 1000]));
  it('defaults the ring pace from the SAT date', () => expect([null, 13, 60, 90, 200].map(defaultIntensity)).toEqual(['gradual', 'intense', 'intense', 'gradual', 'with_the_flow']));
  it('does honest maths', () => {
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 0, null)).toBe('About 15 questions a day. Your Math score prediction unlocks in about 4 weeks.');
    expect(ringPlanCopy({ hard: 8, medium: 15 }, 0, null)).toBe('About 23 questions a day. Your Math score prediction unlocks in about 3 weeks.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 400, null)).toBe('About 15 questions a day. Your Math score prediction unlocks in about a week.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 440, null)).toBe('About 15 questions a day. Your Math score prediction is already unlocked.');
  });
  it('Back skips the step-6 question and stops at step 1', () => expect([1, 2, 6, 7].map(backStep)).toEqual([null, 1, 5, 5]));
  it('R&W pickers hear the prediction is Math only', () => {
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 100, 'reading_writing')).toBe('About 15 questions a day. The score prediction covers Math only and unlocks after 340 more Math questions.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 440, 'reading_writing')).toBe('About 15 questions a day. The score prediction covers Math only and is already unlocked.');
  });
  it('Math pickers keep today\'s copy', () => {
    for (const w of ['math', 'same', null]) expect(ringPlanCopy({ hard: 5, medium: 10 }, 100, w)).toBe('About 15 questions a day. Your Math score prediction unlocks in about 3 weeks.');
  });
  it('picks the question section', () => { expect(questionSubjects('reading_writing')).toEqual(['english', 'English']); expect(questionSubjects('same')).toEqual(['math', 'Math']); expect(questionSubjects(null)).toEqual(['math', 'Math']); });
  it('never promises ring progress it did not make', () => {
    expect(stepSixMessage({ is_correct: true, points: 10 }, 1, 'Medium')).toBe('+10 points, your ring moved');
    expect(stepSixMessage({ is_correct: true, points: 5 }, 2, 'medium')).toBe('+5 points, your ring moved');
    expect(stepSixMessage({ is_correct: true, points: 10 }, 1, 'easy')).toBe('+10 points');
    expect(stepSixMessage({ is_correct: true, points: 0 }, 1, 'medium')).toBe('Correct, your ring moved');
    expect(stepSixMessage({ is_correct: false, points: 0 }, 1, 'medium')).toBe('Not quite. Read how it works, then try once more.');
    expect(stepSixMessage({ is_correct: false, points: 0 }, 2, 'medium')).toBe("Good try — here's how it works");
    expect(stepSixMessage(null, 1, 'medium')).toBe("We couldn't save that answer. Check your connection and try again.");
  });
});
