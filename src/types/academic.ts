// ============================================================
// SchoolOS — Modelos Académicos y de Gestión Escolar (Fase 2)
// ============================================================

export type CourseStatus = 'active' | 'archived';

export interface ScheduleSlot {
  day: 'Lunes' | 'Martes' | 'Miércoles' | 'Jueves' | 'Viernes';
  time: string;           // "07:00 - 08:30", "08:30 - 10:00", "10:30 - 12:00", "12:00 - 13:30"
  timeKey: 't1' | 't2' | 't3' | 't4';
  dayIndex: number;       // 0=Lunes, 1=Martes, 2=Mié, 3=Jue, 4=Vie
  courseId: string;
  groupCode: string;      // "10-1", "10-2", "11-1"
  subjectName: string;    // "Matemáticas 10-1"
  room: string;           // "Salón 204", "Lab. Ciencias 1"
  studentCount: number;
  averageGrade: number;
  isCurrentLive?: boolean; // Para simular la hora activa actual
}

export interface DepartmentTeacherGroup {
  id: string;             // ID del curso (ej: "crs-bio-10a")
  code: string;           // ej: "10-1", "10-2", "11-1"
  name: string;           // ej: "Biología Celular 10-1"
  level: string;          // "10° Grado A"
  studentCount: number;   // 28 alumnos
  maxCapacity: number;    // 32 cupos
  schedule: string;       // "Lun, Mié 08:30 - 10:00"
  averageGrade: number;   // 8.7
  guidesCount: number;    // 6
  room: string;           // "Salón 204"
}

export interface DepartmentTeacher {
  id: string;
  name: string;
  email: string;
  avatarInitials: string;
  specialty: string;
  totalStudents: number;
  groupsCount: number;
  weeklyHours: number;    // ej: 18 (completo) o 12 (con 6 horas libres)
  hasFreeCapacity: boolean;
  groups: DepartmentTeacherGroup[];
  scheduleSlots: ScheduleSlot[];
}

export interface SubjectDepartment {
  id: string;
  name: string;           // ej: "Matemáticas & Cálculo"
  code: string;           // "MAT", "NAT", "LEN", "SOC", "ING", "ART", "MUS", "EFI"
  icon: string;
  description: string;
  teachersCount: number;
  totalStudents: number;
  totalGroupsCount: number;
  averageGrade: number;
  teachers: DepartmentTeacher[];
}

export interface Course {
  id: string;
  schoolId: string;
  name: string;
  level: string;
  subject: string;
  period: string;
  schedule: string;
  teacherIds: string[];
  teacherNames: string[];
  studentCount: number;
  maxCapacity: number;
  guidesCount: number;
  evaluationsCount: number;
  averageGrade: number;
  status: CourseStatus;
  createdAt: string;
}

export interface TeacherProfile {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  avatarInitials: string;
  roleTitle: string;
  departmentId?: string;
  departmentName?: string;
  specialty?: string;
  weeklyHours?: number;
  hasFreeCapacity?: boolean;
  freeHoursCount?: number;
  subjects: string[];
  assignedCourses: Array<{ id: string; name: string; level: string; studentCount: number; room?: string; averageGrade?: number }>;
  totalStudents: number;
  guidesPublished: number;
  averageGrade?: number;
  notesSubmissionStatus?: 'on_time' | 'pending' | 'delayed';
  isGroupDirector?: boolean;
  groupDirectorCode?: string;
  scheduleSlots?: ScheduleSlot[];
  parentOfficeHours?: string;
  lastClassroomObservation?: { date: string; observer: string; score: number; notes: string };
  syllabusProgress?: string;
  activePermitsCount?: number;
  medicalLeaveNotice?: string;
  status: 'active' | 'invited' | 'suspended';
  lastActive: string;
  joinedAt: string;
}

export interface BehaviorRecord {
  id: string;
  date: string;
  type: 'tipo_1' | 'tipo_2' | 'tipo_3' | 'felicitacion';
  title: string;
  description: string;
  teacherName: string;
  teacherRole: string;
  commitmentSigned: boolean;
  status: 'active' | 'resolved' | 'monitoring';
}

export interface MedicalInfo {
  eps: string;
  bloodType: string;
  allergies: string;
  emergencyPhone: string;
  emergencyContactName: string;
  emergencyContactRelation: string;
  specialConditions?: string;
}

export interface AttendanceIncident {
  date: string;
  reason: string;
  isJustified: boolean;
  subject?: string;
}

export interface StudentCourseGrade {
  id: string;
  name: string;
  teacherName: string;
  grade: number;
  period1Grade?: number;
  room?: string;
  hasRecoveryPlan?: boolean;
  recoveryNotes?: string;
}

export interface StudentProfile {
  id: string;
  schoolId: string;
  name: string;
  email: string;
  avatarInitials: string;
  documentType: string;     // "T.I.", "R.C.", "C.E."
  documentNumber: string;   // "1028394812"
  daneCode?: string;        // "1002900-STD-01"
  gradeLevel: string;       // "10° Grado A"
  groupCode: string;        // "10-1"
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  guardianRelation: string; // "Madre", "Padre", "Tía / Acudiente"
  academicStatus: 'honor' | 'normal' | 'risk';
  enrollmentType: 'regular' | 'conditional' | 'scholarship';
  enrolledCourses: StudentCourseGrade[];
  overallAverage: number;
  attendanceRate: number;
  unexcusedAbsences: number;
  failedCoursesCount: number;
  medicalInfo: MedicalInfo;
  behaviorRecords: BehaviorRecord[];
  attendanceIncidents: AttendanceIncident[];
  pazYSalvoStatus: 'al_dia' | 'pendiente_biblioteca' | 'pendiente_pension';
  status: 'active' | 'inactive';
  registeredAt: string;
}

export interface NewsArticle {
  id: string;
  schoolId: string;
  title: string;
  summary: string;
  content: string;
  category: 'general' | 'academic' | 'event' | 'urgent';
  authorName: string;
  authorRole: string;
  publishedAt: string;
  pinned: boolean;
  viewsCount: number;
}

export interface AcademicStats {
  totalStudents: number;
  maxStudentsPlan: number;
  planUsagePercent: number;
  totalTeachers: number;
  activeCourses: number;
  totalGuidesPublished: number;
  schoolAverageGrade: number;
  averageAttendanceRate: number;
}
