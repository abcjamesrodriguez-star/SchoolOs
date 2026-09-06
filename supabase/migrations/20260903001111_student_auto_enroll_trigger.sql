-- =================================================================================
-- TRIGGER PARA MATRICULACIÓN AUTOMÁTICA (Cero lógica en frontend)
-- =================================================================================

CREATE OR REPLACE FUNCTION public.trg_auto_enroll_student()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo actuar si es estudiante y se le asignó un salón (job_title)
    IF NEW.role = 'student' AND NEW.job_title IS NOT NULL AND NEW.job_title != '' THEN
        
        -- Si el salón cambió o es nuevo, matricularlo en las materias de ese salón
        IF TG_OP = 'INSERT' OR OLD.job_title IS DISTINCT FROM NEW.job_title THEN
            
            -- Insertar las materias correspondientes a su nuevo salón
            INSERT INTO public.course_students (course_id, student_id, status)
            SELECT DISTINCT c.course_id, NEW.id, 'enrolled'
            FROM public.classes c
            WHERE c.classroom = NEW.job_title AND c.school_id = NEW.school_id
            ON CONFLICT (course_id, student_id) DO UPDATE SET status = 'enrolled';
            
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_student_classroom_change ON public.users;
CREATE TRIGGER on_student_classroom_change
AFTER INSERT OR UPDATE OF job_title ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_enroll_student();

NOTIFY pgrst, 'reload schema';
