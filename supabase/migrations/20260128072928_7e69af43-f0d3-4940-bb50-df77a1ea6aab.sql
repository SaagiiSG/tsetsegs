-- Bluebook SAT Simulator Tables

-- Table: bluebook_tests - Stores test metadata
CREATE TABLE bluebook_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by TEXT,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Table: bluebook_modules - Each test has 4 modules (RW1, RW2, Math1, Math2)
CREATE TABLE bluebook_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES bluebook_tests(id) ON DELETE CASCADE,
  section TEXT NOT NULL CHECK (section IN ('reading_writing', 'math')),
  module_number INT NOT NULL CHECK (module_number IN (1, 2)),
  time_limit_minutes INT NOT NULL,
  difficulty TEXT DEFAULT 'standard' CHECK (difficulty IN ('standard', 'harder', 'easier')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(test_id, section, module_number)
);

-- Table: bluebook_module_questions - Links questions to modules with ordering
CREATE TABLE bluebook_module_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID REFERENCES bluebook_modules(id) ON DELETE CASCADE,
  question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(module_id, order_index)
);

-- Table: bluebook_attempts - Tracks student test attempts
CREATE TABLE bluebook_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES bluebook_tests(id),
  student_account_id UUID REFERENCES student_accounts(id),
  status TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'abandoned')),
  current_module INT DEFAULT 1,
  current_module_id UUID REFERENCES bluebook_modules(id),
  module_started_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  rw_raw_score INT,
  math_raw_score INT,
  rw_scaled_score INT,
  math_scaled_score INT,
  total_score INT
);

-- Table: bluebook_answers - Individual question responses within an attempt
CREATE TABLE bluebook_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID REFERENCES bluebook_attempts(id) ON DELETE CASCADE,
  module_id UUID REFERENCES bluebook_modules(id),
  question_id UUID REFERENCES questions(id),
  answer_submitted TEXT,
  is_correct BOOLEAN,
  is_marked BOOLEAN DEFAULT false,
  time_spent_seconds INT DEFAULT 0,
  answered_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE bluebook_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE bluebook_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE bluebook_module_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bluebook_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bluebook_answers ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bluebook_tests
CREATE POLICY "Admins can manage bluebook tests" ON bluebook_tests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Students can view published tests" ON bluebook_tests
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public can view published tests" ON bluebook_tests
  FOR SELECT USING (is_published = true);

-- RLS Policies for bluebook_modules
CREATE POLICY "Admins can manage bluebook modules" ON bluebook_modules
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view modules of published tests" ON bluebook_modules
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bluebook_tests 
      WHERE bluebook_tests.id = bluebook_modules.test_id 
      AND bluebook_tests.is_published = true
    )
  );

-- RLS Policies for bluebook_module_questions
CREATE POLICY "Admins can manage module questions" ON bluebook_module_questions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can view questions of published tests" ON bluebook_module_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM bluebook_modules m
      JOIN bluebook_tests t ON t.id = m.test_id
      WHERE m.id = bluebook_module_questions.module_id
      AND t.is_published = true
    )
  );

-- RLS Policies for bluebook_attempts
CREATE POLICY "Admins can manage all attempts" ON bluebook_attempts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can insert attempts" ON bluebook_attempts
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view own attempts" ON bluebook_attempts
  FOR SELECT USING (true);

CREATE POLICY "Public can update own attempts" ON bluebook_attempts
  FOR UPDATE USING (true);

-- RLS Policies for bluebook_answers
CREATE POLICY "Admins can manage all answers" ON bluebook_answers
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Public can insert answers" ON bluebook_answers
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Public can view answers" ON bluebook_answers
  FOR SELECT USING (true);

CREATE POLICY "Public can update answers" ON bluebook_answers
  FOR UPDATE USING (true);

-- Create updated_at trigger for bluebook_tests
CREATE TRIGGER update_bluebook_tests_updated_at
  BEFORE UPDATE ON bluebook_tests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();