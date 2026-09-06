import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export interface ConfirmJwtPayload {
  userId: string;
  email: string;
  schoolId: string | null;
  iat?: number;
  exp?: number;
}

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

function getSecret(): string {
  const s = getEnvVar('JWT_CONFIRM_SECRET');
  if (!s) throw new Error('Falta JWT_CONFIRM_SECRET en .env');
  return s;
}

export function createConfirmToken(payload: Omit<ConfirmJwtPayload, 'iat' | 'exp'>, expiresIn = '24h'): string {
  return jwt.sign(payload, getSecret(), { expiresIn } as any);
}

export function verifyConfirmToken(token: string): ConfirmJwtPayload {
  return jwt.verify(token, getSecret()) as ConfirmJwtPayload;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function getConfirmUrl(token: string): string {
  const site = getEnvVar('SITE_URL') || (import.meta.env.SITE_URL as string) || 'http://localhost:4321';
  return `${site.replace(/\/$/, '')}/confirmar?token=${encodeURIComponent(token)}`;
}
