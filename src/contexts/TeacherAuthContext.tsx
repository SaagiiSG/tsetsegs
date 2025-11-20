import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface TeacherAuthContextType {
  user: User | null;
  session: Session | null;
  teacherName: string | null;
  isLoading: boolean;
  needsPasswordChange: boolean;
  signIn: (username: string, password: string) => Promise<{ error: any; needsPasswordChange?: boolean }>;
  changePassword: (newPassword: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
}

const TeacherAuthContext = createContext<TeacherAuthContextType | undefined>(undefined);

export function TeacherAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [teacherName, setTeacherName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsPasswordChange, setNeedsPasswordChange] = useState(false);

  const checkTeacherRole = async (userId: string, username: string) => {
    const { data, error } = await supabase
      .from('teachers')
      .select('name, temporary_password')
      .eq('username', username)
      .maybeSingle();

    if (data) {
      setTeacherName(data.name);
      setNeedsPasswordChange(data.temporary_password || false);
      
      // Check if user has teacher role in user_roles
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'teacher')
        .maybeSingle();

      return !!roleData;
    }
    return false;
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          const username = session.user.user_metadata?.username;
          if (username) {
            await checkTeacherRole(session.user.id, username);
          }
        } else {
          setTeacherName(null);
          setNeedsPasswordChange(false);
        }
        
        setIsLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const username = session.user.user_metadata?.username;
        if (username) {
          setTimeout(() => {
            checkTeacherRole(session.user.id, username).then(() => {
              setIsLoading(false);
            });
          }, 0);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (username: string, password: string) => {
    try {
      // Teachers sign in with email format: username@teachers.tsetsegs.mn
      const email = `${username}@teachers.tsetsegs.mn`;
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) return { error };

      if (data.user) {
        const isTeacher = await checkTeacherRole(data.user.id, username);
        if (!isTeacher) {
          await supabase.auth.signOut();
          return { error: { message: 'Not authorized as teacher' } };
        }

        // Update last login
        await supabase
          .from('teachers')
          .update({ last_login: new Date().toISOString() })
          .eq('username', username);

        return { error: null, needsPasswordChange };
      }

      return { error: { message: 'Login failed' } };
    } catch (error: any) {
      return { error };
    }
  };

  const changePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (error) return { error };

      // Mark temporary_password as false
      if (user?.user_metadata?.username) {
        await supabase
          .from('teachers')
          .update({ temporary_password: false })
          .eq('username', user.user_metadata.username);
        
        setNeedsPasswordChange(false);
      }

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setTeacherName(null);
    setNeedsPasswordChange(false);
  };

  return (
    <TeacherAuthContext.Provider
      value={{
        user,
        session,
        teacherName,
        isLoading,
        needsPasswordChange,
        signIn,
        changePassword,
        signOut,
      }}
    >
      {children}
    </TeacherAuthContext.Provider>
  );
}

export function useTeacherAuth() {
  const context = useContext(TeacherAuthContext);
  if (context === undefined) {
    throw new Error('useTeacherAuth must be used within a TeacherAuthProvider');
  }
  return context;
}