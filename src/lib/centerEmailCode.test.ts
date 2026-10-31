import { describe, expect, it } from 'vitest';
import { canSend, checkCode, hashCode, newCode } from '../../supabase/functions/tenant-accounts/emailCode';
import { centerEmailCodeSubject } from '../../supabase/functions/_shared/transactional-email-templates/center-email-code-fields';

const now = new Date('2026-10-30T12:00:00Z');
const ago = (s: number) => new Date(now.getTime() - s * 1000).toISOString();

describe('center email code', () => {
  it('makes 6 digit codes', () => {
    for (let i = 0; i < 200; i++) expect(newCode()).toMatch(/^\d{6}$/);
  });
  it('hashes with the email lowercased', async () => {
    expect(await hashCode('A@x.com', '123456')).toBe(await hashCode('a@x.com', '123456'));
    expect(await hashCode('a@x.com', '123456')).not.toBe(await hashCode('a@x.com', '654321'));
  });
  it('rate limits sends', () => {
    expect(canSend([], now).ok).toBe(true);
    expect(canSend([ago(30)], now)).toEqual({ ok: false, error: 'Wait a minute before asking for another code.' });
    expect(canSend([ago(120), ago(600), ago(900), ago(1200), ago(1800)], now)).toEqual({ ok: false, error: 'Too many codes. Try again in an hour.' });
    expect(canSend([ago(120)], now).ok).toBe(true);
  });
  it('checks a code', () => {
    const row = { code_hash: 'h', expires_at: new Date(now.getTime() + 60000).toISOString(), attempts: 0 };
    expect(checkCode(null, 'h', now)).toBe('expired');
    expect(checkCode({ ...row, expires_at: ago(1) }, 'h', now)).toBe('expired');
    expect(checkCode({ ...row, attempts: 5 }, 'h', now)).toBe('locked');
    expect(checkCode(row, 'x', now)).toBe('wrong');
    expect(checkCode(row, 'h', now)).toBe('ok');
  });
  it('keeps the subject on one line', () => {
    expect(centerEmailCodeSubject({ code: '123456', center_name: 'Acme\r\nBcc: x' })).toBe('123456 is your Acme Bcc: x code');
  });
});
