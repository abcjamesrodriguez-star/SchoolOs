-- =================================================================================
-- COURSE STUDENTS ENROLLMENT TABLE
-- =================================================================================

CREATE TABLE IF NOT EXISTS public.course_students (
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'dropped', 'completed')),
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (course_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_course_students_course ON public.course_students(course_id);
CREATE INDEX IF NOT EXISTS idx_course_students_student ON public.course_students(student_id);

-- RLS
ALTER TABLE public.course_students ENABLE ROW LEVEL SECURITY;

-- Profesores y Rectores pueden ver y matricular
CREATE POLICY "teachers_and_admins_course_students" ON public.course_students FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND (u.role = 'school_admin' OR u.role = 'teacher')
    )
);

-- Estudiantes solo ven sus propias materias
CREATE POLICY "students_course_students" ON public.course_students FOR SELECT USING (
    student_id = auth.uid()
);

-- Recargar la caché
NOTIFY pgrst, 'reload schema';
