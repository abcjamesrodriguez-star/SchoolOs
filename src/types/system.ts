// ============================================================
// SchoolOS — Modelos de Sistema, Usuarios y Acceso Judicial
// ============================================================

export type Role = 'student' | 'teacher' | 'school_admin' | 'super_admin';

export type UserStatus = 'active' | 'invited' | 'suspended';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  schoolId: string | null;
  status: UserStatus;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
  passwordResetRequired?: boolean;
}

export type DataScope =
  | 'student_records'
  | 'academic_activity'
  | 'communications'
  | 'user_accounts';

export type GrantStatus =
  | 'pending_verification'
  | 'active'
  | 'expired'
  | 'revoked';

export interface JudicialAccessGrant {
  id: string;
  schoolId: string;
  schoolName: string;
  caseReference: string;
  issuingAuthority: string;
  orderDocumentRef: string;
  scope: string; // "student_records, communications" etc.
  requestedBy: string;
  verifiedBy: string | null;
  status: GrantStatus;
  grantedAt: string | null;
  expiresAt: string;
  revokedAt?: string;
  revokedReason?: string;
}

export interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetName: string;
  targetType: 'school' | 'user' | 'plan' | 'judicial_access_grant';
  timestamp: string;
  metadata?: Record<string, unknown>;
}
