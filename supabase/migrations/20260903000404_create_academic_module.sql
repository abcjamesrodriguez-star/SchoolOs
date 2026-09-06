-- =================================================================================
-- ACADEMIC MODULE SCHEMA (Guides, Evaluations, Scores)
-- =================================================================================

-- 1. GUÍAS Y CUADERNOS
CREATE TABLE IF NOT EXISTS public.guides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    content_json JSONB DEFAULT '{}'::jsonb,
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    estimated_minutes INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. EVALUACIONES Y EXÁMENES
CREATE TABLE IF NOT EXISTS public.evaluations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    type TEXT DEFAULT 'exam' CHECK (type IN ('exam', 'homework', 'project', 'participation')),
    max_score NUMERIC(5,2) DEFAULT 10.00,
    weight_percentage NUMERIC(5,2) DEFAULT 100.00,
    evaluation_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. NOTAS INDIVIDUALES (SCORES)
CREATE TABLE IF NOT EXISTS public.student_scores (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    evaluation_id UUID NOT NULL REFERENCES public.evaluations(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    score NUMERIC(5,2) NOT NULL,
    feedback_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(evaluation_id, student_id) -- Un estudiante solo puede tener una nota por evaluación
);

-- Índices de optimización
CREATE INDEX IF NOT EXISTS idx_guides_course ON public.guides(course_id);
CREATE INDEX IF NOT EXISTS idx_evals_course ON public.evaluations(course_id);
CREATE INDEX IF NOT EXISTS idx_scores_student ON public.student_scores(student_id);

-- =================================================================================
-- POLÍTICAS RLS (Seguridad en Lectura/Escritura)
-- =================================================================================
ALTER TABLE public.guides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_scores ENABLE ROW LEVEL SECURITY;

-- Profesores pueden administrar todo en sus cursos
CREATE POLICY "teacher_guides_all" ON public.guides FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "teacher_evals_all" ON public.evaluations FOR ALL USING (
    EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.teacher_id = auth.uid())
);
CREATE POLICY "teacher_scores_all" ON public.student_scores FOR ALL USING (
    EXISTS (SELECT 1 FROM public.evaluations e JOIN public.courses c ON e.course_id = c.id WHERE e.id = evaluation_id AND c.teacher_id = auth.uid())
);

-- Estudiantes solo ven guías publicadas de su curso, y SUS propias notas
CREATE POLICY "student_guides_select" ON public.guides FOR SELECT USING (
    status = 'published' AND EXISTS (SELECT 1 FROM public.course_students cs WHERE cs.course_id = course_id AND cs.student_id = auth.uid())
);
CREATE POLICY "student_evals_select" ON public.evaluations FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.course_students cs WHERE cs.course_id = course_id AND cs.student_id = auth.uid())
);
CREATE POLICY "student_scores_select" ON public.student_scores FOR SELECT USING (
    student_id = auth.uid()
);


-- =================================================================================
-- ENDPOINTS RPC SEGUROS PARA EL FRONTEND DE ASTRO
-- =================================================================================

-- RPC 1: Directorio global del Profesor (Pantalla "Mis Estudiantes")
CREATE OR REPLACE FUNCTION public.get_teacher_directory()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH my_students AS (
        SELECT DISTINCT u.id, u.name, u.avatar_url, u.document_id, u.email
        FROM public.courses c
        JOIN public.course_students cs ON c.id = cs.course_id
        JOIN public.users u ON cs.student_id = u.id
        WHERE c.teacher_id = auth.uid()
    )
    SELECT COALESCE(jsonb_agg(row_to_json(ms)), '[]'::jsonb) INTO v_result
    FROM my_students ms;
    
    RETURN v_result;
END;
$$;


-- RPC 2: Matriz de Notas del Salón (Pantalla "Calificaciones" y Detalle del curso)
-- Entrega el Excel minificado para que el Frontend no procese datos masivos
CREATE OR REPLACE FUNCTION public.get_course_gradebook(p_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_is_teacher BOOLEAN;
    v_result JSONB;
BEGIN
    -- Validar seguridad estricta
    SELECT EXISTS(
        SELECT 1 FROM public.courses WHERE id = p_course_id AND teacher_id = auth.uid()
    ) INTO v_is_teacher;

    IF NOT v_is_teacher THEN
        RAISE EXCEPTION 'No autorizado para ver esta planilla.';
    END IF;

    WITH course_evals AS (
        SELECT id, title, max_score, weight_percentage 
        FROM public.evaluations 
        WHERE course_id = p_course_id
        ORDER BY created_at ASC
    ),
    student_list AS (
        SELECT u.id, u.name, u.avatar_url
        FROM public.course_students cs
        JOIN public.users u ON cs.student_id = u.id
        WHERE cs.course_id = p_course_id
    ),
    scores_agg AS (
        SELECT s.id as student_id,
               jsonb_object_agg(ss.evaluation_id, ss.score) as scores_map,
               AVG(ss.score) as final_average
        FROM student_list s
        JOIN public.student_scores ss ON s.id = ss.student_id
        GROUP BY s.id
    )
    SELECT jsonb_build_object(
        'evaluations', (SELECT COALESCE(jsonb_agg(row_to_json(ce)), '[]'::jsonb) FROM course_evals ce),
        'students', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', sl.id,
                    'name', sl.name,
                    'avatar', sl.avatar_url,
                    'scores', COALESCE(sa.scores_map, '{}'::jsonb),
                    'final_average', COALESCE(sa.final_average, 0)
                )
            ), '[]'::jsonb)
            FROM student_list sl
            LEFT JOIN scores_agg sa ON sl.id = sa.student_id
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;
