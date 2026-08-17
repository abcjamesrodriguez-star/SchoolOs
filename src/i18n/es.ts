// ============================================================
// SchoolOS — Traducciones en español
// ============================================================
import type { Translations } from './en';

export const es: Translations = {
  lang: 'es' as const,

  // ── Nav ────────────────────────────────────────────────────
  nav: {
    home:       'Inicio',
    platform:   'Plataforma',
    forSchools: 'Para Escuelas',
    pricing:    'Planes',
    about:      'Nosotros',
    login:      'Iniciar sesión',
    demo:       'Solicitar Demo',
  },

  // ── Footer ─────────────────────────────────────────────────
  footer: {
    platform:   'Plataforma',
    forSchools: 'Para Escuelas',
    pricing:    'Planes',
    about:      'Nosotros',
    contact:    'Contacto',
  },

  // ── Página de inicio ───────────────────────────────────────
  index: {
    meta: {
      title:       'SchoolOS — Tu escuela. Un espacio digital.',
      description: 'Clases, guías, evaluaciones y comunicación — conectados en una sola plataforma, para aulas presenciales y aprendizaje a distancia.',
    },
    hero: {
      eyebrow:  'Una plataforma para escuelas',
      h1a:      'Tu escuela.',
      h1b:      'Un espacio',
      h1em:     'digital.',
      h1c:      '',
      lede:     'Clases, guías, evaluaciones y comunicación — conectados en una sola plataforma, para aulas presenciales y aprendizaje a distancia.',
      ctaPrimary:   'Solicitar Demo →',
      ctaSecondary: 'Explorar Plataforma →',
    },
    cards: {
      student: {
        label: 'Panel del Estudiante',
        lines: ['Biología — Hoy, 9:00', 'Matemáticas — Hoy, 11:00', 'Historia — Tarea pendiente'],
      },
      teacher: {
        label: 'Panel del Docente',
        lines: ['Mis clases — 4 grupos', 'Calificar tareas — 12 pendientes', 'Crear evaluación'],
      },
    },
    problem: {
      eyebrow: 'El problema',
      heading: 'Una escuela. Muchas herramientas.<br />Un solo lugar.',
      copy: 'Las escuelas suelen depender de herramientas desconectadas para clases, tareas, evaluaciones y comunicación. Esta plataforma las une en un solo entorno.',
      convergeLabel: 'Seis herramientas desconectadas',
      platformLabel: 'UNA PLATAFORMA',
      tools: [
        { name: 'Clases',         note: 'En vivo y grabadas'       },
        { name: 'Guías',          note: 'Actividades de aprendizaje' },
        { name: 'Evaluaciones',   note: 'Exámenes y pruebas'        },
        { name: 'Proyectos',      note: 'Trabajo en equipo'          },
        { name: 'Calificaciones', note: 'Seguimiento de progreso'    },
        { name: 'Comunicación',   note: 'Para toda la escuela'       },
      ],
    },
    audienceMini: {
      eyebrow: 'Construido para toda la escuela',
      h2:      'Estudiantes, docentes y escuelas — en un solo sistema',
      linkLabel: 'Ver la descripción completa para escuelas →',
    },
    cta: {
      eyebrow: 'Comenzar',
      heading: 'Construye una mejor<br />escuela digital.',
      copy:    'Une tus clases, maestros, estudiantes y actividad académica — en una sola plataforma conectada.',
      btn1: 'Solicitar Demo →',
      btn2: 'Explorar la Plataforma →',
    },
  },

  // ── Página de Plataforma ───────────────────────────────────
  platform: {
    meta: {
      title:       'Plataforma — SchoolOS',
      description: 'Seis herramientas conectadas — clases, guías, evaluaciones, calificaciones, comunicación y gestión escolar — diseñadas para funcionar como una sola.',
    },
    head: {
      eyebrow: 'Plataforma',
      h1:      'Todo lo que tu escuela necesita,\nen un solo sistema',
      lede:    'Seis herramientas conectadas — clases, guías, evaluaciones, calificaciones, comunicación y gestión escolar — diseñadas para funcionar como una sola.',
    },
    showcase: {
      eyebrow: 'En la práctica',
      h2:      'Todo conectado',
      cards: {
        school:  { label: 'Panel de la Escuela',   lines: ['1,204 estudiantes · 68 docentes', '42 clases activas', '96% de asistencia esta semana'] },
        student: { label: 'App del Estudiante',    lines: ['3 clases hoy', '1 evaluación pendiente'] },
        teacher: { label: 'App del Docente',       lines: ['12 tareas por calificar', 'Nueva guía publicada'] },
      },
    },
    diagram: {
      eyebrow:   'Presencial y digital',
      h2:        'El aprendizaje no tiene una sola ubicación',
      copy:      'Ya sea que los estudiantes estén en el aula, en casa o en cualquier lugar intermedio, la escuela permanece conectada.',
      nodes: {
        classroom: {
          tag: 'Presencial',
          title: 'En el Aula',
          desc: 'Aprendizaje en persona con guías digitales, toma de asistencia e interacción directa.',
          items: ['Guías digitales interactivas', 'Asistencia en tiempo real', 'Participación en el aula'],
        },
        platform: {
          tag: 'Núcleo Central',
          title: 'SchoolOS',
          desc: 'La fuente única de verdad que une toda la actividad académica al instante.',
          items: ['Sincronización instantánea', 'Libro de calificaciones único', 'Centro escolar conectado'],
        },
        remote: {
          tag: 'A Distancia',
          title: 'Remoto',
          desc: 'Entorno de aprendizaje virtual para garantizar educación continua desde cualquier lugar.',
          items: ['Clases en vivo y grabadas', 'Entrega digital de tareas', 'Acceso para alumnos 24/7'],
        },
      },
    },
    cta: {
      eyebrow: 'Míralo en tu escuela',
      heading: '¿Listo para conectar<br />tus aulas?',
      copy:    'Une clases, guías, evaluaciones y comunicación en un solo sistema.',
      btn1: 'Solicitar Demo →',
      btn2: 'Ver para tu escuela →',
    },
  },

  // ── Para Escuelas ──────────────────────────────────────────
  forSchools: {
    meta: {
      title:       'Para Escuelas — SchoolOS',
      description: 'No un panel para un tipo de usuario — un sistema donde estudiantes, docentes y administradores reciben exactamente lo que necesitan.',
    },
    head: {
      eyebrow: 'Para Escuelas',
      h1:      'Construido para toda la escuela',
      lede:    'No un panel para un tipo de usuario — un sistema donde estudiantes, docentes y administradores reciben exactamente lo que necesitan.',
    },
    audienceGrid: {
      eyebrow: 'Construido para toda la escuela',
      h2:      'Estudiantes, docentes y escuelas — en un solo sistema',
      linkLabel: 'Ver la descripción completa para escuelas →',
    },
    flow: [
      { number: '01', title: 'La Escuela',      description: 'Crea su entorno digital.' },
      { number: '02', title: 'Los Docentes',    description: 'Crean clases y actividades de aprendizaje.' },
      { number: '03', title: 'Los Estudiantes', description: 'Acceden a clases, guías y evaluaciones.' },
      { number: '04', title: 'La Escuela',      description: 'Monitorea el progreso académico.' },
    ],
    flowHead: { eyebrow: 'Cómo funciona', h2: 'De la escuela al estudiante' },
    testimonials: {
      eyebrow: 'Lo que dicen',
      h2:      'Confianza en toda la escuela',
    },
    cta: {
      eyebrow: 'Comenzar',
      heading: 'Lleva tu escuela<br />a un solo sistema.',
      copy:    'Descubre cómo SchoolOS se adapta a tus estudiantes, docentes y administración.',
      btn1: 'Solicitar Demo →',
      btn2: 'Ver Planes Escolares →',
    },
  },

  // ── Planes / Precios ───────────────────────────────────────
  pricing: {
    meta: {
      title:       'Planes — SchoolOS',
      description: 'Cada plan incluye clases, guías, evaluaciones y comunicación. Elige el nivel que se ajuste al tamaño de tu institución.',
    },
    head: {
      eyebrow: 'Planes Escolares',
      h1:      'Precios que crecen\ncon tu escuela',
      lede:    'Cada plan incluye clases, guías, evaluaciones y comunicación. Elige el nivel que se ajuste al tamaño de tu institución.',
    },
    faqHead: {
      eyebrow: 'Preguntas frecuentes',
      h2:      'Antes de solicitar una demo',
    },
    faq: [
      {
        question: '¿Cómo se calcula el precio?',
        answer: 'Los planes se basan en el total de estudiantes inscritos. Tu contacto de SchoolOS confirmará el precio exacto para el tamaño de tu institución durante la demo.',
      },
      {
        question: '¿Podemos cambiar de plan después?',
        answer: 'Sí. A medida que crece tu escuela, puedes pasar a un nivel superior en cualquier momento del año escolar sin perder el historial académico.',
      },
      {
        question: '¿Todos los planes incluyen clases virtuales?',
        answer: 'Las clases virtuales y presenciales se incluyen desde el plan Profesional. El plan Inicial cubre clases presenciales con guías y evaluaciones digitales.',
      },
    ],
    cta: {
      eyebrow: 'Comenzar',
      heading: 'Habla con nuestro equipo',
      copy:    'Te ayudaremos a encontrar el plan ideal para el tamaño y estructura de tu escuela.',
      btn1: 'Solicitar Demo →',
      btn2: 'Ver para tu escuela →',
    },
  },

  // ── Nosotros ───────────────────────────────────────────────
  about: {
    meta: {
      title:       'Nosotros — SchoolOS',
      description: 'SchoolOS nació de una observación simple: las escuelas no carecían de contenido, carecían de un sistema.',
    },
    head: {
      eyebrow: 'Nosotros',
      h1:      'No vendemos cursos.<br />Conectamos escuelas.',
      lede:    'SchoolOS nació de una observación simple: las escuelas no carecían de contenido, carecían de un sistema.',
    },
    copy: [
      '<strong>La mayoría de las escuelas funcionan con una colección de herramientas desconectadas</strong> — una para calificaciones, otra para mensajes con padres, un drive compartido para guías, una app separada para clases virtuales. Cada brecha entre esas herramientas es un lugar donde un estudiante se queda atrás, una calificación queda sin registrar, o un docente pasa la tarde en papeleo en vez de enseñar.',
      'SchoolOS reúne clases, guías, evaluaciones, calificaciones y comunicación en un entorno conectado — construido alrededor de cómo funciona realmente una escuela, no alrededor de un solo curso o salón.',
      'Construimos para tres personas a la vez: el <strong>estudiante</strong> que trata de seguir su trabajo, el <strong>docente</strong> que quiere enseñar en vez de administrar, y la <strong>escuela</strong> que necesita ver el panorama completo. Cuando los tres comparten un sistema, nada se pierde.',
    ],
    stats: [
      { num: '1', label: 'Plataforma para toda la escuela' },
      { num: '3', label: 'Roles de usuario, un sistema' },
      { num: '6', label: 'Herramientas académicas conectadas' },
    ],
    values: {
      eyebrow: 'En lo que creemos',
      h2:      'Cómo construimos',
      items: [
        { num: '01', h4: 'Un sistema, no una herramienta más',          p: 'Cada función debe reducir el número de lugares que una escuela necesita revisar, no agregar uno.' },
        { num: '02', h4: 'Presencial y a distancia, por igual',         p: 'El aprendizaje no tiene una sola ubicación, así que la plataforma no asume una.' },
        { num: '03', h4: 'Construido con escuelas, no solo para ellas', p: 'Cada flujo de trabajo está moldeado por cómo los docentes y administradores realmente pasan su día.' },
      ],
    },
    cta: {
      eyebrow: 'Comenzar',
      heading: 'Conectemos<br />tu escuela.',
      copy:    'Descubre cómo SchoolOS une tu actividad académica en un solo lugar.',
      btn1: 'Solicitar Demo →',
      btn2: 'Explorar la Plataforma →',
    },
  },

  // ── Página de inicio de sesión ──────────────────────────────
  loginPage: {
    metaTitle:       'Iniciar Sesión — SchoolOS',
    brandSubtitle:   'Acceso a la Plataforma Interna',
    title:           'Iniciar Sesión',
    intro:           'Accede al panel administrativo y de gestión escolar.',
    demoPill:        'Demo: admin / 123',
    autoFill:        'Autollenar ↙',
    errorMsg:        'Credenciales incorrectas. Usa <strong>admin</strong> y contraseña <strong>123</strong>.',
    userLabel:       'Usuario o Email',
    userPlaceholder: 'admin',
    passLabel:       'Contraseña',
    passPlaceholder: '••••',
    submitBtn:       'Entrar al Sistema →',
    backHome:        '← Volver al sitio principal',
  },

  // ── Panel Interno (App) ─────────────────────────────────────
  app: {
    sidebar: {
      brandRole:       'Super Admin',
      systemGroup:     'Sistema',
      complianceGroup: 'Cumplimiento',
      configGroup:     'Configuración',
      dashboard:       'Dashboard',
      schools:         'Escuelas',
      users:           'Usuarios',
      plans:           'Planes',
      judicialAccess:  'Acceso Judicial',
      auditLog:        'Registro de Auditoría',
      settings:        'Configuración',
      webLink:         'Web ↗',
      version:         'v1.0 · Mock Auth',
    },
    topbar: {
      searchPlaceholder: 'Buscar escuelas, usuarios…',
      logout:            'Salir',
    },
    dashboard: {
      activeSchools:     'Escuelas Activas',
      activeSchoolsSub:  '+6 este mes',
      totalStudents:     'Estudiantes Totales',
      totalStudentsSub:  'en todas las escuelas',
      trialSchools:      'Escuelas en Prueba',
      trialSchoolsSub:   'prom. 9 días restantes',
      suspendedSchools:  'Vencidas / Suspendidas',
      suspendedSchoolsSub: 'requieren atención',
      recentSchools:     'Escuelas creadas recientemente',
      recentActivity:    'Actividad reciente',
      viewAll:           'Ver todas →',
    },
    schools: {
      title:        'Escuelas',
      allStatuses:  'Todos los estados',
      allPlans:     'Todos los planes',
      newSchool:    '+ Nueva Escuela',
      view:         'Ver',
    },
    schoolDetail: {
      back:          '← Volver a Escuelas',
      students:      'Estudiantes',
      teachers:      'Docentes',
      classes:       'Clases Activas',
      auditStatus:   'Estado de Auditoría',
      admins:        'Administradores escolares',
      inviteAdmin:   '+ Invitar administrador',
      judicialAccess:'Acceso Judicial',
      requestAccess: '+ Solicitar Acceso Judicial',
      changePlan:    'Cambiar Plan',
      editDetails:   'Editar Datos',
      suspend:       'Suspender',
    },
  },
};

