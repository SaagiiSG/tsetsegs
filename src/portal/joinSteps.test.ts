import { describe, expect, it } from 'vitest';
import { canContinue, joinSteps, type JoinForm } from './joinSteps';

const empty: JoinForm = { name: '', phone: '', email: '', emailCode: '', password: '', school: '', grade: '' };

describe('joinSteps', () => {
  it('lists steps per path', () => {
    expect(joinSteps('google')).toEqual(['start', 'name', 'phone', 'school', 'done']);
    expect(joinSteps('email')).toEqual(['start', 'name', 'phone', 'email', 'code', 'password', 'school', 'done']);
  });
  it('validates each step', () => {
    expect(canContinue('name', { ...empty, name: 'A' })).toBe(false);
    expect(canContinue('name', { ...empty, name: 'Ab' })).toBe(true);
    expect(canContinue('phone', { ...empty, phone: '12345' })).toBe(false);
    expect(canContinue('phone', { ...empty, phone: '99112233' })).toBe(true);
    expect(canContinue('email', { ...empty, email: 'a@b' })).toBe(false);
    expect(canContinue('email', { ...empty, email: 'a@b.co' })).toBe(true);
    expect(canContinue('code', { ...empty, emailCode: '12a456' })).toBe(false);
    expect(canContinue('code', { ...empty, emailCode: '123456' })).toBe(true);
    expect(canContinue('password', { ...empty, password: 'abcdefgh' })).toBe(false);
    expect(canContinue('password', { ...empty, password: 'abcdefg1' })).toBe(true);
    expect(canContinue('school', empty)).toBe(true);
  });
});
