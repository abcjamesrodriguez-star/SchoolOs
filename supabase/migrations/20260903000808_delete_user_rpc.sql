-- =================================================================================
-- RPC SEGURA PARA ELIMINACIÓN COMPLETA DE USUARIOS (INCLUYENDO AUTH)
-- =================================================================================

CREATE OR REPLACE FUNCTION public.delete_user_completely(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Se ejecuta con permisos de administrador de DB (postgres)
SET search_path = public, auth
AS $$
DECLARE
    v_caller_role TEXT;
    v_caller_school_id UUID;
    v_target_school_id UUID;
    v_target_role TEXT;
BEGIN
    -- 1. Obtener datos del admin que está llamando a la función
    SELECT role, school_id INTO v_caller_role, v_caller_school_id 
    FROM public.users WHERE id = auth.uid();

    -- 2. Validar que el llamador sea un rector (school_admin) o super_admin
    IF v_caller_role NOT IN ('school_admin', 'super_admin') THEN
        RAISE EXCEPTION 'Acceso denegado. Solo los administradores pueden eliminar usuarios del sistema central.';
    END IF;

    -- 3. Obtener datos del usuario a eliminar
    SELECT role, school_id INTO v_target_role, v_target_school_id
    FROM public.users WHERE id = p_user_id;

    -- Si el usuario no existe en public.users, intentamos borrarlo de auth.users de todas formas
    IF v_target_role IS NULL THEN
        DELETE FROM auth.users WHERE id = p_user_id;
        RETURN TRUE;
    END IF;

    -- 4. Validar que el usuario pertenezca al MISMO colegio que el admin (si no es super_admin)
    IF v_caller_role = 'school_admin' AND v_caller_school_id != v_target_school_id THEN
        RAISE EXCEPTION 'Acceso denegado. No puedes eliminar usuarios de otro colegio.';
    END IF;

    -- 5. Proteger a los administradores
    IF v_target_role IN ('school_admin', 'super_admin') THEN
        RAISE EXCEPTION 'Protección de Seguridad: No se pueden eliminar cuentas de administrador a través de este método.';
    END IF;

    -- 6. Borrar dependencias seguras (por si faltan ON DELETE CASCADE)
    DELETE FROM public.course_students WHERE student_id = p_user_id;
    
    -- Borrar perfil público
    DELETE FROM public.users WHERE id = p_user_id;

    -- Borrar identidad central de Supabase
    DELETE FROM auth.users WHERE id = p_user_id;

    RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;

NOTIFY pgrst, 'reload schema';
