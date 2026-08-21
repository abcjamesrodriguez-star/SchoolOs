import { createAdminSupabase } from '../lib/supabase-admin';
import { supabase as browserSupabase } from '../lib/supabase';

function getSupabaseClient() {
  if (typeof window !== 'undefined') {
    return browserSupabase;
  }
  try {
    return createAdminSupabase();
  } catch (_) {
    return browserSupabase;
  }
}

export interface PasswordResetTicket {
  id: string;
  status: 'pending' | 'approved' | 'completed' | 'rejected' | 'cancelled' | 'expired' | 'failed';
  resetMethod: 'temporary_password' | 'recovery_link' | 'manual_support';
  reason: string;
  targetUserId: string;
  targetEmail: string;
  targetRole: string;
  targetSchoolId?: string;
  targetSchoolName?: string;
  requestedByEmail?: string;
  approvedByEmail?: string;
  completedByEmail?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}

function mapTicket(row: any): PasswordResetTicket {
  return {
    id: row.id,
    status: row.status,
    resetMethod: row.reset_method,
    reason: row.reason,
    targetUserId: row.target_user_id,
    targetEmail: row.target_email,
    targetRole: row.target_role,
    targetSchoolId: row.target_school_id || undefined,
    targetSchoolName: row.target_school_name || undefined,
    requestedByEmail: row.requested_by_email || undefined,
    approvedByEmail: row.approved_by_email || undefined,
    completedByEmail: row.completed_by_email || undefined,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const passwordResetTicketService = {
  async getTicketQueue(): Promise<PasswordResetTicket[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('password_reset_ticket_queue')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error al obtener tickets de contraseña:', error);
      return [];
    }

    return (data || []).map(mapTicket);
  },

  async getMyTickets(): Promise<PasswordResetTicket[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('password_reset_tickets')
      .select(`
        id,
        status,
        reset_method,
        reason,
        target_user_id,
        target_email,
        target_role,
        target_school_id,
        requested_by_email,
        approved_by_email,
        completed_by_email,
        expires_at,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error al obtener mis tickets de contraseña:', error);
      return [];
    }

    return (data || []).map(mapTicket);
  },

  async createSuperAdminTicket(input: {
    targetUserId: string;
    reason: string;
    resetMethod?: 'temporary_password' | 'recovery_link' | 'manual_support';
    requiresSecondApproval?: boolean;
  }): Promise<string> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('create_password_reset_ticket', {
      p_target_user_id: input.targetUserId,
      p_reason: input.reason,
      p_reset_method: input.resetMethod || 'temporary_password',
      p_requires_second_approval: input.requiresSecondApproval || false,
    });

    if (error) throw error;
    return data as string;
  },

  async createOwnSchoolAdminTicket(input: {
    reason: string;
    resetMethod?: 'temporary_password' | 'recovery_link' | 'manual_support';
  }): Promise<string> {
    const supabase = getSupabaseClient();
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      throw authError || new Error('No hay sesión activa.');
    }

    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, school_id')
      .eq('id', authData.user.id)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || profile.role !== 'school_admin') {
      throw new Error('Solo un rector puede crear esta solicitud desde su tenant.');
    }

    const { data, error } = await supabase
      .from('password_reset_tickets')
      .insert({
        target_user_id: profile.id,
        target_school_id: profile.school_id,
        target_email: profile.email,
        target_role: 'school_admin',
        requested_by: profile.id,
        requested_by_email: profile.email,
        request_origin: 'school_admin_request',
        reason: input.reason,
        reset_method: input.resetMethod || 'manual_support',
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) throw error;
    return data.id as string;
  },

  async executeTicket(input: {
    ticketId: string;
    newPassword: string;
  }): Promise<{ ok: boolean; ticketId: string; targetEmail: string; status: string }> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.functions.invoke('reset-rector-password', {
      body: {
        ticketId: input.ticketId,
        newPassword: input.newPassword,
      },
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },
};
