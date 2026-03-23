-- Fix existing EXT math questions: map "Area and volume" -> Geometry and Trigonometry
UPDATE questions 
SET category_id = '5a15d563-8bea-49b0-9006-887507ff5892'
WHERE question_id LIKE 'EXT%' 
  AND subject = 'math' 
  AND category_id IS NULL 
  AND LOWER(skill) = 'area and volume';

-- Fix existing EXT math questions: map "Linear equations in two variables" -> Algebra
UPDATE questions 
SET category_id = '85766db8-9c8f-473c-b53e-58fb3065aab0'
WHERE question_id LIKE 'EXT%' 
  AND subject = 'math' 
  AND category_id IS NULL 
  AND LOWER(skill) = 'linear equations in two variables';