import { createAdminSupabase } from '../lib/supabase-admin';

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

/**
 * Servicio de servidor para gestión de tickets de contraseña.
 * Se ejecuta exclusivamente en Node.js (Astro SSR y API Routes).
 */
export const passwordResetTicketService = {
  async getTicketQueue(): Promise<PasswordResetTicket[]> {
    const supabase = createAdminSupabase();
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

  async getMyTickets(userId?: string): Promise<PasswordResetTicket[]> {
    const supabase = createAdminSupabase();
    let query = supabase
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
      .limit(20);

    if (userId) {
      query = query.eq('target_user_id', userId);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error al obtener tickets de contraseña:', error);
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
    try {
      const { data, error } = await supabase.rpc('create_password_reset_ticket', {
        p_target_user_id: input.targetUserId,
        p_reason: input.reason,
        p_reset_method: input.resetMethod || 'temporary_password',
        p_requires_second_approval: input.requiresSecondApproval || false,
      });

      if (!error && data) return data as string;
    } catch (rpcErr) {
      console.warn('[passwordResetTicketService] RPC create_password_reset_ticket failed, using native insert fallback:', rpcErr);
    }

    // Fallback nativo directo a la tabla password_reset_tickets
    const { data: profile } = await supabase
      .from('users')
      .select('id, email, role, school_id')
      .eq('id', input.targetUserId)
      .maybeSingle();

    const { data: inserted, error: insertError } = await supabase
      .from('password_reset_tickets')
      .insert({
        target_user_id: input.targetUserId,
        target_email: profile?.email || '',
        target_role: profile?.role || 'user',
        target_school_id: profile?.school_id || null,
        reason: input.reason,
        reset_method: input.resetMethod || 'temporary_password',
        status: 'pending',
      })
      .select('id')
      .single();

    if (insertError) throw insertError;
    return inserted.id as string;
  },

  async createOwnSchoolAdminTicket(input: {
    userId: string;
    reason: string;
    resetMethod?: 'temporary_password' | 'recovery_link' | 'manual_support';
  }): Promise<string> {
    const supabase = createAdminSupabase();
    const { data: profile, error: profileError } = await supabase
      .from('users')
      .select('id, email, role, school_id')
      .eq('id', input.userId)
      .maybeSingle();

    if (profileError) throw profileError;
    if (!profile || profile.role !== 'school_admin') {
      throw new Error('Solo un directivo/rector puede crear esta solicitud desde su institución.');
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

  /**
   * Ejecución nativa y centralizada en Node.js de restablecimiento de contraseña.
   * Elimina la dependencia de la Edge Function externa 'reset-rector-password'.
   */
  async executeTicket(input: {
    ticketId: string;
    newPassword: string;
    actorUserId?: string;
    actorEmail?: string;
  }): Promise<{ ok: boolean; ticketId: string; targetEmail: string; status: string }> {
    const { ticketId, newPassword, actorUserId, actorEmail } = input;
    const admin = createAdminSupabase();

    // 1. Obtener ticket
    const { data: ticket, error: ticketError } = await admin
      .from('password_reset_tickets')
      .select('id, target_user_id, target_email, target_role, status, reset_method')
      .eq('id', ticketId)
      .maybeSingle();

    if (ticketError) throw ticketError;
    if (!ticket) {
      throw new Error('Ticket de restablecimiento no encontrado.');
    }

    if (!['pending', 'approved', 'failed'].includes(ticket.status)) {
      throw new Error(`El ticket se encuentra en estado '${ticket.status}' y no puede ser ejecutado.`);
    }

    // 2. Actualizar contraseña directamente en Supabase Auth
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      ticket.target_user_id,
      { password: newPassword }
    );

    if (updateAuthError) {
      await admin
        .from('password_reset_tickets')
        .update({
          status: 'failed',
          last_error: updateAuthError.message,
        })
        .eq('id', ticket.id);
      throw updateAuthError;
    }

    const now = new Date().toISOString();

    // 3. Marcar ticket como completado
    const { error: ticketUpdateError } = await admin
      .from('password_reset_tickets')
      .update({
        status: 'completed',
        completed_by: actorUserId || null,
        completed_by_email: actorEmail || null,
        completed_at: now,
        last_error: null,
      })
      .eq('id', ticket.id);

    if (ticketUpdateError) throw ticketUpdateError;

    // 4. Actualizar tabla public.users
    await admin
      .from('users')
      .update({
        password_reset_required: true,
        password_last_changed_at: now,
        last_password_reset_ticket_id: ticket.id,
      })
      .eq('id', ticket.target_user_id);

    // 5. Registrar log de auditoría
    if (actorEmail) {
      try {
        await admin.from('audit_logs').insert({
          actor_id: actorUserId || null,
          actor_email: actorEmail,
          action: 'auth.password_reset_completed',
          target_name: ticket.target_email,
          target_type: 'user',
          details: {
            ticketId: ticket.id,
            targetUserId: ticket.target_user_id,
            resetMethod: ticket.reset_method,
            executedNatively: true,
          },
        });
      } catch (auditErr) {
        console.warn('[passwordResetTicketService] Advertencia registrando auditoría:', auditErr);
      }
    }

    return {
      ok: true,
      ticketId: ticket.id,
      targetEmail: ticket.target_email,
      status: 'completed',
    };
  },
};
