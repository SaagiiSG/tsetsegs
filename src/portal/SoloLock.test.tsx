import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FreeSectionDone } from './SoloLock';

describe('free section congratulations', () => {
  it('names the subject, praises, and offers Premium with the lock button', () => {
    const math = renderToStaticMarkup(<FreeSectionDone subject="math" />);
    expect(math).toContain('You finished the free Math section');
    expect(math).toContain('Try Premium free for 7 days');
    expect(math).toContain('href="/?lang=eng#pricing"');
    expect(renderToStaticMarkup(<FreeSectionDone subject="english" />)).toContain('You finished the free English section');
  });
});
