-- =================================================================================
-- RPC PARA AULA VIRTUAL (Cero lógica de filtrado en el frontend)
-- =================================================================================

CREATE OR REPLACE FUNCTION public.get_virtual_classroom_details(p_course_id UUID, p_classroom TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_result JSON;
BEGIN
    SELECT json_build_object(
        'course', (
            SELECT json_build_object(
                'id', c.id,
                'name', c.name,
                'code', c.code,
                'grade_level', c.grade_level
            )
            FROM public.courses c
            WHERE c.id = p_course_id
        ),
        'students', COALESCE((
            SELECT json_agg(
                json_build_object(
                    'id', u.id,
                    'name', u.name,
                    'avatar_url', u.avatar_url,
                    'job_title', u.job_title
                )
            )
            FROM public.course_students cs
            JOIN public.users u ON u.id = cs.student_id
            WHERE cs.course_id = p_course_id 
            AND u.job_title = p_classroom
            AND u.role = 'student'
            AND cs.status = 'enrolled'
        ), '[]'::json),
        'student_count', (
            SELECT count(*)
            FROM public.course_students cs
            JOIN public.users u ON u.id = cs.student_id
            WHERE cs.course_id = p_course_id 
            AND u.job_title = p_classroom
            AND u.role = 'student'
            AND cs.status = 'enrolled'
        )
    ) INTO v_result;

    RETURN v_result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_virtual_classroom_details(UUID, TEXT) TO authenticated;
NOTIFY pgrst, 'reload schema';
