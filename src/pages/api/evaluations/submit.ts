import type { APIRoute } from 'astro';
import { requireAuth } from '../../../lib/apiAuth';
import type { AssessmentResultSummary, QuestionGradingDetail } from '../../../types/assessment';

export const POST: APIRoute = async ({ request }) => {
  try {
    // 🛡️ REQUISITO DE SEGURIDAD: Solo estudiantes o docentes autenticados pueden entregar evaluaciones
    const auth = await requireAuth(request, ['student', 'teacher', 'school_admin', 'super_admin']);
    if (!auth.ok) {
      return auth.response;
    }

    const supabase = auth.admin;
    const body = await request.json();
    const { assessmentId, guideId, answers, totalTimeSpentSeconds, assessmentData } = body;

    if (!answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ ok: false, error: 'Carga útil de respuestas inválida.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 1. Obtener la fuente de verdad de las preguntas pedagógicas
    // Si viene de una guía o evaluación en base de datos:
    let questionsSource = assessmentData?.questions || [];

    if ((!questionsSource || questionsSource.length === 0) && guideId) {
      const { data: dbGuide } = await supabase
        .from('guides')
        .select('*')
        .eq('id', guideId)
        .maybeSingle();

      if (dbGuide && dbGuide.questions) {
        questionsSource = dbGuide.questions;
      }
    }

    // 2. Motor de calificación server-side determinístico y seguro
    let correctCount = 0;
    let answeredCount = 0;
    const details: QuestionGradingDetail[] = [];
    const answersMap = new Map<string, any>();
    
    answers.forEach((a: any) => {
      if (a.questionId) answersMap.set(a.questionId, a);
    });

    questionsSource.forEach((q: any, idx: number) => {
      const ans = answersMap.get(q.id);
      const isAnswered = ans && ans.selectedOptionIndex !== undefined && ans.selectedOptionIndex !== null;
      if (isAnswered) answeredCount++;

      // La respuesta correcta se valida en el servidor
      const isCorrect = isAnswered && ans.selectedOptionIndex === q.correctAnswerIndex;
      if (isCorrect) correctCount++;

      details.push({
        questionId: q.id || `q-${idx + 1}`,
        order: q.order || idx + 1,
        prompt: q.prompt,
        questionType: q.type || 'multiple_choice',
        options: q.options || [],
        selectedOptionIndex: ans?.selectedOptionIndex ?? null,
        correctAnswerIndex: q.correctAnswerIndex,
        isCorrect,
        explanation: q.explanation || '',
        imageUrl: q.imageUrl,
        imageCaption: q.imageCaption,
        referencedBlockId: q.referencedBlockId,
      });
    });

    const totalQuestions = questionsSource.length;
    const wrongCount = answeredCount - correctCount;
    const unansweredCount = totalQuestions - answeredCount;
    const passingScore = assessmentData?.passingScore || 70;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= passingScore;
    const attemptId = `att-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

    const resultSummary: AssessmentResultSummary = {
      attemptId,
      assessmentId: assessmentId || `eval-${guideId || 'default'}`,
      guideTitle: assessmentData?.guideTitle || 'Evaluación de Aprendizaje',
      totalQuestions,
      answeredCount,
      correctCount,
      wrongCount,
      unansweredCount,
      score,
      passingScore,
      passed,
      totalTimeSpentSeconds: totalTimeSpentSeconds || 0,
      submittedAt: new Date().toISOString(),
      details,
    };

    // 3. Registrar el intento y calificación en la base de datos si la tabla existe
    try {
      await supabase.from('grades').insert({
        student_id: auth.user.id,
        school_id: auth.user.schoolId,
        score,
        passed,
        details: {
          attemptId,
          totalQuestions,
          correctCount,
          wrongCount,
          timeSpentSeconds: totalTimeSpentSeconds,
        },
      });
    } catch (_) {}

    return new Response(
      JSON.stringify({
        ok: true,
        result: resultSummary,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    console.error('Error en /api/evaluations/submit:', err);
    return new Response(
      JSON.stringify({ ok: false, error: err?.message || 'Error al procesar la calificación.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
