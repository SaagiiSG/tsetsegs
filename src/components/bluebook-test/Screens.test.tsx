import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ALL_FIGURES } from '@/portal/topicFigures';
import { pickFigure } from './Transitions';
import { BreakScreen, ModuleOver, ResumeScreen, StandBy } from './Screens';

describe('loader figures', () => {
  it('has every approved figure once', () => {
    expect(ALL_FIGURES.length).toBe(new Set(ALL_FIGURES).size);
    expect(ALL_FIGURES.length).toBeGreaterThanOrEqual(50);
  });
  it('picks across the whole set', () => {
    expect(pickFigure(() => 0)).toBe(ALL_FIGURES[0]);
    expect(pickFigure(() => 0.9999)).toBe(ALL_FIGURES[ALL_FIGURES.length - 1]);
  });
});

describe('ModuleOver', () => {
  it('says what Bluebook says', () => {
    const html = renderToStaticMarkup(<ModuleOver />);
    for (const s of ['This Module Is Over', 'All your work has been saved.', 'You’ll move on automatically in just a moment.', 'Do not refresh this page or quit the app.']) expect(html).toContain(s);
  });
});

describe('StandBy', () => {
  it('says what Bluebook says', () => {
    const html = renderToStaticMarkup(<StandBy error={false} onRetry={() => {}} />);
    expect(html).toContain('Practice Is Over: Stand By!');
    expect(html).toContain('All your work has been saved, and we’re uploading it now. Do not refresh this page or quit the app.');
    expect(html).not.toContain('Try again');
  });
  it('offers a retry when saving failed', () => {
    const html = renderToStaticMarkup(<StandBy error onRetry={() => {}} />);
    expect(html).toContain('Some answers didn’t save. Check your connection.');
    expect(html).toContain('Try again');
  });
});

describe('BreakScreen', () => {
  it('counts down ten minutes and lists the break rules', () => {
    const html = renderToStaticMarkup(<BreakScreen studentName="Saagii Sergelen" onResume={() => {}} />);
    for (const s of [
      'Remaining Break Time:', '10:00', 'Resume Testing', 'Practice Test Break', 'Take a Break: Do Not Close Your Device', 'Saagii Sergelen',
      'Do not disturb students who are still testing.',
      'Do not exit the app or close your laptop.',
      'Do not access phones, smartwatches, textbooks, notes, or the internet.',
      'Do not eat or drink near any testing device.',
      'Do not speak in the testing room; outside the room, do not discuss the exam with anyone.',
    ]) expect(html).toContain(s);
  });
});

describe('ResumeScreen', () => {
  it('says the timer has not started', () => {
    const html = renderToStaticMarkup(<ResumeScreen studentName="Saagii Sergelen" onResume={() => {}} />);
    for (const s of ['Resume Testing Now', 'Your testing timer has not started counting down yet.', 'Resume Testing', 'Saagii Sergelen']) expect(html).toContain(s);
  });
});
