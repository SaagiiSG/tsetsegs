-- Fix one-phrase slips in 12 International explanations (Saagii, 29 Oct: the explanations are the truth, fix their slips).
-- Found by reading every explanation and screenshot against its question; in each the question and key are right and
-- the explanation's working reaches them, but one phrase is wrong. Each change applies only while the wrong phrase is
-- still there. Undo: flowersos/undo-0097.sql (kept outside the repo).

-- ANP0009: -60 ÷ 3 is -20
UPDATE public.intl_questions SET rationale = replace(rationale, '$5d=-60$', '$5d=-20$') WHERE question_id = 'ANP0009' AND position('$5d=-60$' in rationale) > 0;
-- ANP0033: the question is f·g − h
UPDATE public.intl_questions SET rationale = replace(rationale, '$f(x)×g(x)×h(x)=ax^2+bx+c$', '$f(x)×g(x)-h(x)=ax^2+bx+c$') WHERE question_id = 'ANP0033' AND position('$f(x)×g(x)×h(x)=ax^2+bx+c$' in rationale) > 0;
UPDATE public.intl_questions SET rationale = replace(rationale, '$(x+7)(3x-6)(2x+1)=ax^2+bx+c$', '$(x+7)(3x-6)-(2x+1)=ax^2+bx+c$') WHERE question_id = 'ANP0033' AND position('$(x+7)(3x-6)(2x+1)=ax^2+bx+c$' in rationale) > 0;
UPDATE public.intl_questions SET rationale = replace(rationale, '(x1+7)(3x1-6)(2x1+1)', '(x1+7)(3x1-6)-(2x1+1)') WHERE question_id = 'ANP0033' AND position('(x1+7)(3x1-6)(2x1+1)' in rationale) > 0;
-- ANP0047: the question says a < 2
UPDATE public.intl_questions SET rationale = replace(rationale, 'the value of $a$ is more than 2', 'the value of $a$ is less than 2') WHERE question_id = 'ANP0047' AND position('the value of $a$ is more than 2' in rationale) > 0;
-- ANP0054: the arc is 90°
UPDATE public.intl_questions SET rationale = replace(rationale, '$\theta$= 30°', '$\theta$= 90°') WHERE question_id = 'ANP0054' AND position('$\theta$= 30°' in rationale) > 0;
-- CB0151: both points are on y = 7
UPDATE public.intl_questions SET rationale = replace(rationale, '$$(4,-7)$$', '$$(4,7)$$') WHERE question_id = 'CB0151' AND position('$$(4,-7)$$' in rationale) > 0;
-- EXT0220: 50 = 2·13 + 2b gives b = 12
UPDATE public.intl_questions SET rationale = replace(rationale, 'The value of $b$ is $13$.', 'The value of $b$ is $12$.') WHERE question_id = 'EXT0220' AND position('The value of $b$ is $13$.' in rationale) > 0;
-- EXT0235: 6312 + 783 = 7095
UPDATE public.intl_questions SET rationale = replace(rationale, '$$a+b=6312+783=709$$', '$$a+b=6312+783=7095$$') WHERE question_id = 'EXT0235' AND position('$$a+b=6312+783=709$$' in rationale) > 0;
-- EXT0576: c/a is the product
UPDATE public.intl_questions SET rationale = replace(rationale, 'the sum of the solutions of a quadratic equation is equal to', 'the product of the solutions of a quadratic equation is equal to') WHERE question_id = 'EXT0576' AND position('the sum of the solutions of a quadratic equation is equal to' in rationale) > 0;
-- EXT0775: y is -0.25
UPDATE public.intl_questions SET rationale = replace(rationale, '$(-1.5,0.25).$', '$(-1.5,-0.25).$') WHERE question_id = 'EXT0775' AND position('$(-1.5,0.25).$' in rationale) > 0;
UPDATE public.intl_questions SET rationale = replace(rationale, 'Multiply $-1.5$ by $0.25$', 'Multiply $-1.5$ by $-0.25$') WHERE question_id = 'EXT0775' AND position('Multiply $-1.5$ by $0.25$' in rationale) > 0;
-- EXT0879: the question gives 33°
UPDATE public.intl_questions SET rationale = replace(rationale, '14° and 53°', '14° and 33°') WHERE question_id = 'EXT0879' AND position('14° and 53°' in rationale) > 0;
-- EXT2865: 84² − 121 = 6935
UPDATE public.intl_questions SET rationale = replace(rationale, '$y=x^2-168x-121$', '$y=x^2-168x+6935$') WHERE question_id = 'EXT2865' AND position('$y=x^2-168x-121$' in rationale) > 0;
-- EXT2885: the question is 7x² + 15x
UPDATE public.intl_questions SET rationale = replace(rationale, '7x-15', '7x+15') WHERE question_id = 'EXT2885' AND position('7x-15' in rationale) > 0;
UPDATE public.intl_questions SET rationale = replace(rationale, '7x^2-15x', '7x^2+15x') WHERE question_id = 'EXT2885' AND position('7x^2-15x' in rationale) > 0;
