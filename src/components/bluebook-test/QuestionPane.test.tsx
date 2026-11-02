import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { QuestionHeader, AnswerChoices, GridIn, SprDirections } from './QuestionPane';

const noop = () => {};
const options = { A: '64', B: '20', C: '16', D: '12' };
const choices = (p: Partial<Parameters<typeof AnswerChoices>[0]>) => renderToStaticMarkup(
  <AnswerChoices options={options} images={null} selected={null} crossed={[]} crossOutMode={false} onSelect={noop} onToggleCross={noop} {...p} />,
);
const choice = (html: string, letter: string) => html.match(new RegExp(`<button[^>]*role="radio"[^>]*data-letter="${letter}"[^>]*>[\\s\\S]*?</button>`))?.[0] ?? '';

describe('AnswerChoices', () => {
  it('marks the selected choice', () => {
    const html = choices({ selected: 'B' });
    expect(choice(html, 'B')).toContain('aria-checked="true"');
    expect(choice(html, 'A')).toContain('aria-checked="false"');
  });
  it('a crossed choice is struck through with Undo', () => {
    const html = choices({ crossed: ['C'], crossOutMode: true });
    expect(choice(html, 'C')).toContain('line-through');
    expect(html).toContain('Undo');
  });
  it('no cross-out buttons when ABC is off', () => expect(choices({})).not.toContain('Cross out'));
  it('cross-out buttons when ABC is on', () => expect(choices({ crossOutMode: true })).toContain('aria-label="Cross out A"'));
});

describe('QuestionHeader', () => {
  it('a marked question fills the flag', () => {
    const html = renderToStaticMarkup(<QuestionHeader number={3} marked onToggleMark={noop} crossOutMode={false} onToggleCrossOut={noop} />);
    expect(html).toContain('bb-flag-on');
    expect(html).toContain('Mark for Review');
    expect(html).toContain('>3<');
  });
  it('an unmarked question does not', () => {
    const html = renderToStaticMarkup(<QuestionHeader number={3} marked={false} onToggleMark={noop} crossOutMode={false} onToggleCrossOut={noop} />);
    expect(html).not.toContain('bb-flag-on');
  });
});

describe('GridIn', () => {
  it('previews a fraction with KaTeX', () => {
    const html = renderToStaticMarkup(<GridIn value="3/343" onChange={noop} />);
    expect(html).toContain('Answer Preview:');
    expect(html).toContain('mfrac');
  });
  it('caps typing at 6 characters', () => expect(renderToStaticMarkup(<GridIn value="" onChange={noop} />)).toContain('maxLength="6"'));
});

describe('SprDirections', () => {
  it('has the directions and the examples table', () => {
    const html = renderToStaticMarkup(<SprDirections />);
    expect(html).toContain('Student-produced response directions');
    expect(html).toContain('Unacceptable: will NOT receive credit');
    expect(html).toContain('Don’t enter <strong>symbols</strong> such as a percent sign, comma, or dollar sign.');
  });
  it('the examples table only fixes its column widths from tablet size up, so it fits a phone', () => {
    const html = renderToStaticMarkup(<SprDirections />);
    expect(html).toContain('md:w-[170px]');
    expect(html).not.toMatch(/[" ]w-\[\d+px\]/);
  });
});

describe('QuestionHeader on a typed answer', () => {
  it('has no ABC button', () => {
    const html = renderToStaticMarkup(<QuestionHeader number={2} marked={false} onToggleMark={() => {}} crossOutMode={false} />);
    expect(html).not.toContain('Cross out answer choices');
  });
});
