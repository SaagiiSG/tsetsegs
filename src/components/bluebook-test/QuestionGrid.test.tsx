import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuestionGrid, NavigatorContent, CheckYourWork } from './QuestionGrid';

const items = [{ answered: true, marked: false }, { answered: false, marked: true }, { answered: false, marked: false }];
const noop = () => {};
const box = (html: string, n: number) => html.match(new RegExp(`<button[^>]*aria-label="Question ${n}[^"]*"[^>]*>`))?.[0] ?? '';

describe('QuestionGrid', () => {
  const html = renderToStaticMarkup(<QuestionGrid items={items} current={2} onPick={noop} size="small" />);
  it('answered is filled blue', () => expect(box(html, 1)).toContain('bb-box-answered'));
  it('unanswered is dashed', () => expect(box(html, 3)).toContain('border-dashed'));
  it('marked shows the review flag', () => {
    expect(box(html, 2)).toContain('aria-label="Question 2, for review"');
    expect(html).toContain('aria-label="For Review"');
  });
  it('current carries aria-current', () => expect(box(html, 3)).toContain('aria-current="true"'));
  it('labels answered questions', () => expect(box(html, 1)).toContain('aria-label="Question 1, answered"'));
});

describe('NavigatorContent', () => {
  it('has the legend and Go to Review Page', () => {
    const html = renderToStaticMarkup(<NavigatorContent title="Section 1, Module 1: Math Questions" items={items} current={0} onPick={noop} onClose={noop} onReviewPage={noop} />);
    for (const s of ['Section 1, Module 1: Math Questions', 'Current', 'Unanswered', 'For Review', 'Go to Review Page']) expect(html).toContain(s);
  });
});

describe('CheckYourWork', () => {
  it('has Bluebook wording word for word', () => {
    const html = renderToStaticMarkup(<CheckYourWork title="Section 1, Module 1: Math Questions" items={items} onPick={noop} />);
    expect(html).toContain('Check Your Work');
    expect(html).toContain('On test day, you won’t be able to move on to the next module until time expires.');
    expect(html).toContain('For these practice questions, you can click <strong>Next</strong> when you’re ready to move on.');
  });
});
