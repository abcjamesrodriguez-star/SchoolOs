// ============================================================
// SchoolOS — English translations
// ============================================================

export const en = {
  lang: 'en' as const,

  // ── Nav ────────────────────────────────────────────────────
  nav: {
    home:       'Home',
    platform:   'Platform',
    forSchools: 'For Schools',
    pricing:    'Pricing',
    about:      'About',
    login:      'Log in',
    demo:       'Request a Demo',
  },

  // ── Footer ─────────────────────────────────────────────────
  footer: {
    platform:   'Platform',
    forSchools: 'For Schools',
    pricing:    'Pricing',
    about:      'About',
    contact:    'Contact',
  },

  // ── Index page ─────────────────────────────────────────────
  index: {
    meta: {
      title:       'SchoolOS — Your school. One digital space.',
      description: 'Classes, guides, evaluations and communication — connected in one platform, for classrooms and remote learning alike.',
    },
    hero: {
      eyebrow:  'A platform for schools',
      h1a:      'Your school.',
      h1b:      'One',
      h1em:     'digital',
      h1c:      'space.',
      lede:     'Classes, guides, evaluations and communication — connected in one platform, for classrooms and remote learning alike.',
      ctaPrimary:   'Request a Demo →',
      ctaSecondary: 'Explore Platform →',
    },
    cards: {
      student: {
        label: 'Student Dashboard',
        lines: ['Biology — Today, 9:00', 'Mathematics — Today, 11:00', 'History — Assignment due'],
      },
      teacher: {
        label: 'Teacher Dashboard',
        lines: ['My classes — 4 groups', 'Grade assignments — 12 pending', 'Create evaluation'],
      },
    },
    problem: {
      eyebrow: 'The problem',
      heading: 'One school. Many tools.<br />One place.',
      copy: 'Schools often rely on disconnected tools for classes, assignments, evaluations and communication. This platform brings them together in one environment.',
      convergeLabel: 'Six disconnected tools',
      platformLabel: 'ONE PLATFORM',
      tools: [
        { name: 'Classes',       note: 'Live & recorded'      },
        { name: 'Guides',        note: 'Learning activities'  },
        { name: 'Evaluations',   note: 'Assessments'          },
        { name: 'Projects',      note: 'Group work'           },
        { name: 'Grades',        note: 'Progress tracking'    },
        { name: 'Communication', note: 'School-wide'          },
      ],
    },
    audienceMini: {
      eyebrow: 'Built for the whole school',
      h2:      'Students, teachers and schools — in one system',
      linkLabel: 'See the full breakdown for schools →',
    },
    cta: {
      eyebrow: 'Get started',
      heading: 'Build a better<br />digital school.',
      copy:    'Bring your classes, teachers, students and academic activity together — in one connected platform.',
      btn1: 'Request a Demo →',
      btn2: 'Explore the Platform →',
    },
  },

  // ── Platform page ──────────────────────────────────────────
  platform: {
    meta: {
      title:       'Platform — SchoolOS',
      description: 'Six connected tools — classes, guides, evaluations, grades, communication and school management — built to work as one.',
    },
    head: {
      eyebrow: 'Platform',
      h1:      'Everything your school needs,\nin one system',
      lede:    'Six connected tools — classes, guides, evaluations, grades, communication and school management — built to work as one.',
    },
    showcase: {
      eyebrow: 'In practice',
      h2:      'Everything connected',
      cards: {
        school:  { label: 'School Dashboard',  lines: ['1,204 students · 68 teachers', '42 active classes', '96% attendance this week'] },
        student: { label: 'Student App',       lines: ['3 classes today', '1 evaluation pending'] },
        teacher: { label: 'Teacher App',       lines: ['12 assignments to grade', 'New guide published'] },
      },
    },
    diagram: {
      eyebrow:   'Presential & digital',
      h2:        "Learning doesn't have one location",
      copy:      'Whether students are in the classroom, at home or somewhere in between, the school stays connected.',
      nodes: {
        classroom: {
          tag: 'Presential',
          title: 'Classroom',
          desc: 'In-person learning with digital guides, attendance and direct interaction.',
          items: ['Digital activity guides', 'Live attendance tracking', 'In-class participation'],
        },
        platform: {
          tag: 'Central Core',
          title: 'SchoolOS',
          desc: 'The single source of truth connecting all academic activity in real time.',
          items: ['Instant data sync', 'Unified gradebook', 'School-wide hub'],
        },
        remote: {
          tag: 'Off-site',
          title: 'Remote',
          desc: 'Virtual learning environment ensuring continuous education from anywhere.',
          items: ['Live video & recordings', 'Assignment submissions', '24/7 student access'],
        },
      },
    },
    cta: {
      eyebrow: 'See it in your school',
      heading: 'Ready to connect<br />your classrooms?',
      copy:    'Bring classes, guides, evaluations and communication together in one system.',
      btn1: 'Request a Demo →',
      btn2: 'See it for your school →',
    },
  },

  // ── For Schools page ───────────────────────────────────────
  forSchools: {
    meta: {
      title:       'For Schools — SchoolOS',
      description: 'Not one dashboard for one kind of user — a system where students, teachers and administrators each get exactly what they need.',
    },
    head: {
      eyebrow: 'For Schools',
      h1:      'Built for the whole school',
      lede:    'Not one dashboard for one kind of user — a system where students, teachers and administrators each get exactly what they need.',
    },
    audienceGrid: {
      eyebrow: 'Built for the whole school',
      h2:      'Students, teachers and schools — in one system',
      linkLabel: 'See the full breakdown for schools →',
    },
    flow: [
      { number: '01', title: 'School',    description: 'Creates its digital environment.' },
      { number: '02', title: 'Teachers',  description: 'Create classes and learning activities.' },
      { number: '03', title: 'Students',  description: 'Access classes, guides and evaluations.' },
      { number: '04', title: 'School',    description: 'Monitors academic progress.' },
    ],
    flowHead: { eyebrow: 'How it works', h2: 'From school to student' },
    testimonials: {
      eyebrow: 'What people say',
      h2:      'Trusted across the school',
    },
    cta: {
      eyebrow: 'Get started',
      heading: 'Bring your school<br />into one system.',
      copy:    'See how SchoolOS fits your students, teachers and administration.',
      btn1: 'Request a Demo →',
      btn2: 'See School Plans →',
    },
  },

  // ── Pricing page ───────────────────────────────────────────
  pricing: {
    meta: {
      title:       'Pricing — SchoolOS',
      description: "Every plan includes classes, guides, evaluations and communication. Choose the tier that matches your institution's size.",
    },
    head: {
      eyebrow: 'School Plans',
      h1:      'Pricing that grows\nwith your school',
      lede:    "Every plan includes classes, guides, evaluations and communication. Choose the tier that matches your institution's size.",
    },
    faqHead: {
      eyebrow: 'Common questions',
      h2:      'Before you request a demo',
    },
    faq: [
      {
        question: 'How is pricing calculated?',
        answer: "Plans are based on your total enrolled students. Your SchoolOS contact will confirm exact pricing for your institution's size during the demo.",
      },
      {
        question: 'Can we switch plans later?',
        answer: 'Yes. As your school grows, you can move to a higher tier at any point in the school year without losing academic history.',
      },
      {
        question: 'Does every plan support virtual classes?',
        answer: 'Virtual and presential classes are both included from the Professional plan up. Starter covers presential classes with digital guides and evaluations.',
      },
    ],
    cta: {
      eyebrow: 'Get started',
      heading: 'Talk to our team',
      copy:    "We'll help you find the right plan for your school's size and structure.",
      btn1: 'Request a Demo →',
      btn2: 'See it for your school →',
    },
  },

  // ── About page ─────────────────────────────────────────────
  about: {
    meta: {
      title:       'About — SchoolOS',
      description: "SchoolOS started from a simple observation: schools weren't missing content, they were missing a system.",
    },
    head: {
      eyebrow: 'About',
      h1:      "We don't sell courses.<br />We connect schools.",
      lede:    "SchoolOS started from a simple observation: schools weren't missing content, they were missing a system.",
    },
    copy: [
      '<strong>Most schools run on a patchwork of tools</strong> — one for grading, one for messaging parents, a shared drive for guides, a separate app for virtual classes. Every gap between those tools is a place where a student falls behind, a grade goes unrecorded, or a teacher spends an evening on paperwork instead of teaching.',
      'SchoolOS brings classes, guides, evaluations, grades and communication into one connected environment — built around how a school actually works, not around a single course or a single classroom.',
      'We build for three people at once: the <strong>student</strong> trying to keep track of their work, the <strong>teacher</strong> trying to teach instead of administrate, and the <strong>school</strong> trying to see the whole picture. When all three share one system, nothing falls through the cracks.',
    ],
    stats: [
      { num: '1', label: 'Platform for the whole school' },
      { num: '3', label: 'User roles, one system' },
      { num: '6', label: 'Connected academic tools' },
    ],
    values: {
      eyebrow: 'What we believe',
      h2:      'How we build',
      items: [
        { num: '01', h4: 'One system, not one more tool',       p: 'Every feature has to reduce the number of places a school needs to check, not add one.' },
        { num: '02', h4: 'Presential and remote, equally',      p: "Learning doesn't have one location, so the platform doesn't assume one." },
        { num: '03', h4: 'Built with schools, not just for them', p: 'Every workflow is shaped by how teachers and administrators actually spend their day.' },
      ],
    },
    cta: {
      eyebrow: 'Get started',
      heading: "Let's connect<br />your school.",
      copy:    'See how SchoolOS brings your academic activity into one place.',
      btn1: 'Request a Demo →',
      btn2: 'Explore the Platform →',
    },
  },

  // ── Login page ─────────────────────────────────────────────
  loginPage: {
    metaTitle:       'Sign In — SchoolOS',
    brandSubtitle:   'Internal Platform Access',
    title:           'Sign In',
    intro:           'Access the school administration and management portal.',
    demoPill:        'Demo: admin / 123',
    autoFill:        'Autofill ↙',
    errorMsg:        'Invalid credentials. Use <strong>admin</strong> and password <strong>123</strong>.',
    userLabel:       'Username or Email',
    userPlaceholder: 'admin',
    passLabel:       'Password',
    passPlaceholder: '••••',
    submitBtn:       'Enter System →',
    backHome:        '← Back to main website',
  },

  // ── Internal App ───────────────────────────────────────────
  app: {
    sidebar: {
      brandRole:       'Super Admin',
      systemGroup:     'System',
      complianceGroup: 'Compliance',
      configGroup:     'Configuration',
      dashboard:       'Dashboard',
      schools:         'Schools',
      users:           'Users',
      plans:           'Plans',
      judicialAccess:  'Judicial Access',
      auditLog:        'Audit Log',
      settings:        'Settings',
      webLink:         'Web ↗',
      version:         'v1.0 · Mock Auth',
    },
    topbar: {
      searchPlaceholder: 'Search schools, users…',
      logout:            'Logout',
    },
    dashboard: {
      activeSchools:     'Active Schools',
      activeSchoolsSub:  '+6 this month',
      totalStudents:     'Total Students',
      totalStudentsSub:  'across all schools',
      trialSchools:      'Trial Schools',
      trialSchoolsSub:   'avg. 9 days remaining',
      suspendedSchools:  'Past Due / Suspended',
      suspendedSchoolsSub: 'needs attention',
      recentSchools:     'Recently created schools',
      recentActivity:    'Recent activity',
      viewAll:           'View all →',
    },
    schools: {
      title:        'Schools',
      allStatuses:  'All statuses',
      allPlans:     'All plans',
      newSchool:    '+ New School',
      view:         'View',
    },
    schoolDetail: {
      back:          '← Back to Schools',
      students:      'Students',
      teachers:      'Teachers',
      classes:       'Active Classes',
      auditStatus:   'Audit Status',
      admins:        'School administrators',
      inviteAdmin:   '+ Invite admin',
      judicialAccess:'Judicial Access',
      requestAccess: '+ Request Judicial Access',
      changePlan:    'Change Plan',
      editDetails:   'Edit Details',
      suspend:       'Suspend',
    },
  },
} satisfies Record<string, unknown>;

export type Translations = typeof en;

