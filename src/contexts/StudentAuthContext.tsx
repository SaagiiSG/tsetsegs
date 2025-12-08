import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { v4 as uuidv4 } from 'uuid';

interface StudentAccount {
  id: string;
  phone_number: string;
  created_at: string;
  last_login: string | null;
  is_active: boolean;
}

interface StudentAuthContextType {
  student: StudentAccount | null;
  isLoading: boolean;
  login: (phoneNumber: string) => Promise<{ error: string | null }>;
  logout: () => void;
}

const StudentAuthContext = createContext<StudentAuthContextType | undefined>(undefined);

// Generate or retrieve device ID
const getDeviceId = (): string => {
  let deviceId = localStorage.getItem('student_device_id');
  if (!deviceId) {
    deviceId = uuidv4();
    localStorage.setItem('student_device_id', deviceId);
  }
  return deviceId;
};

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<StudentAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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
        .select('*, student_account:student_accounts(*)')
        .eq('id', sessionId)
        .eq('is_active', true)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error || !session) {
        // Session invalid, clear storage
        localStorage.removeItem('student_session_id');
        localStorage.removeItem('student_id');
        setIsLoading(false);
        return;
      }

      setStudent(session.student_account as StudentAccount);
    } catch (err) {
      console.error('Session check error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (phoneNumber: string): Promise<{ error: string | null }> => {
    try {
      const deviceId = getDeviceId();
      
      // Check if student account exists, create if not
      let { data: studentAccount, error: fetchError } = await supabase
        .from('student_accounts')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!studentAccount) {
        // Create new student account
        const { data: newStudent, error: createError } = await supabase
          .from('student_accounts')
          .insert({ phone_number: phoneNumber })
          .select()
          .single();

        if (createError) throw createError;
        studentAccount = newStudent;
      }

      // Check existing active sessions for this student
      const { data: existingSessions } = await supabase
        .from('student_sessions')
        .select('*')
        .eq('student_account_id', studentAccount.id)
        .eq('is_active', true);

      const activeSessions = existingSessions || [];

      // If already 2 sessions and this device is new, deactivate oldest
      if (activeSessions.length >= 2) {
        const deviceSession = activeSessions.find(s => s.device_id === deviceId);
        if (!deviceSession) {
          // Deactivate oldest session
          const oldestSession = activeSessions.sort(
            (a, b) => new Date(a.login_timestamp).getTime() - new Date(b.login_timestamp).getTime()
          )[0];
          
          await supabase
            .from('student_sessions')
            .update({ is_active: false })
            .eq('id', oldestSession.id);
        }
      }

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

      // Store session info
      localStorage.setItem('student_session_id', session.id);
      localStorage.setItem('student_id', studentAccount.id);
      
      setStudent(studentAccount);
      return { error: null };

    } catch (err: any) {
      console.error('Login error:', err);
      return { error: err.message || 'Login failed' };
    }
  };

  const logout = () => {
    const sessionId = localStorage.getItem('student_session_id');
    
    if (sessionId) {
      // Deactivate session in DB
      supabase
        .from('student_sessions')
        .update({ is_active: false })
        .eq('id', sessionId)
        .then(() => {});
    }

    localStorage.removeItem('student_session_id');
    localStorage.removeItem('student_id');
    setStudent(null);
  };

  return (
    <StudentAuthContext.Provider value={{ student, isLoading, login, logout }}>
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
