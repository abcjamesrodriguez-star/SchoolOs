-- =================================================================================
-- VIRTUAL LABS & SINGLE-USE TOKENS (RPC SUBMISSION & RESEARCH SURVEY)
-- =================================================================================

-- 1. Asegurar columnas de detalle en lab_tokens
ALTER TABLE public.lab_tokens 
ADD COLUMN IF NOT EXISTS feedback_text TEXT,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. PROCEDIMIENTO ALMACENADO: submit_lab_result
-- Unity (WebGL / VR) puede invocar este RPC directamente vía POST /rest/v1/rpc/submit_lab_result
CREATE OR REPLACE FUNCTION public.submit_lab_result(
    p_token_id UUID,
    p_time_spent INTEGER,
    p_missions JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_token_record RECORD;
    v_completed INTEGER := 0;
    v_missing INTEGER := 0;
    v_total INTEGER := 0;
    v_percentage NUMERIC(5,2) := 0.00;
    v_score NUMERIC(4,2) := 0.00;
    v_item JSONB;
BEGIN
    -- 1. Buscar la boleta por token_id
    SELECT * INTO v_token_record
    FROM public.lab_tokens
    WHERE token_id = p_token_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'ok', false,
            'error', 'Token de laboratorio no encontrado.'
        );
    END IF;

    -- 2. VALIDACIÓN DE UN SOLO USO: si ya se completó, denegar intento
    IF v_token_record.status = 'completed' THEN
        RETURN jsonb_build_object(
            'ok', false,
            'status', 'already_completed',
            'error', 'Este token ya fue utilizado previamente. Solicita al docente que reactive tu intento.'
        );
    END IF;

    -- 3. Calcular aciertos y fallos según las misiones enviadas por el juego
    IF jsonb_typeof(p_missions) = 'array' THEN
        FOR v_item IN SELECT * FROM jsonb_array_elements(p_missions)
        LOOP
            v_total := v_total + 1;
            IF COALESCE((v_item->>'passed')::BOOLEAN, (v_item->>'success')::BOOLEAN, false) = true THEN
                v_completed := v_completed + 1;
            ELSE
                v_missing := v_missing + 1;
            END IF;
        END LOOP;
    ELSIF jsonb_typeof(p_missions) = 'object' THEN
        FOR v_item IN SELECT value FROM jsonb_each(p_missions)
        LOOP
            v_total := v_total + 1;
            IF v_item::TEXT = 'true' OR (v_item#>>'{}')::BOOLEAN = true THEN
                v_completed := v_completed + 1;
            ELSE
                v_missing := v_missing + 1;
            END IF;
        END LOOP;
    END IF;

    -- 4. Cálculo matemático en base de datos
    IF v_total > 0 THEN
        v_percentage := ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 100.0, 1);
        v_score := ROUND((v_completed::NUMERIC / v_total::NUMERIC) * 10.0, 1);
    END IF;

    -- 5. Quemar el token a 'completed' y guardar el feedback técnico
    UPDATE public.lab_tokens
    SET 
        status = 'completed',
        tasks_completed = v_completed,
        tasks_missing = v_missing,
        time_spent_seconds = COALESCE(p_time_spent, 0),
        feedback_text = jsonb_build_object(
            'missions', p_missions,
            'percentage', v_percentage,
            'score', v_score,
            'timeSpentSeconds', COALESCE(p_time_spent, 0),
            'completedAt', timezone('utc'::text, now())
        )::TEXT,
        completed_at = timezone('utc'::text, now())
    WHERE id = v_token_record.id;

    -- 6. Respuesta para el juego y la web
    RETURN jsonb_build_object(
        'ok', true,
        'confirmed', true,
        'status', 'completed',
        'message', 'Resultados guardados y calculados con éxito en la base de datos.',
        'data', jsonb_build_object(
            'tokenId', p_token_id,
            'tasksCompleted', v_completed,
            'tasksMissing', v_missing,
            'totalMissions', v_total,
            'percentage', v_percentage,
            'score', v_score,
            'timeSpentSeconds', COALESCE(p_time_spent, 0),
            'readyForSurvey', true
        )
    );
END;
$$;

-- Otorgar permisos de ejecución para llamadas directas desde Unity con la anon_key
GRANT EXECUTE ON FUNCTION public.submit_lab_result(UUID, INTEGER, JSONB) TO anon, authenticated;
