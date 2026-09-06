-- =================================================================================
-- MIGRACIÓN: SEGURIDAD Y REFACTORIZACIÓN DE LÓGICA DE NEGOCIO EN BASE DE DATOS
-- =================================================================================
-- Esta migración mueve la lógica de negocio a funciones RPC seguras y cierra 
-- las políticas RLS para evitar escrituras directas desde el frontend.

-- 1. RESTRINGIR RLS PARA EVITAR ESCRITURAS DIRECTAS DEL FRONTEND
-- =================================================================================

-- Restringir course_students para que los clientes solo puedan hacer SELECT
DROP POLICY IF EXISTS "teachers_and_admins_course_students" ON public.course_students;
CREATE POLICY "teachers_and_admins_course_students_select" ON public.course_students FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.users u 
        WHERE u.id = auth.uid() AND (u.role = 'school_admin' OR u.role = 'super_admin' OR u.role = 'teacher')
    )
);

-- 2. FUNCIONES RPC (Stored Procedures) CON SECURITY DEFINER
-- =================================================================================
-- Al usar "SECURITY DEFINER", la función se ejecuta con los privilegios del 
-- creador (postgres/admin), permitiendo saltar el RLS de forma segura, 
-- pero nosotros validamos los permisos manualmente dentro de la función.

-- A. TRASLADAR ESTUDIANTE DE GRUPO
CREATE OR REPLACE FUNCTION public.transfer_student(p_student_id UUID, p_target_group TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_school_id UUID;
    v_role TEXT;
BEGIN
    -- Validar permisos del usuario que ejecuta la función
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
    IF v_role NOT IN ('school_admin', 'super_admin') THEN
        RAISE EXCEPTION 'No tienes permisos para trasladar estudiantes.';
    END IF;

    -- Obtener la escuela del estudiante
    SELECT school_id INTO v_school_id FROM public.users WHERE id = p_student_id;

    -- 1. Actualizar el job_title (grupo) del estudiante
    UPDATE public.users 
    SET job_title = p_target_group 
    WHERE id = p_student_id;

    -- 2. Borrar las inscripciones actuales a materias
    DELETE FROM public.course_students 
    WHERE student_id = p_student_id;

    -- 3. Inscribir automáticamente en las nuevas materias del grupo destino
    INSERT INTO public.course_students (course_id, student_id, status)
    SELECT id, p_student_id, 'enrolled'
    FROM public.courses
    WHERE school_id = v_school_id AND grade_level = p_target_group;

END;
$$;

-- B. DESACTIVAR PROFESOR Y LIMPIAR DEPENDENCIAS
CREATE OR REPLACE FUNCTION public.manage_teacher_status(p_teacher_id UUID, p_is_delete BOOLEAN, p_new_status TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Validar permisos
    SELECT role INTO v_role FROM public.users WHERE id = auth.uid();
    IF v_role NOT IN ('school_admin', 'super_admin') THEN
        RAISE EXCEPTION 'No tienes permisos para administrar profesores.';
    END IF;

    IF p_is_delete THEN
        -- Desvincular de clases
        DELETE FROM public.classes WHERE teacher_id = p_teacher_id;
        
        -- Borrar completamente el usuario (asumiendo que delete_user_completely ya existe)
        PERFORM public.delete_user_completely(p_teacher_id);
    ELSE
        -- Actualizar estado (ej: suspendido, activo)
        UPDATE public.users SET status = p_new_status WHERE id = p_teacher_id;
    END IF;
END;
$$;

-- C. REEMPLAZAR FRANJAS HORARIAS DE UNA ESCUELA
CREATE OR REPLACE FUNCTION public.replace_school_time_slots(p_school_id UUID, p_slots JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_admin_school UUID;
    v_slot JSONB;
BEGIN
    -- Validar permisos
    SELECT role, school_id INTO v_role, v_admin_school FROM public.users WHERE id = auth.uid();
    IF v_role NOT IN ('school_admin', 'super_admin') THEN
        RAISE EXCEPTION 'No tienes permisos para modificar franjas horarias.';
    END IF;

    -- Si es school_admin, solo puede modificar su propia escuela
    IF v_role = 'school_admin' AND v_admin_school != p_school_id THEN
        RAISE EXCEPTION 'No puedes modificar horarios de otra escuela.';
    END IF;

    -- 1. Borrar franjas actuales
    DELETE FROM public.school_time_slots WHERE school_id = p_school_id;

    -- 2. Insertar nuevas franjas iterando el JSONB
    FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
        INSERT INTO public.school_time_slots (
            school_id, shift, period_name, start_time, end_time, is_break, created_at
        ) VALUES (
            p_school_id, 
            v_slot->>'shift', 
            v_slot->>'period_name', 
            (v_slot->>'start_time')::time, 
            (v_slot->>'end_time')::time, 
            (v_slot->>'is_break')::boolean, 
            now()
        );
    END LOOP;

END;
$$;

-- Recargar esquema para PostgREST
NOTIFY pgrst, 'reload schema';
CREATE OR REPLACE FUNCTION public.replace_school_time_slots(p_school_id UUID, p_slots JSONB)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_role TEXT;
    v_admin_school UUID;
    v_slot JSONB;
BEGIN
    SELECT role, school_id INTO v_role, v_admin_school FROM public.users WHERE id = auth.uid();
    IF v_role NOT IN ('school_admin', 'super_admin') THEN
        RAISE EXCEPTION 'No tienes permisos para modificar franjas horarias.';
    END IF;
    IF v_role = 'school_admin' AND v_admin_school != p_school_id THEN
        RAISE EXCEPTION 'No puedes modificar horarios de otra escuela.';
    END IF;

    DELETE FROM public.school_time_slots WHERE school_id = p_school_id;

    FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
    LOOP
        INSERT INTO public.school_time_slots (
            school_id, slot_id, name, start_time, end_time, is_break, order_index
        ) VALUES (
            p_school_id, 
            v_slot->>'slot_id', 
            v_slot->>'name', 
            (v_slot->>'start_time')::time, 
            (v_slot->>'end_time')::time, 
            (v_slot->>'is_break')::boolean, 
            (v_slot->>'order_index')::integer
        );
    END LOOP;
END;
$$;
