import { renderConfirmRectorEmail } from '../emails/render';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

function getEnvVar(key: string): string | undefined {
  const fromMeta = typeof import.meta !== 'undefined' && import.meta.env ? (import.meta.env as any)[key] : undefined;
  if (fromMeta) return fromMeta;
  if (typeof process !== 'undefined' && process.env && process.env[key]) return process.env[key];

  let currentDir = '';
  try {
    if (typeof import.meta !== 'undefined' && import.meta.url) {
      currentDir = path.dirname(fileURLToPath(import.meta.url));
    }
  } catch {}

  const possiblePaths = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'principal_proyect', '.env'),
    ...(currentDir ? [
      path.resolve(currentDir, '../../.env'),
      path.resolve(currentDir, '../../../.env'),
      path.resolve(currentDir, '.env'),
    ] : [])
  ];

  for (const envPath of possiblePaths) {
    try {
      if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('#') || !trimmed.includes('=')) continue;
          const [k, ...v] = trimmed.split('=');
          if (k.trim() === key) {
            return v.join('=').trim().replace(/^["']|["']$/g, '');
          }
        }
      }
    } catch {}
  }
  return undefined;
}

export async function sendEmailGeneric(opts: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const smtpHost = getEnvVar('SMTP_HOST') || 'smtp.gmail.com';
  const smtpUser = getEnvVar('SMTP_USER');
  const smtpPass = getEnvVar('SMTP_PASS');
  const smtpPort = parseInt(getEnvVar('SMTP_PORT') || '465', 10);
  const smtpSecure = getEnvVar('SMTP_SECURE') === 'true' || smtpPort === 465;

  if (smtpHost && smtpUser && smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      const fromName = getEnvVar('SMTP_FROM_NAME') || 'SchoolOS';
      const fromEmail = getEnvVar('SMTP_FROM_EMAIL') || smtpUser;

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: opts.to,
        subject: opts.subject,
        html: opts.html,
      });

      console.log('✓ [CORREO DESPACHADO]:', info.messageId, '->', opts.to);
      return { ok: true };
    } catch (smtpErr: any) {
      console.error('✗ Error al despachar correo vía SMTP:', smtpErr);
      return { ok: false, error: smtpErr?.message || String(smtpErr) };
    }
  }

  return { ok: false, error: 'Configuración SMTP incompleta' };
}

export async function sendTeacherInvitationEmail(opts: {
  to: string;
  teacherName: string;
  teacherCode?: string;
  schoolName: string;
  specialty?: string;
  activationUrl?: string;
  activationToken?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = getEnvVar('SITE_URL') || 'http://localhost:4321';
  const finalActivationUrl = opts.activationUrl || (opts.activationToken ? `${baseUrl}/es/auth/activate-teacher?token=${encodeURIComponent(opts.activationToken)}` : `${baseUrl}/es/auth/activate-teacher`);
  const finalTeacherCode = opts.teacherCode || 'DOC-2026-ACT';

  const subject = `Invitación Oficial de Vinculación Docente — ${opts.schoolName} · SchoolOS`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F5F0; padding: 30px; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 2px solid #12110E; box-shadow: 6px 6px 0 #12110E; padding: 32px;">
          <div style="font-size: 11px; font-family: monospace; font-weight: 800; color: #8B3A22; text-transform: uppercase; margin-bottom: 6px;">
            VINCULACIÓN DOCENTE · ${opts.schoolName.toUpperCase()}
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #12110E; margin: 0 0 16px;">
            Bienvenido a la Planta Docente, ${opts.teacherName}
          </h1>
          <p style="font-size: 14px; color: #4A463E; line-height: 1.5; margin-bottom: 20px;">
            Has sido vinculado oficialmente como docente en <strong>${opts.schoolName}</strong>${opts.specialty ? ` en el área de <strong>${opts.specialty}</strong>` : ''}.
          </p>
          <div style="background: #F7F5F0; border: 1.5px solid #12110E; padding: 16px; margin-bottom: 24px;">
            <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: #6E685C; text-transform: uppercase; margin-bottom: 4px;">
              Tu Código Oficial de Docente
            </div>
            <div style="font-size: 20px; font-family: monospace; font-weight: 900; color: #12110E; letter-spacing: 1px;">
              ${finalTeacherCode}
            </div>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${finalActivationUrl}" style="display: inline-block; background: #12110E; color: #FFFFFF; font-family: monospace; font-size: 13px; font-weight: 800; padding: 14px 28px; text-decoration: none; border: 2px solid #12110E; box-shadow: 3px 3px 0 #8B3A22;">
              ACTIVAR MI CUENTA DOCENTE →
            </a>
          </div>
          <p style="font-size: 11px; color: #8A8477; line-height: 1.4; border-top: 1px dashed #D0CBC0; padding-top: 14px;">
            Este enlace de activación tiene una vigencia de 48 horas. Si no solicitaste este acceso, por favor contacta a la rectoría de la institución.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmailGeneric({ to: opts.to, subject, html });
}

export async function sendStudentInvitationEmail(opts: {
  to: string;
  studentName: string;
  studentCode: string;
  schoolName: string;
  gradeLevel?: string;
  guardianName?: string;
  activationUrl?: string;
  activationToken?: string;
}): Promise<{ ok: boolean; error?: string }> {
  const baseUrl = getEnvVar('SITE_URL') || 'http://localhost:4321';
  const finalActivationUrl = opts.activationUrl || (opts.activationToken ? `${baseUrl}/es/auth/activate-student?token=${encodeURIComponent(opts.activationToken)}` : `${baseUrl}/es/auth/activate-student`);
  const finalStudentCode = opts.studentCode || 'EST-2026-ACT';

  const subject = `Formalización de Matrícula Oficial — ${opts.studentName} · ${opts.schoolName}`;
  const html = `
    <!DOCTYPE html>
    <html>
      <head><meta charset="utf-8"/></head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #F7F5F0; padding: 30px; margin: 0;">
        <div style="max-width: 560px; margin: 0 auto; background: #FFFFFF; border: 2px solid #12110E; box-shadow: 6px 6px 0 #12110E; padding: 32px;">
          <div style="font-size: 11px; font-family: monospace; font-weight: 800; color: #8B3A22; text-transform: uppercase; margin-bottom: 6px;">
            MATRÍCULA ACADÉMICA · ${opts.schoolName.toUpperCase()}
          </div>
          <h1 style="font-size: 22px; font-weight: 800; color: #12110E; margin: 0 0 16px;">
            Formalización de Matrícula: ${opts.studentName}
          </h1>
          <p style="font-size: 14px; color: #4A463E; line-height: 1.5; margin-bottom: 20px;">
            ${opts.guardianName ? `Apreciado(a) <strong>${opts.guardianName}</strong>: ` : ''}Se ha registrado la matrícula oficial de <strong>${opts.studentName}</strong> en <strong>${opts.schoolName}</strong>${opts.gradeLevel ? ` en el nivel <strong>${opts.gradeLevel}</strong>` : ''}.
          </p>
          <div style="background: #F7F5F0; border: 1.5px solid #12110E; padding: 16px; margin-bottom: 24px;">
            <div style="font-size: 11px; font-family: monospace; font-weight: 700; color: #6E685C; text-transform: uppercase; margin-bottom: 4px;">
              Código Oficial de Matrícula
            </div>
            <div style="font-size: 20px; font-family: monospace; font-weight: 900; color: #12110E; letter-spacing: 1px;">
              ${finalStudentCode}
            </div>
          </div>
          <div style="text-align: center; margin-bottom: 24px;">
            <a href="${finalActivationUrl}" style="display: inline-block; background: #12110E; color: #FFFFFF; font-family: monospace; font-size: 13px; font-weight: 800; padding: 14px 28px; text-decoration: none; border: 2px solid #12110E; box-shadow: 3px 3px 0 #8B3A22;">
              ACTIVAR CUENTA ESTUDIANTIL →
            </a>
          </div>
          <p style="font-size: 11px; color: #8A8477; line-height: 1.4; border-top: 1px dashed #D0CBC0; padding-top: 14px;">
            Este enlace de formalización y activación tiene una vigencia de 48 horas. Con él podrás corroborar los datos de matrícula y asignar la contraseña de acceso al portal académico.
          </p>
        </div>
      </body>
    </html>
  `;

  return sendEmailGeneric({ to: opts.to, subject, html });
}

export async function sendConfirmRectorEmail(opts: {
  to: string;
  rectorName: string;
  schoolName: string;
  schoolSlogan?: string;
  schoolId: string;
  confirmUrl: string;
}): Promise<{ ok: boolean; error?: string }> {
  const html = renderConfirmRectorEmail({
    school_name: opts.schoolName,
    school_slogan: opts.schoolSlogan,
    school_id_short: opts.schoolId.slice(0, 4),
    rector_name: opts.rectorName,
    email: opts.to,
    confirm_url: opts.confirmUrl,
  });

  const subject = `Confirma tu correo — ${opts.schoolName} · SchoolOS`;
  return sendEmailGeneric({ to: opts.to, subject, html });
}
