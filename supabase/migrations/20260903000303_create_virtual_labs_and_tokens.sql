-- =================================================================================
-- VIRTUAL LABS & TOKENS SCHEMA (ANTI-CHEAT SYSTEM)
-- =================================================================================

-- 1. Catálogo de Juegos/Laboratorios
CREATE TABLE IF NOT EXISTS public.virtual_labs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Sistema de Tokens Únicos y Métricas
CREATE TABLE IF NOT EXISTS public.lab_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lab_id UUID NOT NULL REFERENCES public.virtual_labs(id) ON DELETE CASCADE,
    course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    teacher_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    
    -- Token de Seguridad
    token_id UUID UNIQUE NOT NULL DEFAULT uuid_generate_v4(),
    
    -- STATE MACHINE: 'pending' -> 'in_progress' -> 'completed'
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    
    -- Métricas del Juego
    play_mode TEXT CHECK (play_mode IN ('PC', 'VR')),
    tasks_completed INTEGER DEFAULT 0,
    tasks_missing INTEGER DEFAULT 0,
    time_spent_seconds INTEGER DEFAULT 0,
    
    -- Feedback en Tiempo Real
    feedback_text TEXT,
    
    -- Tiempos de seguimiento
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_lab_tokens_token ON public.lab_tokens(token_id);
CREATE INDEX IF NOT EXISTS idx_lab_tokens_course ON public.lab_tokens(course_id);
CREATE INDEX IF NOT EXISTS idx_lab_tokens_student ON public.lab_tokens(student_id);

-- =================================================================================
-- POLÍTICAS RLS (Row Level Security)
-- =================================================================================
ALTER TABLE public.virtual_labs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "virtual_labs_select_all" ON public.virtual_labs FOR SELECT USING (true);
CREATE POLICY "lab_tokens_teacher_all" ON public.lab_tokens FOR ALL USING ( teacher_id = auth.uid() );
CREATE POLICY "lab_tokens_student_select" ON public.lab_tokens FOR SELECT USING ( student_id = auth.uid() );

-- =================================================================================
-- ENDPOINTS NATIVOS DE SUPABASE (RPC Functions)
-- =================================================================================

-- ENDPOINT 1: Asignar Masivamente (Solo para el profesor)
CREATE OR REPLACE FUNCTION public.assign_lab_batch(
    p_lab_id UUID,
    p_course_id UUID,
    p_student_ids UUID[]
) RETURNS SETOF public.lab_tokens
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_student_id UUID;
    v_inserted public.lab_tokens;
BEGIN
    -- Verificar que quien llama tiene rol (opcional, aquí confiamos en el auth.uid() que quedará registrado)
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'No autorizado';
    END IF;

    FOREACH v_student_id IN ARRAY p_student_ids
    LOOP
        INSERT INTO public.lab_tokens (lab_id, course_id, student_id, teacher_id, status)
        VALUES (p_lab_id, p_course_id, v_student_id, auth.uid(), 'pending')
        RETURNING * INTO v_inserted;
        
        RETURN NEXT v_inserted;
    END LOOP;
    RETURN;
END;
$$;


-- ENDPOINT 2: Arrancar Sesión (Quemar el estado Pending)
CREATE OR REPLACE FUNCTION public.start_lab_session(
    p_token_id UUID
) RETURNS public.lab_tokens
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_record public.lab_tokens%ROWTYPE;
BEGIN
    -- Busca el token y asegura que sea del usuario activo
    SELECT * INTO v_token_record FROM public.lab_tokens 
    WHERE token_id = p_token_id AND student_id = auth.uid() FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token no encontrado o no pertenece a tu usuario';
    END IF;

    IF v_token_record.status != 'pending' THEN
        RAISE EXCEPTION 'Error 403: El token ya no está pendiente (Estado actual: %)', v_token_record.status;
    END IF;

    -- Pasa a in_progress
    UPDATE public.lab_tokens 
    SET status = 'in_progress', started_at = now() 
    WHERE id = v_token_record.id 
    RETURNING * INTO v_token_record;

    RETURN v_token_record;
END;
$$;


-- ENDPOINT 3: Guardar Score Final (Quemar token para siempre)
CREATE OR REPLACE FUNCTION public.submit_lab_score(
    p_token_id UUID,
    p_play_mode TEXT,
    p_tasks_completed INTEGER,
    p_tasks_missing INTEGER,
    p_time_spent INTEGER
) RETURNS public.lab_tokens
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_record public.lab_tokens%ROWTYPE;
BEGIN
    SELECT * INTO v_token_record FROM public.lab_tokens 
    WHERE token_id = p_token_id AND student_id = auth.uid() FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Token no encontrado o no pertenece a tu usuario';
    END IF;

    IF v_token_record.status != 'in_progress' THEN
        RAISE EXCEPTION 'Error 403: Trampa detectada. El token no está en progreso (Estado actual: %)', v_token_record.status;
    END IF;

    -- Guarda métricas y cierra a completed
    UPDATE public.lab_tokens 
    SET 
        status = 'completed', 
        play_mode = p_play_mode,
        tasks_completed = p_tasks_completed,
        tasks_missing = p_tasks_missing,
        time_spent_seconds = p_time_spent,
        completed_at = now()
    WHERE id = v_token_record.id
    RETURNING * INTO v_token_record;

    RETURN v_token_record;
END;
$$;
