-- Create schedule_templates table for reusable schedule patterns
CREATE TABLE public.schedule_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  subject TEXT NOT NULL CHECK (subject IN ('math', 'english')),
  schedule_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- schedule_data format: [{"day": "monday", "start_time": "16:40", "end_time": "18:30"}]
  is_global BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.schedule_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage all templates
CREATE POLICY "Admins can manage schedule templates"
ON public.schedule_templates
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view global templates
CREATE POLICY "Anyone can view global templates"
ON public.schedule_templates
FOR SELECT
USING (is_global = true);

-- Add math_schedule and english_schedule columns to batches
ALTER TABLE public.batches 
ADD COLUMN math_schedule JSONB DEFAULT '[]'::jsonb,
ADD COLUMN english_schedule JSONB DEFAULT '[]'::jsonb;

-- Create trigger for updated_at
CREATE TRIGGER update_schedule_templates_updated_at
BEFORE UPDATE ON public.schedule_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();