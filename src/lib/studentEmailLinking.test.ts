import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), invoke: vi.fn(), signOut: vi.fn() }));
vi.mock('@/integrations/supabase/client', () => ({ supabase: {
  auth: { getSession: mocks.getSession, signOut: mocks.signOut },
  functions: { invoke: mocks.invoke },
} }));
import { completeStudentGoogleLink, STUDENT_EMAIL_LINKED_EVENT } from './studentEmailLinking';

describe('Google connection preserves practice access', () => {
  let events: EventTarget;
  let storage: Map<string, string>;
  beforeEach(() => {
    vi.clearAllMocks();
    events = new EventTarget();
    storage = new Map([['student_session_id', 'test-session'], ['student_token', 'test-token']]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => storage.get(key) ?? null,
      removeItem: (key: string) => storage.delete(key),
    });
    vi.stubGlobal('window', {
      location: { href: 'http://localhost/practice/dashboard?link_email=1' },
      history: { replaceState: vi.fn() },
      dispatchEvent: (event: Event) => events.dispatchEvent(event),
    });
    mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'google-user' } } } });
    mocks.invoke.mockResolvedValue({ data: { ok: true, email: 'student@example.test' }, error: null });
    mocks.signOut.mockResolvedValue({ error: null });
  });

  it('unlocks as soon as linking succeeds, before cleanup finishes, preserving student login', async () => {
    let finishCleanup: (() => void) | undefined;
    mocks.signOut.mockImplementation(() => new Promise<void>((resolve) => { finishCleanup = resolve; }));
    const unlocked = vi.fn();
    events.addEventListener(STUDENT_EMAIL_LINKED_EVENT, unlocked);
    const completion = completeStudentGoogleLink('student-1');
    await vi.waitFor(() => expect(unlocked).toHaveBeenCalledTimes(1));
    expect(storage.get('student_session_id')).toBe('test-session');
    expect(storage.get('student_token')).toBe('test-token');
    expect(mocks.signOut).toHaveBeenCalledWith({ scope: 'local' });
    finishCleanup?.();
    await expect(completion).resolves.toBe('student@example.test');
  });

  it('shares one completion when multiple views observe the same return', async () => {
    const first = completeStudentGoogleLink('student-2');
    const second = completeStudentGoogleLink('student-2');
    expect(second).toBe(first);
    await first;
    expect(mocks.invoke).toHaveBeenCalledTimes(1);
    expect(mocks.invoke).toHaveBeenCalledWith('link-google-email', {
      body: { student_account_id: 'student-2' },
      headers: { 'x-student-session-id': 'test-session', 'x-student-token': 'test-token' },
    });
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it('never unlocks when the server rejects the Google link', async () => {
    mocks.invoke.mockResolvedValue({ data: { error: 'Connection rejected' }, error: null });
    const unlocked = vi.fn();
    events.addEventListener(STUDENT_EMAIL_LINKED_EVENT, unlocked);
    await expect(completeStudentGoogleLink('student-3')).rejects.toThrow('Connection rejected');
    expect(unlocked).not.toHaveBeenCalled();
    expect(storage.get('student_session_id')).toBe('test-session');
  });
  it('never unlocks without server confirmation', async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: null });
    const unlocked = vi.fn();
    events.addEventListener(STUDENT_EMAIL_LINKED_EVENT, unlocked);
    await expect(completeStudentGoogleLink('student-4')).rejects.toThrow('not confirmed');
    expect(unlocked).not.toHaveBeenCalled();
  });
});