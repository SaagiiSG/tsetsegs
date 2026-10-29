-- Restore 5 International questions to the variant their team-written explanation solves (Saagii, 29 Oct: the explanations in the
-- platform are the source of truth; restore only our own variants, never College Board originals). Later variant imports
-- ("Import to intDB", 10–19 Oct) replaced these questions under explanations written for the earlier variant. Each row is
-- matched by question_id + ext_question_id and only changes if its text is still today's, so a later hand edit is left alone.
-- The explanation (rationale) is not touched. Undo: flowersos/undo-0095.sql (kept outside the repo).

-- ANP0011: the team explanation solves our variant from backup_batch14_20261014-153916.json (now 'If $8g + 7 = 64$, what is the value of $80g + 70$?'…)
UPDATE public.intl_questions SET question_text = 'For the value of $d$ that satisfies $4d + 3 = 47$, what is the value of $40d + 30$?', multiple_choice_options = '{"A": "$470$", "B": "$500$", "C": "$517$", "D": "$530$"}'::jsonb
  WHERE question_id = 'ANP0011' AND ext_question_id = '5eb4918d' AND question_text = 'If $8g + 7 = 64$, what is the value of $80g + 70$?';

-- ANP0046: the team explanation solves our variant from backup_batch3_20261010-154412.json (now '$\\frac{1}{9}(x - k)(100 - x^{2}) = 0$\n\nIn the given equation'…)
UPDATE public.intl_questions SET question_text = '$\frac{1}{2}(x - k)(16 - x^{2}) = 0$

In the given equation, $k$ is a positive constant. The sum of the solutions to the equation is $30$. What is the value of $k$?', answer = '30'
  WHERE question_id = 'ANP0046' AND ext_question_id = '30596346' AND question_text = '$\frac{1}{9}(x - k)(100 - x^{2}) = 0$

In the given equation, $k$ is a positive constant. The sum of the solutions to the equation is $47$. What is the value of $k$?';

-- CB0008: the team explanation solves our variant from backup_batch7_20261011-160707.json (now 'Which of the following is equivalent to the expression $y^{4'…)
UPDATE public.intl_questions SET question_text = 'Which of the following is equivalent to the expression $n^{4} - n^{2} - 30$?', multiple_choice_options = '{"A": "$(n^{2} + 30)(n^{2} - 1)$", "B": "$(n^{2} + 5)(n^{2} - 6)$", "C": "$(n^{2} + 1)(n^{2} - 30)$", "D": "$(n^{2} + 6)(n^{2} - 5)$"}'::jsonb, answer = 'B'
  WHERE question_id = 'CB0008' AND ext_question_id = 'ad2ec615' AND question_text = 'Which of the following is equivalent to the expression $y^{4} + 2y^{2} - 48$?';

-- CB0020: the team explanation solves our variant from backup_batch7_20261011-160707.json (now 'The expression $\\frac{1}{5}x^{2} - 17$ can be rewritten as $'…)
UPDATE public.intl_questions SET question_text = 'The expression $\frac{1}{3}x^{2} - 13$ can be rewritten as $\frac{1}{3}(x - k)(x + k)$, where $k$ is a positive constant. What is the value of $k$?', multiple_choice_options = '{"A": "$13$", "B": "$\\sqrt{13}$", "C": "$\\sqrt{39}$", "D": "$39$"}'::jsonb, answer = 'C'
  WHERE question_id = 'CB0020' AND ext_question_id = 'a0b4103e' AND question_text = 'The expression $\frac{1}{5}x^{2} - 17$ can be rewritten as $\frac{1}{5}(x - k)(x + k)$, where $k$ is a positive constant. What is the value of $k$?';

-- EXT0433: the team explanation solves our variant from backup_batch13_20261014-111121.json (now '$d - 9 = 180$\n\nFor what value of $d$ is the given equation t'…)
UPDATE public.intl_questions SET question_text = '$312 = d + 13$

What value of $d$ makes the given equation true?', multiple_choice_options = '{"A": "$299$", "B": "$312$", "C": "$325$", "D": "$4,056$"}'::jsonb, answer = 'A'
  WHERE question_id = 'EXT0433' AND ext_question_id = 'c841e8e8' AND question_text = '$d - 9 = 180$

For what value of $d$ is the given equation true?';

-- Explanation slips the team confirmed (question right, explanation off): ANP0029 names choice C for x<12, which is B;
-- EXT0249 drops the minus on the y-intercept (0,-9). Each change applies only while the old wording is still there.
UPDATE public.intl_questions SET rationale = replace(rationale, 'the answer is C. $x<12$.', 'the answer is B. $x<12$.') WHERE question_id = 'ANP0029' AND position('the answer is C. $x<12$.' in rationale) > 0;
UPDATE public.intl_questions SET rationale = replace(rationale, 'the y-intercept is \((0,9)\)', 'the y-intercept is \((0,-9)\)') WHERE question_id = 'EXT0249' AND position('the y-intercept is \((0,9)\)' in rationale) > 0;
UPDATE public.intl_questions SET rationale = replace(rationale, 'are 0 and 9, respectively', 'are 0 and -9, respectively') WHERE question_id = 'EXT0249' AND position('are 0 and 9, respectively' in rationale) > 0;

-- Explanations that match no version of their question (Saagii: delete them; the team writes new ones). ANP0060 mixes the
-- old 134° drawing with the current choices; CB0388's only screenshot is from another question. Cleared only if unchanged since 29 Oct.
UPDATE public.intl_questions SET rationale = NULL WHERE question_id = 'ANP0060' AND md5(rationale) = '24a262ecb31c0736a074549587261beb';
UPDATE public.intl_questions SET rationale = NULL WHERE question_id = 'CB0388' AND md5(rationale) = 'aded7597687570c21d9835fad6076415';
