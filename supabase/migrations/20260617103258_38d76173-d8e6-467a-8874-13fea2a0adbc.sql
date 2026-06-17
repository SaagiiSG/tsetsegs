DELETE FROM public.student_activity_logs
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY student_account_id, metadata->>'avgTimePerQuestion', metadata->>'total', metadata->>'correct', metadata->>'duration', date_trunc('minute', created_at)
      ORDER BY created_at
    ) AS rn
    FROM public.student_activity_logs
    WHERE activity_type = 'speed_mode_complete'
  ) t WHERE rn > 1
);