import { describe, expect, it } from 'vitest';
import { searchTerm } from './CenterPracticeHub';

describe('searchTerm', () => {
  it('drops characters that would break the PostgREST or() filter', () => {
    expect(searchTerm('  CB(12), x*%  ')).toBe('CB 12 x');
  });
  it('keeps plain text and IDs as typed', () => {
    expect(searchTerm('68012')).toBe('68012');
    expect(searchTerm('slope of the line')).toBe('slope of the line');
  });
});
