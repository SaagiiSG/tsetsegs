import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface LinkedStudent {
  id: string;
  first_name: string;
  last_name: string | null;
  phone: string;
  batch_id: string;
  grade: string | null;
  school_name: string | null;
  parent_phone?: string | null;
  sat_test_month?: string | null;
}

interface StudentAccount {
  id: string;
  phone_number: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
  is_blocked: boolean;
  blocked_reason: string | null;
  linked_student_id: string | null;
  linked_student?: LinkedStudent | null;
  linked_students?: LinkedStudent[];
  registered_device_id: string | null;
  device_registered_at: string | null;
  password_hash: string | null;
  password_set_at: string | null;
  onboarding_completed: boolean;
}

export type AuthStep = 'phone' | 'password' | 'set_password';

interface StudentAuthContextType {
  student: StudentAccount | null;
  isLoading: boolean;
  authStep: AuthStep;
  pendingPhone: string | null;
  pendingStudentAccount: StudentAccount | null;
  checkPhone: (phoneNumber: string) => Promise<{ error: string | null; needsPassword?: boolean; needsSetup?: boolean }>;
  loginWithPassword: (password: string) => Promise<{ error: string | null }>;
  setPassword: (password: string) => Promise<{ error: string | null }>;
  resetAuthFlow: () => void;
  logout: () => void;
  logActivity: (activityType: string, metadata?: Record<string, any>) => Promise<void>;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

// ---- IndexedDB helpers for redundant device ID storage ----
const IDB_NAME = 'student_device_store';
const IDB_STORE = 'device';
const IDB_KEY = 'device_id';

const openIDB = (): Promise<IDBDatabase | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open(IDB_NAME, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const readIDB = async (): Promise<string | null> => {
  const db = await openIDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(IDB_KEY);
      req.onsuccess = () => resolve(req.result as string | null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
};

const writeIDB = async (value: string): Promise<void> => {
  const db = await openIDB();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, IDB_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    } catch {
      resolve();
    }
  });
};

// ---- Browser fingerprint (lightweight, not for tracking) ----
const generateFingerprint = (): string => {
  const raw = [
    navigator.userAgent,
    screen.width,
    screen.height,
    screen.colorDepth,
    Intl.DateTimeFormat().resolvedOptions().timeZone,
    navigator.language,
    navigator.hardwareConcurrency || '',
  ].join('|');
  // Simple hash (djb2)
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) & 0xffffffff;
  }
  return 'fp_' + (hash >>> 0).toString(36);
};

// Generate or retrieve device ID (with IndexedDB fallback)
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('student_device_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('student_device_id', deviceId);
  }
  // Async sync with IndexedDB (fire-and-forget)
  (async () => {
    const idbId = await readIDB();
    const lsId = localStorage.getItem('student_device_id');
    if (idbId && !lsId) {
      localStorage.setItem('student_device_id', idbId);
    } else if (lsId && !idbId) {
      await writeIDB(lsId);
    } else if (lsId && idbId && lsId !== idbId) {
      // localStorage wins if both exist but differ (most recent)
      await writeIDB(lsId);
    }
  })();
  return deviceId;
};

// Async version that checks IndexedDB first (for session restore)
const getDeviceIdAsync = async (): Promise<string> => {
  let lsId = localStorage.getItem('student_device_id');
  const idbId = await readIDB();
  
  if (lsId && idbId && lsId !== idbId) {
    // localStorage takes priority, sync to IDB
    await writeIDB(lsId);
    return lsId;
  }
  if (!lsId && idbId) {
    // Restore from IndexedDB
    localStorage.setItem('student_device_id', idbId);
    return idbId;
  }
  if (lsId && !idbId) {
    await writeIDB(lsId);
    return lsId;
  }
  if (!lsId && !idbId) {
    const newId = uuidv4();
    localStorage.setItem('student_device_id', newId);
    await writeIDB(newId);
    return newId;
  }
  return lsId!;
};

// Device lock duration in days
const DEVICE_LOCK_DAYS = 90;

// Calculate days remaining for device lock
const getDaysRemaining = (registrationDate: string): number => {
  const registered = new Date(registrationDate);
  const now = new Date();
  const daysPassed = Math.floor((now.getTime() - registered.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, DEVICE_LOCK_DAYS - daysPassed);
};

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [pendingPhone, setPendingPhone] = useState<string | null>(null);
  const [pendingStudentAccount, setPendingStudentAccount] = useState<StudentAccount | null>(null);

  useEffect(() => {
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      const sessionId = localStorage.getItem('student_session_id');
      const studentId = localStorage.getItem('student_id');
      
      if (!sessionId || !studentId) {
        setIsLoading(false);
        return;
      }

      // Verify session is still valid
      const { data: session, error } = await supabase
        .from('student_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (error || !session) {
        localStorage.removeItem('student_session_id');
        localStorage.removeItem('student_id');
        setIsLoading(false);
        return;
      }

      // Fetch student account with linked student info
      const { data: studentAccount, error: accountError } = await supabase
        .from('student_accounts')
        .select('*')
        .eq('id', studentId)
        .maybeSingle();

      if (accountError || !studentAccount) {
        localStorage.removeItem('student_session_id');
        localStorage.removeItem('student_id');
        setIsLoading(false);
        return;
      }

      // Check if account is blocked
      if (studentAccount.is_blocked) {
        localStorage.removeItem('student_session_id');
        localStorage.removeItem('student_id');
        setIsLoading(false);
        return;
      }

      // Fetch linked student profile if exists
      let linkedStudent: LinkedStudent | null = null;
      let linkedStudents: LinkedStudent[] = [];
      if (studentAccount.linked_student_id) {
        const { data: linkedData } = await supabase
          .from('students')
          .select('id, first_name, last_name, phone, batch_id, grade, school_name, parent_phone, sat_test_month')
          .eq('id', studentAccount.linked_student_id)
          .maybeSingle();
        linkedStudent = linkedData;
      }
      // Fetch ALL student records matching this phone (for multi-batch students)
      const { data: allLinked } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, batch_id, grade, school_name, parent_phone, sat_test_month')
        .or(`phone.eq.${studentAccount.phone_number},phone.eq.${studentAccount.phone_number.replace(/-/g, '')}`);
      linkedStudents = allLinked || [];

      setStudent({
        ...studentAccount,
        linked_student: linkedStudent,
        linked_students: linkedStudents
      } as StudentAccount);
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logActivity = async (activityType: string, metadata: Record<string, any> = {}) => {
    if (!student) return;
    
    const sessionId = localStorage.getItem('student_session_id');
    
    try {
      await supabase
        .from('student_activity_logs')
        .insert({
          student_account_id: student.id,
          session_id: sessionId,
          activity_type: activityType,
          metadata: {
            ...metadata,
            user_agent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  };

  const checkPhone = async (phoneNumber: string): Promise<{ error: string | null; needsPassword?: boolean; needsSetup?: boolean }> => {
    try {
      // First check if phone exists in students table (may have multiple records for multi-course students)
      const { data: studentRecords, error: studentError } = await supabase
        .from('students')
        .select('id, first_name, phone')
        .eq('phone', phoneNumber)
        .limit(1);

      const studentRecord = studentRecords?.[0] || null;

      if (studentError && studentError.code !== 'PGRST116') {
        throw studentError;
      }

      if (!studentRecord) {
        return { error: 'No student found with this phone number. Please contact your teacher.' };
      }

      // Check if student account exists
      let { data: studentAccount, error: fetchError } = await supabase
        .from('student_accounts')
        .select('*')
        .eq('phone_number', phoneNumber)
        .maybeSingle();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      const deviceId = getDeviceId();

      if (!studentAccount) {
        // Create new student account (trigger will auto-link to students table)
        const { data: newStudent, error: createError } = await supabase
          .from('student_accounts')
          .insert({ 
            phone_number: phoneNumber,
            registered_device_id: deviceId,
            device_registered_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) throw createError;
        studentAccount = newStudent;
      }

      // Check if account is blocked
      if (studentAccount.is_blocked) {
        return { 
          error: `Your account has been suspended: ${studentAccount.blocked_reason || 'Contact administrator for help.'}` 
        };
      }

      // Store pending info
      setPendingPhone(phoneNumber);
      setPendingStudentAccount(studentAccount as StudentAccount);

      // Check if password is set
      if (studentAccount.password_hash) {
        setAuthStep('password');
        return { error: null, needsPassword: true };
      } else {
        setAuthStep('set_password');
        return { error: null, needsSetup: true };
      }

    } catch (err: any) {
      console.error('Phone check error:', err);
      return { error: err.message || 'Failed to check phone number' };
    }
  };

  const setPassword = async (password: string): Promise<{ error: string | null }> => {
    try {
      if (!pendingStudentAccount || !pendingPhone) {
        return { error: 'Session expired. Please start over.' };
      }

      // Hash the password using database function
      const { data: hashResult, error: hashError } = await supabase
        .rpc('hash_student_password', { password });

      if (hashError) throw hashError;

      // Update the student account with the password hash
      const { error: updateError } = await supabase
        .from('student_accounts')
        .update({
          password_hash: hashResult,
          password_set_at: new Date().toISOString()
        })
        .eq('id', pendingStudentAccount.id);

      if (updateError) throw updateError;

      // Now complete the login
      return await completeLogin(pendingStudentAccount, true);

    } catch (err: any) {
      console.error('Set password error:', err);
      return { error: err.message || 'Failed to set password' };
    }
  };

  const loginWithPassword = async (password: string): Promise<{ error: string | null }> => {
    try {
      if (!pendingStudentAccount || !pendingPhone) {
        return { error: 'Session expired. Please start over.' };
      }

      // Verify password using database function
      const { data: isValid, error: verifyError } = await supabase
        .rpc('verify_student_password', { 
          stored_hash: pendingStudentAccount.password_hash,
          input_password: password 
        });

      if (verifyError) throw verifyError;

      if (!isValid) {
        return { error: 'Incorrect password. Please try again.' };
      }

      // Password is correct, complete login
      return await completeLogin(pendingStudentAccount, true);

    } catch (err: any) {
      console.error('Login with password error:', err);
      return { error: err.message || 'Login failed' };
    }
  };

  const completeLogin = async (studentAccount: StudentAccount, bypassDeviceLock = false): Promise<{ error: string | null }> => {
    try {
      const deviceId = await getDeviceIdAsync();
      const fingerprint = generateFingerprint();

      // Check device registration lock (90-day lock) - skip for dev accounts and password-authenticated logins
      const isDevAccount = (studentAccount as any).is_dev_account === true;
      const storedFingerprint = (studentAccount as any).device_fingerprint as string | null;
      const fingerprintMatches = storedFingerprint && storedFingerprint === fingerprint;
      
      if (!isDevAccount && !bypassDeviceLock && studentAccount.registered_device_id && studentAccount.device_registered_at) {
        const daysRemaining = getDaysRemaining(studentAccount.device_registered_at);
        const deviceIdMatches = studentAccount.registered_device_id === deviceId;
        
        if (!deviceIdMatches && !fingerprintMatches && daysRemaining > 0) {
          await supabase.from('security_alerts').insert({
            student_account_id: studentAccount.id,
            alert_type: 'unauthorized_device_attempt',
            severity: 'high',
            metadata: {
              attempted_device_id: deviceId,
              registered_device_id: studentAccount.registered_device_id,
              days_remaining: daysRemaining,
              fingerprint_match: false,
              user_agent: navigator.userAgent
            }
          });
          
          return { 
            error: `This account is registered to another device. You can log in from a new device in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}.` 
          };
        }
        
        // Fingerprint matches but device ID changed (cleared localStorage) — re-register silently
        if (!deviceIdMatches && fingerprintMatches) {
          await supabase
            .from('student_accounts')
            .update({ registered_device_id: deviceId })
            .eq('id', studentAccount.id);
        }
        
        // 90 days passed, allow new device
        if (!deviceIdMatches && !fingerprintMatches && daysRemaining <= 0) {
          await supabase
            .from('student_accounts')
            .update({
              registered_device_id: deviceId,
              device_registered_at: new Date().toISOString(),
              device_fingerprint: fingerprint
            })
            .eq('id', studentAccount.id);
        }
        
        // Same device, backfill fingerprint if missing
        if (deviceIdMatches && !storedFingerprint) {
          await supabase
            .from('student_accounts')
            .update({ device_fingerprint: fingerprint })
            .eq('id', studentAccount.id);
        }
      } else if (bypassDeviceLock && studentAccount.registered_device_id !== deviceId) {
        // Password-authenticated login from changed device ID — re-register
        await supabase
          .from('student_accounts')
          .update({
            registered_device_id: deviceId,
            device_registered_at: new Date().toISOString(),
            device_fingerprint: fingerprint
          })
          .eq('id', studentAccount.id);
      } else if (!studentAccount.registered_device_id) {
        // First time device registration
        await supabase
          .from('student_accounts')
          .update({
            registered_device_id: deviceId,
            device_registered_at: new Date().toISOString(),
            device_fingerprint: fingerprint
          })
          .eq('id', studentAccount.id);
      } else if (!storedFingerprint) {
        // Existing device, just backfill fingerprint
        await supabase
          .from('student_accounts')
          .update({ device_fingerprint: fingerprint })
          .eq('id', studentAccount.id);
      }

      // Deactivate ALL existing sessions for this student
      await supabase
        .from('student_sessions')
        .update({ is_active: false })
        .eq('student_account_id', studentAccount.id)
        .eq('is_active', true);

      // Create or update session for this device
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 35); // 5 weeks

      const { data: session, error: sessionError } = await supabase
        .from('student_sessions')
        .upsert({
          student_account_id: studentAccount.id,
          device_id: deviceId,
          login_timestamp: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          is_active: true,
          user_agent: navigator.userAgent,
        }, {
          onConflict: 'student_account_id,device_id'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;

      // Update last login
      await supabase
        .from('student_accounts')
        .update({ last_login: new Date().toISOString() })
        .eq('id', studentAccount.id);

      // Fetch linked student profile if exists
      let linkedStudent: LinkedStudent | null = null;
      let linkedStudents: LinkedStudent[] = [];
      if (studentAccount.linked_student_id) {
        const { data: linkedData } = await supabase
          .from('students')
          .select('id, first_name, last_name, phone, batch_id, grade, school_name, parent_phone, sat_test_month')
          .eq('id', studentAccount.linked_student_id)
          .maybeSingle();
        linkedStudent = linkedData;
      }
      // Fetch ALL student records matching this phone (for multi-batch students)
      const { data: allLinked } = await supabase
        .from('students')
        .select('id, first_name, last_name, phone, batch_id, grade, school_name, parent_phone, sat_test_month')
        .or(`phone.eq.${studentAccount.phone_number},phone.eq.${studentAccount.phone_number.replace(/-/g, '')}`);
      linkedStudents = allLinked || [];

      // Store session info
      localStorage.setItem('student_session_id', session.id);
      localStorage.setItem('student_id', studentAccount.id);
      
      const fullStudent = {
        ...studentAccount,
        linked_student: linkedStudent,
        linked_students: linkedStudents
      } as StudentAccount;
      
      setStudent(fullStudent);

      // Reset auth flow state
      setPendingPhone(null);
      setPendingStudentAccount(null);
      setAuthStep('phone');

      // Log login activity with IP address via edge function
      try {
        await supabase.functions.invoke('log-ip', {
          body: {
            student_account_id: studentAccount.id,
            activity_type: 'login'
          }
        });
      } catch (ipError) {
        console.error('Failed to log IP:', ipError);
        // Still log activity without IP as fallback
        await supabase
          .from('student_activity_logs')
          .insert({
            student_account_id: studentAccount.id,
            session_id: session.id,
            activity_type: 'login',
            metadata: {
              device_id: deviceId,
              user_agent: navigator.userAgent
            }
          });
      }

      return { error: null };

    } catch (err: any) {
      console.error('Complete login error:', err);
      return { error: err.message || 'Login failed' };
    }
  };

  const resetAuthFlow = () => {
    setPendingPhone(null);
    setPendingStudentAccount(null);
    setAuthStep('phone');
  };

  const logout = () => {
    const sessionId = localStorage.getItem('student_session_id');
    
    if (sessionId && student) {
      supabase
        .from('student_activity_logs')
        .insert({
          student_account_id: student.id,
          session_id: sessionId,
          activity_type: 'logout',
          metadata: { user_agent: navigator.userAgent }
        })
        .then(() => {});

      supabase
        .from('student_sessions')
        .update({ is_active: false })
        .eq('id', sessionId)
        .then(() => {});
    }

    localStorage.removeItem('student_session_id');
    localStorage.removeItem('student_id');
    setStudent(null);
    resetAuthFlow();
  };

  return (
    <StudentAuthContext.Provider value={{ 
      student, 
      isLoading, 
      authStep,
      pendingPhone,
      pendingStudentAccount,
      checkPhone,
      loginWithPassword,
      setPassword,
      resetAuthFlow,
      logout, 
      logActivity 
    }}>
      {children}
    </StudentAuthContext.Provider>
  );
}

export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (context === undefined) {
    throw new Error('useStudentAuth must be used within a StudentAuthProvider');
  }
  return context;
}
