import { describe, it, expect } from 'vitest';
import { onboardingStep, canSkip, welcomeCopy, satDateOptions, helpMePick, defaultIntensity, ringPlanCopy, questionSubjects, stepSixMessage } from './onboarding';
const goals = (o = {}) => ({ speed: 2, hard: 5, medium: 10, intensity: null, sat_date: null, isSet: true, target_score: null, prior_score: null, weak_section: null, onboarding_step: null, onboarding_done_at: null, ...o });
describe('who sees onboarding', () => {
  it('never shows it to students from before the cutoff', () => { expect(onboardingStep(false, goals({ isSet: false }))).toBeNull(); expect(onboardingStep(false, undefined)).toBeNull(); });
  it('fails closed when eligibility could not be read', () => expect(onboardingStep(undefined, goals({ isSet: false }))).toBeNull());
  it('starts a new student at step 1', () => expect(onboardingStep(true, goals({ isSet: false }))).toBe(1));
  it('resumes where a closed tab stopped', () => expect(onboardingStep(true, goals({ onboarding_step: 4 }))).toBe(4));
  it('skips a ring set the old way, a finished run, and an unreadable goals row', () => {
    expect(onboardingStep(true, goals())).toBeNull();
    expect(onboardingStep(true, goals({ onboarding_step: 7, onboarding_done_at: '2026-10-25T10:00:00Z' }))).toBeNull();
    expect(onboardingStep(true, undefined)).toBeNull();
  });
  it('lets only steps 2-5 be skipped', () => expect([1, 2, 3, 4, 5, 6, 7].map(canSkip)).toEqual([false, true, true, true, true, false, false]));
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
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 0)).toBe('About 15 questions a day. Your Math score prediction unlocks in about 4 weeks.');
    expect(ringPlanCopy({ hard: 8, medium: 15 }, 0)).toBe('About 23 questions a day. Your Math score prediction unlocks in about 3 weeks.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 400)).toBe('About 15 questions a day. Your Math score prediction unlocks in about a week.');
    expect(ringPlanCopy({ hard: 5, medium: 10 }, 440)).toBe('About 15 questions a day. Your Math score prediction is already unlocked.');
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
