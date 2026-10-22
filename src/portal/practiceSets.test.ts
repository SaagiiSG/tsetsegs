import { describe, expect, it } from 'vitest';
import { PRACTICE_SETS, inPracticeSet, practiceSetFromParam, CB_FILTER } from './practiceSets';

describe('portal practice sets', () => {
  it('has exactly the 68, 150 and CB tabs, in that order', () => {
    expect(PRACTICE_SETS.map(s => s.label)).toEqual(['68', '150', 'CB']);
  });

  it('puts every math question outside 68 and 150 into CB, including the new 120', () => {
    expect(inPracticeSet('CB', 'CollegeBoard')).toBe(true);
    expect(inPracticeSet('CB', 'ANP120Aug3')).toBe(true);
    expect(inPracticeSet('CB', null)).toBe(true);
    expect(inPracticeSet('CB', '68')).toBe(false);
    expect(inPracticeSet('CB', 'SATMathTraining800')).toBe(false);
    expect(inPracticeSet('68', '68')).toBe(true);
    expect(inPracticeSet('SATMathTraining800', 'CollegeBoard')).toBe(false);
  });

  it('opens a sensible tab for any ?set= value', () => {
    expect(practiceSetFromParam(null)).toBe('68');
    expect(practiceSetFromParam('all')).toBe('68');
    expect(practiceSetFromParam('SATMathTraining800')).toBe('SATMathTraining800');
    expect(practiceSetFromParam('CB')).toBe('CB');
    expect(practiceSetFromParam('ANP120Aug3')).toBe('CB'); // old links to the new 120
  });

  it('gives the database the same CB rule', () => {
    expect(CB_FILTER).toBe('question_set.is.null,question_set.not.in.(68,SATMathTraining800)');
  });
});
