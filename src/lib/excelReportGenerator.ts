import ExcelJS from 'exceljs';

export interface LabReportToken {
  id: string;
  token_id?: string;
  status: string;
  play_mode?: string;
  tasks_completed?: number;
  tasks_missing?: number;
  time_spent_seconds?: number;
  completed_at?: string;
  feedback_text?: string | null;
  assigned_at?: string;
  student?: {
    id?: string;
    name?: string;
    email?: string;
    document_id?: string;
    job_title?: string;
  };
  course?: {
    id?: string;
    name?: string;
    code?: string;
  };
  lab?: {
    id?: string;
    name?: string;
  };
}

export async function buildLabExcelReport(
  tokens: LabReportToken[],
  courseInfo?: { name?: string; code?: string },
  teacherName?: string
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Colegio Raptor Crew - Sistema Académico';
  workbook.lastModifiedBy = teacherName || 'Docente Raptor Crew';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Deduplicar tokens más recientes por estudiante
  const deduplicated: LabReportToken[] = [];
  const seen = new Set<string>();
  for (const tok of tokens) {
    const studentId = tok.student?.id || tok.id;
    const labId = tok.lab?.id || 'default_lab';
    const key = `${studentId}_${labId}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduplicated.push(tok);
    }
  }

  const courseName = courseInfo?.name || deduplicated[0]?.course?.name || 'Química (Laboratorio Virtual)';
  const courseCode = courseInfo?.code || deduplicated[0]?.course?.code || 'QUI-101';
  const labName = deduplicated[0]?.lab?.name || 'Laboratorio Virtual de Química';
  const emissionDate = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

  // Estilos de diseño compartidos
  const borderThin: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  // =========================================================================
  // HOJA 1: CALIFICACIONES Y ENTREGAS
  // =========================================================================
  const ws1 = workbook.addWorksheet('📊 Calificaciones y Entregas', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 8 }],
  });

  // Título Institucional y Subtítulo
  ws1.mergeCells('A2:O2');
  const titleCell = ws1.getCell('A2');
  titleCell.value = `SISTEMA ACADÉMICO · REPORTE DE LABORATORIO: ${labName.toUpperCase()}`;
  titleCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF1E3A8A' } };
  ws1.getRow(2).height = 28;

  ws1.mergeCells('A3:O3');
  const subtitleCell = ws1.getCell('A3');
  subtitleCell.value = `Asignatura: ${courseName} (${courseCode})   |   Docente a cargo: ${teacherName || 'Andrea López'}   |   Fecha de emisión: ${emissionDate}`;
  subtitleCell.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
  ws1.getRow(3).height = 20;

  // Cálculo de Métricas KPI
  const totalStudents = deduplicated.length;
  let completedCount = 0;
  let totalScoresSum = 0;
  let scoresCount = 0;
  let totalTimeSum = 0;
  let completedTimeCount = 0;
  let surveyCount = 0;

  deduplicated.forEach((t) => {
    let fb: any = {};
    try {
      if (t.feedback_text && typeof t.feedback_text === 'string' && t.feedback_text.startsWith('{')) {
        fb = JSON.parse(t.feedback_text);
      }
    } catch (_) {}

    const hasSurvey = Boolean(fb?.survey?.submittedAt);
    const isDone = t.status === 'completed' || hasSurvey;
    if (isDone) completedCount++;
    if (hasSurvey) surveyCount++;

    const tasksCompleted = t.tasks_completed || 0;
    const tasksMissing = t.tasks_missing || 0;
    const totalTasks = tasksCompleted + tasksMissing || (isDone ? 4 : 0);

    let score: number | null = null;
    if (fb.score !== undefined && fb.score !== null) {
      score = Number(fb.score);
    } else if (totalTasks > 0) {
      score = Number(((tasksCompleted / totalTasks) * 10).toFixed(1));
    } else if (isDone) {
      score = 10.0;
    }

    if (score !== null) {
      totalScoresSum += score;
      scoresCount++;
    }

    if (t.time_spent_seconds && t.time_spent_seconds > 0) {
      totalTimeSum += t.time_spent_seconds;
      completedTimeCount++;
    }
  });

  const pendingCount = Math.max(0, totalStudents - completedCount);
  const avgScore = scoresCount > 0 ? (totalScoresSum / scoresCount).toFixed(1) : '-';
  const avgSeconds = completedTimeCount > 0 ? Math.round(totalTimeSum / completedTimeCount) : 0;
  const avgTimeFormatted = avgSeconds > 0 ? `${Math.floor(avgSeconds / 60)}m ${avgSeconds % 60}s` : '-';
  const completionPct = totalStudents > 0 ? Math.round((completedCount / totalStudents) * 100) : 0;

  // KPI 1: Matriculados
  ws1.mergeCells('A5:C5');
  ws1.getCell('A5').value = 'ALUMNOS MATRICULADOS';
  ws1.getCell('A5').font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF1E40AF' } };
  ws1.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
  ws1.getCell('A5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('A6:C6');
  ws1.getCell('A6').value = totalStudents;
  ws1.getCell('A6').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  ws1.getCell('A6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
  ws1.getCell('A6').alignment = { horizontal: 'center', vertical: 'middle' };

  // KPI 2: Prácticas Completadas
  ws1.mergeCells('D5:F5');
  ws1.getCell('D5').value = 'PRÁCTICAS COMPLETADAS';
  ws1.getCell('D5').font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF065F46' } };
  ws1.getCell('D5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFA7F3D0' } };
  ws1.getCell('D5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('D6:F6');
  ws1.getCell('D6').value = `${completedCount} (${completionPct}%)`;
  ws1.getCell('D6').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF047857' } };
  ws1.getCell('D6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
  ws1.getCell('D6').alignment = { horizontal: 'center', vertical: 'middle' };

  // KPI 3: Calificación Promedio
  ws1.mergeCells('G5:I5');
  ws1.getCell('G5').value = 'CALIFICACIÓN PROMEDIO';
  ws1.getCell('G5').font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF92400E' } };
  ws1.getCell('G5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDE68A' } };
  ws1.getCell('G5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('G6:I6');
  ws1.getCell('G6').value = `${avgScore} / 10`;
  ws1.getCell('G6').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFB45309' } };
  ws1.getCell('G6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
  ws1.getCell('G6').alignment = { horizontal: 'center', vertical: 'middle' };

  // KPI 4: Tiempo Promedio
  ws1.mergeCells('J5:L5');
  ws1.getCell('J5').value = 'TIEMPO PROMEDIO';
  ws1.getCell('J5').font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF5B21B6' } };
  ws1.getCell('J5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDDD6FE' } };
  ws1.getCell('J5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('J6:L6');
  ws1.getCell('J6').value = avgTimeFormatted;
  ws1.getCell('J6').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF6D28D9' } };
  ws1.getCell('J6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
  ws1.getCell('J6').alignment = { horizontal: 'center', vertical: 'middle' };

  // KPI 5: Pendientes
  ws1.mergeCells('M5:O5');
  ws1.getCell('M5').value = 'PENDIENTES POR PRESENTAR';
  ws1.getCell('M5').font = { name: 'Calibri', size: 8.5, bold: true, color: { argb: 'FF475569' } };
  ws1.getCell('M5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
  ws1.getCell('M5').alignment = { horizontal: 'center', vertical: 'middle' };

  ws1.mergeCells('M6:O6');
  ws1.getCell('M6').value = pendingCount;
  ws1.getCell('M6').font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FF334155' } };
  ws1.getCell('M6').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
  ws1.getCell('M6').alignment = { horizontal: 'center', vertical: 'middle' };

  // Encabezados de la Tabla Principal
  const headers1 = [
    '#',
    'ID Estudiante',
    'Nombre del Estudiante',
    'Correo Institucional',
    'Grupo / Salón',
    'Laboratorio',
    'Estado de Práctica',
    'Modalidad',
    'Calificación (0 - 10)',
    'Efectividad',
    'Misiones',
    'Tiempo Empleado',
    'Fecha de Entrega',
    'Encuesta Respondida',
    'Observaciones del Docente',
  ];

  const headerRow1 = ws1.getRow(8);
  headerRow1.values = headers1;
  headerRow1.height = 30;
  headerRow1.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = borderThin;
  });

  // Filas de Datos
  deduplicated.forEach((tok, idx) => {
    let parsedFeedback: any = {};
    try {
      if (tok.feedback_text && typeof tok.feedback_text === 'string' && tok.feedback_text.startsWith('{')) {
        parsedFeedback = JSON.parse(tok.feedback_text);
      }
    } catch (_) {}

    const student = tok.student || {};
    const survey = parsedFeedback.survey || {};
    const hasSurvey = Boolean(survey.submittedAt);
    const isDone = tok.status === 'completed' || hasSurvey;

    const tasksCompleted = tok.tasks_completed || 0;
    const tasksMissing = tok.tasks_missing || 0;
    const totalTasks = tasksCompleted + tasksMissing || (isDone ? 4 : 0);

    const scoreNum = parsedFeedback.score !== undefined
      ? Number(parsedFeedback.score)
      : (totalTasks > 0 ? Number(((tasksCompleted / totalTasks) * 10).toFixed(1)) : (isDone ? 10.0 : null));

    const percentageVal = parsedFeedback.percentage !== undefined
      ? (parsedFeedback.percentage / 100)
      : (totalTasks > 0 ? (tasksCompleted / totalTasks) : (isDone ? 1 : null));

    const timeSpent = tok.time_spent_seconds || 0;
    const formattedTime = timeSpent > 0 ? `${Math.floor(timeSpent / 60)}m ${timeSpent % 60}s` : '-';

    const teacherNote = typeof tok.feedback_text === 'string' && !tok.feedback_text.startsWith('{')
      ? tok.feedback_text
      : (parsedFeedback.legacyNote || '');

    const rowNum = 9 + idx;
    const row = ws1.getRow(rowNum);
    row.height = 24;

    const isEven = idx % 2 === 0;
    const rowFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF8FAFC' },
    };

    const effectiveDevice = (
      survey.deviceUsed ||
      parsedFeedback.device ||
      parsedFeedback.playMode ||
      tok.play_mode ||
      'PC'
    ).toUpperCase();

    row.values = [
      idx + 1,
      student.document_id || `EST-${student.id ? student.id.slice(0, 6) : 'N/A'}`,
      student.name || 'Estudiante',
      student.email || '',
      student.job_title || 'tallermultiple-1',
      tok.lab?.name || labName,
      isDone ? 'COMPLETADO' : tok.status === 'in_progress' ? 'EN PARTIDA' : 'PENDIENTE',
      effectiveDevice,
      scoreNum !== null ? scoreNum : '',
      percentageVal !== null ? percentageVal : '',
      isDone ? `${tasksCompleted}/${totalTasks}` : '-',
      formattedTime,
      tok.completed_at ? new Date(tok.completed_at).toLocaleString('es-CO') : '-',
      hasSurvey ? 'SÍ (Respondida)' : 'NO',
      teacherNote,
    ];

    row.eachCell((cell, colNumber) => {
      cell.fill = rowFill;
      cell.border = borderThin;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle' };

      // Centrados estándar
      if ([1, 2, 5, 8, 11, 12, 13, 14].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Nombre (Col 3)
      if (colNumber === 3) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
      }

      // Estado (Col 7)
      if (colNumber === 7) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (isDone) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD1FAE5' } };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF065F46' } };
        } else if (tok.status === 'in_progress') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF1E40AF' } };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3CD' } };
          cell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FF92400E' } };
        }
      }

      // Calificación (Col 9)
      if (colNumber === 9) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        if (typeof cell.value === 'number') {
          cell.numFmt = '0.0';
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: cell.value >= 7 ? 'FF047857' : 'FFB91C1C' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0FDF4' } };
        }
      }

      // Efectividad % (Col 10)
      if (colNumber === 10 && typeof cell.value === 'number') {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.numFmt = '0%';
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF047857' } };
      }
    });
  });

  // Anchos de columna en Hoja 1
  ws1.columns = [
    { width: 6 },   // #
    { width: 16 },  // ID Estudiante
    { width: 26 },  // Nombre
    { width: 30 },  // Correo
    { width: 18 },  // Grupo
    { width: 28 },  // Laboratorio
    { width: 18 },  // Estado
    { width: 14 },  // Modalidad
    { width: 20 },  // Calificacion
    { width: 14 },  // Efectividad
    { width: 14 },  // Misiones
    { width: 16 },  // Tiempo
    { width: 22 },  // Fecha
    { width: 20 },  // Encuesta
    { width: 35 },  // Observaciones
  ];

  // Filtro automático en Hoja 1
  ws1.autoFilter = {
    from: { row: 8, column: 1 },
    to: { row: 8, column: 15 },
  };

  // =========================================================================
  // HOJA 2: ENCUESTAS E INVESTIGACIÓN PEDAGÓGICA
  // =========================================================================
  const ws2 = workbook.addWorksheet('📝 Encuesta e Investigación', {
    views: [{ showGridLines: true, state: 'frozen', ySplit: 5 }],
  });

  ws2.mergeCells('A2:L2');
  const titleWs2 = ws2.getCell('A2');
  titleWs2.value = `RESULTADOS DE INVESTIGACIÓN PEDAGÓGICA Y USABILIDAD`;
  titleWs2.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF0F4C5C' } };
  ws2.getRow(2).height = 28;

  ws2.mergeCells('A3:L3');
  const subWs2 = ws2.getCell('A3');
  subWs2.value = `Percepción estudiantil sobre el simulador: Comprensión conceptual, Usabilidad técnica y Motivación didáctica (Escala Likert 1 a 5)`;
  subWs2.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
  ws2.getRow(3).height = 20;

  const headers2 = [
    '#',
    'ID Alumno',
    'Estudiante',
    'Correo Institucional',
    'Dispositivo Utilizado',
    'Comprensión del Tema (1 a 5)',
    'Usabilidad del Simulador (1 a 5)',
    'Motivación Generada (1 a 5)',
    'Promedio Percepción',
    'Misión Más Desafiante',
    'Sugerencias y Comentarios del Estudiante',
    'Fecha de Envío',
  ];

  const headerRow2 = ws2.getRow(5);
  headerRow2.values = headers2;
  headerRow2.height = 30;
  headerRow2.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F4C5C' } }; // Dark Teal
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = borderThin;
  });

  deduplicated.forEach((tok, idx) => {
    let parsedFeedback: any = {};
    try {
      if (tok.feedback_text && typeof tok.feedback_text === 'string' && tok.feedback_text.startsWith('{')) {
        parsedFeedback = JSON.parse(tok.feedback_text);
      }
    } catch (_) {}

    const student = tok.student || {};
    const survey = parsedFeedback.survey || {};
    const hasSurvey = Boolean(survey.submittedAt);

    const effectiveDevice = (
      survey.deviceUsed ||
      parsedFeedback.device ||
      parsedFeedback.playMode ||
      tok.play_mode ||
      'PC'
    ).toUpperCase();

    const uScore = Number(survey.understandingScore) || null;
    const usScore = Number(survey.usabilityScore) || null;
    const mScore = Number(survey.motivationScore) || null;
    const avgRating = (uScore && usScore && mScore) ? Number(((uScore + usScore + mScore) / 3).toFixed(1)) : null;

    const rowNum = 6 + idx;
    const row = ws2.getRow(rowNum);
    row.height = 36;

    const isEven = idx % 2 === 0;
    const rowFill: ExcelJS.Fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFFFFFFF' : 'FFF9FAFB' },
    };

    row.values = [
      idx + 1,
      student.document_id || `EST-${student.id ? student.id.slice(0, 6) : 'N/A'}`,
      student.name || 'Estudiante',
      student.email || '',
      effectiveDevice,
      hasSurvey ? (uScore || '-') : 'Pendiente',
      hasSurvey ? (usScore || '-') : 'Pendiente',
      hasSurvey ? (mScore || '-') : 'Pendiente',
      hasSurvey ? (avgRating || '-') : 'Pendiente',
      hasSurvey ? (survey.challengingMission || 'Ninguna en particular') : 'Sin respuesta',
      hasSurvey ? (survey.suggestions || 'Sin sugerencias adicionales') : 'Sin respuesta',
      hasSurvey && survey.submittedAt ? new Date(survey.submittedAt).toLocaleString('es-CO') : '-',
    ];

    row.eachCell((cell, colNumber) => {
      cell.fill = rowFill;
      cell.border = borderThin;
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
      cell.alignment = { vertical: 'middle' };

      if ([1, 2, 5, 6, 7, 8, 9, 12].includes(colNumber)) {
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Dispositivo Utilizado (Col 5)
      if (colNumber === 5) {
        cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F4C5C' } };
      }

      // Estrellas / Calificaciones Likert (Cols 6, 7, 8, 9)
      if ([6, 7, 8, 9].includes(colNumber) && typeof cell.value === 'number') {
        cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF0F4C5C' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6FFFA' } };
        cell.numFmt = '0.0';
      }

      // Misión Desafiante y Sugerencias (Cols 10, 11)
      if ([10, 11].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', wrapText: true };
        if (cell.value && cell.value !== 'Sin respuesta') {
          cell.font = { name: 'Calibri', size: 9.5, italic: true, color: { argb: 'FF1E293B' } };
        }
      }
    });
  });

  ws2.columns = [
    { width: 6 },   // #
    { width: 16 },  // ID Alumno
    { width: 26 },  // Estudiante
    { width: 30 },  // Correo
    { width: 22 },  // Dispositivo
    { width: 22 },  // Comprension
    { width: 22 },  // Usabilidad
    { width: 22 },  // Motivacion
    { width: 20 },  // Promedio
    { width: 32 },  // Desafio
    { width: 45 },  // Sugerencias
    { width: 22 },  // Fecha
  ];

  ws2.autoFilter = {
    from: { row: 5, column: 1 },
    to: { row: 5, column: 12 },
  };

  // =========================================================================
  // HOJA 3: RESUMEN ESTADÍSTICO Y EJECUTIVO
  // =========================================================================
  const ws3 = workbook.addWorksheet('📈 Resumen Ejecutivo', {
    views: [{ showGridLines: true }],
  });

  ws3.mergeCells('A2:F2');
  const titleWs3 = ws3.getCell('A2');
  titleWs3.value = `RESUMEN ESTADÍSTICO DE DESEMPEÑO E INVESTIGACIÓN`;
  titleWs3.font = { name: 'Calibri', size: 15, bold: true, color: { argb: 'FF7C2D12' } };
  ws3.getRow(2).height = 28;

  ws3.mergeCells('A3:F3');
  const subWs3 = ws3.getCell('A3');
  subWs3.value = `Consolidado para coordinación académica, rectoría y comités curriculares`;
  subWs3.font = { name: 'Calibri', size: 11, italic: true, color: { argb: 'FF475569' } };
  ws3.getRow(3).height = 20;

  // Conteo de Plataformas
  let pcCount = 0;
  let vrCount = 0;
  let ambosCount = 0;
  deduplicated.forEach(t => {
    let fb: any = {};
    try { if (t.feedback_text && typeof t.feedback_text === 'string' && t.feedback_text.startsWith('{')) fb = JSON.parse(t.feedback_text); } catch (_) {}
    const dev = (fb.survey?.deviceUsed || fb.device || fb.playMode || t.play_mode || 'PC').toUpperCase();
    if (dev === 'VR') vrCount++;
    else if (dev === 'AMBOS' || dev === 'HIBRIDO') ambosCount++;
    else pcCount++;
  });

  // Tabla 1: Estadísticas de Participación
  ws3.mergeCells('A5:C5');
  ws3.getCell('A5').value = '1. MÉTRICAS DE PARTICIPACIÓN ACADÉMICA';
  ws3.getCell('A5').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getCell('A5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } };
  ws3.getRow(5).height = 24;

  const partRows = [
    ['Total de Estudiantes Matriculados', totalStudents],
    ['Prácticas Completadas con Éxito', completedCount],
    ['Prácticas Aún Pendientes de Presentar', pendingCount],
    ['Tasa de Cumplimiento / Entrega', `${completionPct}%`],
    ['Encuestas de Investigación Respondidas', `${surveyCount} (${totalStudents > 0 ? Math.round((surveyCount / totalStudents) * 100) : 0}%)`],
  ];

  partRows.forEach((r, i) => {
    const row = ws3.getRow(6 + i);
    row.height = 22;
    ws3.mergeCells(`A${6 + i}:B${6 + i}`);
    ws3.getCell(`A${6 + i}`).value = r[0];
    ws3.getCell(`A${6 + i}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws3.getCell(`A${6 + i}`).border = borderThin;

    ws3.getCell(`C${6 + i}`).value = r[1];
    ws3.getCell(`C${6 + i}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws3.getCell(`C${6 + i}`).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    ws3.getCell(`C${6 + i}`).border = borderThin;
  });

  // Tabla 2: Estadísticas de Desempeño
  ws3.mergeCells('E5:G5');
  ws3.getCell('E5').value = '2. DESEMPEÑO TÉCNICO Y NOTAS';
  ws3.getCell('E5').font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  ws3.getCell('E5').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF047857' } };

  const perfRows = [
    ['Calificación Promedio (Escala 0 a 10)', `${avgScore} / 10`],
    ['Tiempo Promedio de Simulación', avgTimeFormatted],
    ['Estudiantes con Nota Sobresaliente (>= 9.0)', completedCount],
    ['Simulador Empleado', labName],
    ['Plataformas Utilizadas', `PC: ${pcCount} | VR: ${vrCount} | Ambos: ${ambosCount}`],
  ];

  perfRows.forEach((r, i) => {
    const row = ws3.getRow(6 + i);
    ws3.mergeCells(`E${6 + i}:F${6 + i}`);
    ws3.getCell(`E${6 + i}`).value = r[0];
    ws3.getCell(`E${6 + i}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF334155' } };
    ws3.getCell(`E${6 + i}`).border = borderThin;

    ws3.getCell(`G${6 + i}`).value = r[1];
    ws3.getCell(`G${6 + i}`).alignment = { horizontal: 'center', vertical: 'middle' };
    ws3.getCell(`G${6 + i}`).font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FF047857' } };
    ws3.getCell(`G${6 + i}`).border = borderThin;
  });

  ws3.columns = [
    { width: 28 }, // A
    { width: 14 }, // B
    { width: 18 }, // C
    { width: 6 },  // D (Separador)
    { width: 28 }, // E
    { width: 14 }, // F
    { width: 24 }, // G
  ];

  // Escribir a Buffer binario
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
