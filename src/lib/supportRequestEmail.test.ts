import { describe, expect, it } from 'vitest';
import { supportRequestRows, supportRequestSubject } from '../../supabase/functions/_shared/transactional-email-templates/support-request-fields';

describe('center support request owner alert', () => {
  it('keeps a staff-typed subject and center name on one subject line', () => {
    expect(supportRequestSubject({ subject: 'Bill\r\nBcc: spam@example.com', center_name: 'Acme\nAcademy' })).toBe('Support: Bill Bcc: spam@example.com (Acme Academy)');
    expect(supportRequestSubject({ subject: ' ', center_name: '' })).toBe('Support: new request (center)');
  });

  it('lists center, requester, role, email, subject and time; blanks show as a dash', () => {
    expect(supportRequestRows({ center_name: 'Acme', name: 'Bat', role: 'center_admin', email: 'bat@example.com', subject: 'Help', created_at: '2026-11-10T09:30:12.5+00:00' })).toEqual([
      ['Center', 'Acme'],
      ['From', 'Bat'],
      ['Role', 'Center admin'],
      ['Email', 'bat@example.com'],
      ['Subject', 'Help'],
      ['Sent', '2026-11-10 09:30 UTC'],
    ]);
    expect(supportRequestRows({ role: 'teacher' })).toEqual([
      ['Center', '—'], ['From', '—'], ['Role', 'Teacher'], ['Email', '—'], ['Subject', '—'], ['Sent', '—'],
    ]);
  });
});
