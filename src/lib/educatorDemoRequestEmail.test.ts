import { describe, expect, it } from 'vitest';
import { demoRequestRows, demoRequestSubject } from '../../supabase/functions/_shared/transactional-email-templates/educator-demo-request-fields';

describe('educator demo request owner alert', () => {
  it('keeps a visitor-typed institution on one subject line', () => {
    expect(demoRequestSubject({ institution_name: 'Acme\r\nBcc: spam@example.com' })).toBe('New demo request: Acme Bcc: spam@example.com');
    expect(demoRequestSubject({ institution_name: '  ' })).toBe('New demo request: educator');
  });

  it('lists every field, shows blanks as a dash and the time in UTC', () => {
    expect(demoRequestRows({ name: 'Bat', institution_name: 'Acme', email: 'bat@example.com', phone: '+976 9911', country: '', student_count: 40, created_at: '2026-11-10T09:30:12.5+00:00' })).toEqual([
      ['Name', 'Bat'],
      ['Center / school', 'Acme'],
      ['Email', 'bat@example.com'],
      ['Phone', '+976 9911'],
      ['Country', '—'],
      ['Students', '40'],
      ['Submitted', '2026-11-10 09:30 UTC'],
    ]);
  });

  it('does not throw on a missing or bad timestamp', () => {
    expect(demoRequestRows({ created_at: 'nope' }).at(-1)).toEqual(['Submitted', '—']);
    expect(demoRequestRows({}).at(-1)).toEqual(['Submitted', '—']);
  });
});
