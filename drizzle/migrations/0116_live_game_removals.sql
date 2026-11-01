-- The LiveSession page that answers through live_session_answer() (0114) went live with Saagii's publish on 1 Nov.
-- Live class game: the server checks answers (task 4b item C). Part 2 of 2: the removals.
-- DEPLOY ORDER: apply 0114, publish the page (src/pages/LiveSession.tsx, LiveQuestionControl.tsx), then apply this file.
--   Applied before that page is live, phones on the old page would mark every answer wrong and save nothing.
-- The phone's question list loses the answer key, and phones lose their direct answer and points writes: answers and
-- points now go only through live_session_answer() (0114).
SET lock_timeout = '3s';

-- 0058's list, without the answer.
CREATE OR REPLACE FUNCTION public.live_session_question_list(_join_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object('id', q.id, 'question_text', q.question_text,
    'multiple_choice_options', q.multiple_choice_options, 'order_index', lq.order_index)
    ORDER BY lq.order_index), '[]'::jsonb)
  FROM live_sessions s
  JOIN live_session_questions lq ON lq.session_id = s.id
  JOIN questions q ON q.id = lq.question_id
  WHERE s.join_code = upper(_join_code) AND s.status <> 'finished';
$$;
REVOKE ALL ON FUNCTION public.live_session_question_list(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.live_session_question_list(text) TO anon, authenticated;

-- 0082's direct writes, which the old page used.
DROP POLICY IF EXISTS "Players answer once while the game runs" ON public.live_session_answers;
DROP POLICY IF EXISTS "Players add points they scored" ON public.live_session_participants;

NOTIFY pgrst, 'reload schema';
