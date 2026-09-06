ALTER TABLE public.courses ADD COLUMN IF NOT EXISTS qualified_teacher_ids uuid[] DEFAULT '{}';
NOTIFY pgrst, 'reload schema';
