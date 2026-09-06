-- Script para auto-matricular a los estudiantes existentes en sus respectivas materias
-- basado en la malla curricular (classes) de su salón (job_title)

INSERT INTO public.course_students (school_id, course_id, student_id, status)
SELECT DISTINCT 
    u.school_id,
    c.course_id,
    u.id as student_id,
    'enrolled' as status
FROM public.users u
JOIN public.classes c ON c.classroom = u.job_title AND c.school_id = u.school_id
WHERE u.role = 'student'
ON CONFLICT (course_id, student_id) DO NOTHING;
