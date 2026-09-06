import confirmHtml from './confirm-rector.html?raw';

export interface ConfirmEmailData {
  school_name: string;
  school_slogan?: string;
  school_id_short?: string;
  rector_name: string;
  email: string;
  confirm_url: string;
  date?: string;
}

export function renderConfirmRectorEmail(data: ConfirmEmailData): string {
  const date = data.date || new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  const short = data.school_id_short || data.school_name.slice(0,4).toUpperCase();
  return confirmHtml
    .replaceAll('{{school_name}}', escapeHtml(data.school_name))
    .replaceAll('{{school_slogan}}', escapeHtml(data.school_slogan || 'Plataforma Educativa'))
    .replaceAll('{{school_id_short}}', escapeHtml(short))
    .replaceAll('{{rector_name}}', escapeHtml(data.rector_name))
    .replaceAll('{{email}}', escapeHtml(data.email))
    .replaceAll('{{confirm_url}}', escapeHtml(data.confirm_url))
    .replaceAll('{{date}}', escapeHtml(date));
}

function escapeHtml(s: string): string {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
