DELETE FROM questions
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY question_text ORDER BY created_at ASC) as rn
    FROM questions
    WHERE question_set = 'SATMathTraining800'
  ) sub
  WHERE rn > 1
);