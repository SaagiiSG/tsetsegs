-- Enable realtime for students table to show live registrations
ALTER PUBLICATION supabase_realtime ADD TABLE public.students;