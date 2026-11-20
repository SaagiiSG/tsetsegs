import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { FreeSectionDone } from './SoloLock';

const render = (subject: 'math' | 'english') => renderToStaticMarkup(<MemoryRouter><FreeSectionDone subject={subject} /></MemoryRouter>);

describe('free section congratulations', () => {
  it('names the subject, praises, and offers Premium with the lock button', () => {
    const math = render('math');
    expect(math).toContain('You finished the free Math section');
    expect(math).toContain('Try Premium free');
    expect(math).toContain('href="/student/premium"');
    expect(render('english')).toContain('You finished the free English section');
  });
});
