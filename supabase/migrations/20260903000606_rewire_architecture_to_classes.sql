-- =================================================================================
-- CIRUGÍA ARQUITECTÓNICA: MIGRACIÓN A MALLA HORARIA (CLASSES)
-- Re-escribe los endpoints para que la verdad absoluta venga del Horario del Docente,
-- eliminando la dependencia falsa de courses.teacher_id.
-- =================================================================================

-- 1. Actualizar el Directorio del Profesor
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
        FROM public.classes cl
        JOIN public.course_students cs ON cl.course_id = cs.course_id
        JOIN public.users u ON cs.student_id = u.id
        WHERE cl.teacher_id = auth.uid()
          -- Condición crucial: El alumno debe pertenecer al salón donde el profe dicta la clase
          AND (u.job_title = cl.classroom OR u.specialty = cl.classroom)
          AND u.role = 'student'
    )
    SELECT COALESCE(jsonb_agg(row_to_json(ms)), '[]'::jsonb) INTO v_result
    FROM my_students ms;
    
    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_teacher_directory() TO authenticated;


-- 2. Actualizar la Planilla de Calificaciones (Gradebook)
CREATE OR REPLACE FUNCTION public.get_course_gradebook(p_course_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSONB;
BEGIN
    WITH students_in_my_class AS (
        -- Trae solo a los alumnos que ven esta materia CON ESTE profesor en su salón específico
        SELECT DISTINCT u.id, u.name, u.avatar_url
        FROM public.classes cl
        JOIN public.course_students cs ON cl.course_id = cs.course_id
        JOIN public.users u ON cs.student_id = u.id
        WHERE cl.teacher_id = auth.uid()
          AND cl.course_id = p_course_id
          AND (u.job_title = cl.classroom OR u.specialty = cl.classroom)
    ),
    -- El resto del query se mantiene igual para armar la matriz de notas
    guides_cte AS (
        SELECT g.id, g.title, g.weight
        FROM public.guides g
        WHERE g.course_id = p_course_id
    ),
    evaluations_cte AS (
        SELECT e.id, e.guide_id, e.title, e.max_score
        FROM public.evaluations e
        JOIN guides_cte g ON e.guide_id = g.id
    ),
    scores_cte AS (
        SELECT s.student_id, s.evaluation_id, s.score
        FROM public.student_scores s
        JOIN evaluations_cte e ON s.evaluation_id = e.id
    )
    SELECT jsonb_build_object(
        'students', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', s.id,
                    'name', s.name,
                    'avatar_url', s.avatar_url,
                    'scores', COALESCE((
                        SELECT jsonb_object_agg(sc.evaluation_id, sc.score)
                        FROM scores_cte sc
                        WHERE sc.student_id = s.id
                    ), '{}'::jsonb)
                )
            )
            FROM students_in_my_class s
        ), '[]'::jsonb),
        'guides', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', g.id,
                    'title', g.title,
                    'weight', g.weight,
                    'evaluations', COALESCE((
                        SELECT jsonb_agg(row_to_json(e))
                        FROM evaluations_cte e
                        WHERE e.guide_id = g.id
                    ), '[]'::jsonb)
                )
            )
            FROM guides_cte g
        ), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_course_gradebook(UUID) TO authenticated;

-- Recargar la caché agresivamente
NOTIFY pgrst, 'reload schema';
