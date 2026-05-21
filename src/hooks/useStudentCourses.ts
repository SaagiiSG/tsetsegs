import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStudentAuth } from '@/contexts/StudentAuthContext';

interface CourseInfo {
  hasSAT: boolean;
  hasIELTS: boolean;
  isSATOnly: boolean;
  isIELTSOnly: boolean;
  isBoth: boolean;
  loading: boolean;
}

/**
 * Resolves whether the logged-in student is enrolled in SAT, IELTS, or both,
 * based on every `students` row linked to their phone number.
 */
export function useStudentCourses(): CourseInfo {
  const { student } = useStudentAuth();
  const [info, setInfo] = useState<CourseInfo>({
    hasSAT: false,
    hasIELTS: false,
    isSATOnly: false,
    isIELTSOnly: false,
    isBoth: false,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;

    async function resolve() {
      if (!student) {
        if (!cancelled) {
          setInfo({
            hasSAT: false,
            hasIELTS: false,
            isSATOnly: false,
            isIELTSOnly: false,
            isBoth: false,
            loading: false,
          });
        }
        return;
      }

      const batchIds = (student.linked_students ?? [])
        .map((s) => s.batch_id)
        .filter(Boolean) as string[];

      // Fallback: if linked_students isn't populated yet, use the singular link.
      const fallbackId = student.linked_student?.batch_id;
      const ids = batchIds.length ? batchIds : fallbackId ? [fallbackId] : [];

      if (ids.length === 0) {
        if (!cancelled) {
          setInfo({
            hasSAT: false,
            hasIELTS: false,
            isSATOnly: false,
            isIELTSOnly: false,
            isBoth: false,
            loading: false,
          });
        }
        return;
      }

      const { data } = await supabase
        .from('batches')
        .select('id, course_type')
        .in('id', ids);

      const types = new Set((data ?? []).map((b: any) => b.course_type));
      const hasSAT = types.has('SAT');
      const hasIELTS = types.has('IELTS');

      if (!cancelled) {
        setInfo({
          hasSAT,
          hasIELTS,
          isSATOnly: hasSAT && !hasIELTS,
          isIELTSOnly: hasIELTS && !hasSAT,
          isBoth: hasSAT && hasIELTS,
          loading: false,
        });
      }
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [student?.id, student?.linked_students]);

  return info;
}
