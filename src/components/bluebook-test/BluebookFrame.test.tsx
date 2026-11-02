import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
vi.mock('@/components/student/DesmosCalculator', () => ({ useCalculatorSnap: () => null }));
import { BluebookFrame } from './BluebookFrame';

const pill = (label: string) => ({ label, open: false, onOpenChange: () => {}, content: null });
const render = (p: Partial<Parameters<typeof BluebookFrame>[0]>) => renderToStaticMarkup(
  <BluebookFrame sectionLabel="Section 1, Module 1: Math" directions={null} remaining={2100} timerHidden={false} onToggleTimer={() => {}}
    tools={[]} menu={[]} studentName="Saagii Sergelen" {...p}>body</BluebookFrame>,
);

describe('BluebookFrame', () => {
  it('renders the Bluebook chrome', () => {
    const html = render({ sectionLabel: 'Section 1, Module 1: Math', remaining: 2100, timerHidden: false, studentName: 'Saagii Sergelen', pill: pill('Question 1 of 22'), onNext: () => {} });
    for (const s of ['bluebook', 'Section 1, Module 1: Math', '35:00', 'Hide', 'THIS IS A PRACTICE TEST', 'Saagii Sergelen', 'Question 1 of 22', 'Next', 'Directions']) expect(html).toContain(s);
    expect(html).not.toContain('>Back<');
  });
  it('hidden timer shows Show and no digits', () => { const html = render({ remaining: 900, timerHidden: true }); expect(html).toContain('Show'); expect(html).not.toContain('15:00'); });
  it('hidden timer comes back at 5 minutes', () => expect(render({ remaining: 300, timerHidden: true })).toContain('5:00'));
  it('dimmed frame shows the spinner instead of the body', () => {
    const html = render({ dimmed: true });
    expect(html).toContain('bb-spinner');
    expect(html).not.toContain('>body<');
  });
});
