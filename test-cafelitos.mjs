import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Leer .env manualmente para el script
const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...vals] = line.split('=');
  if (key && vals.length) {
    env[key.trim()] = vals.join('=').trim();
  }
});

const url = env.SUPABASE_URL || env.PUBLIC_SUPABASE_URL;
const secret = env.SUPABASE_SECRET_KEY;

if (!url || !secret) {
  console.error('❌ Falta SUPABASE_URL o SUPABASE_SECRET_KEY en .env');
  process.exit(1);
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  console.log('⚾ Registrando la escuela "Cafelitos Baseball Academy" en Supabase...\n');

  const cafelitosData = {
    name: 'Cafelitos Baseball & Academic Academy',
    slug: 'cafelitos',
    status: 'active',
    audit_status: 'none',
    plan_name: 'Professional',
    domain: 'cafelitos.schoolos.com',
    location: 'Barranquilla, Colombia',
    country: 'Colombia',
    timezone: 'America/Bogota (UTC-5)',
    student_count: 120,
    teacher_count: 14,
    active_classes_count: 8,
    contact_email: 'contacto@cafelitosacademy.edu.co',
  };

  // 1. Insertar o actualizar si ya existe por slug
  const { data: inserted, error: insertError } = await supabase
    .from('schools')
    .upsert(cafelitosData, { onConflict: 'slug' })
    .select()
    .single();

  if (insertError) {
    console.error('❌ Error al registrar Cafelitos:', insertError);
    return;
  }

  console.log('✅ ¡Escuela "Cafelitos" guardada con éxito en Supabase!');
  console.log('📌 ID generado:', inserted.id);
  console.log('📌 Nombre:', inserted.name);
  console.log('📌 Subdominio / Slug:', inserted.slug);
  console.log('📌 Plan:', inserted.plan_name);
  console.log('📌 Ubicación:', inserted.location);
  console.log('📌 Estudiantes registrados:', inserted.student_count);
  console.log('📌 Profesores:', inserted.teacher_count);

  console.log('\n🔍 Probando consulta (SELECT) desde Supabase...');
  const { data: allSchools, error: queryError } = await supabase
    .from('schools')
    .select('*');

  if (queryError) {
    console.error('❌ Error en SELECT:', queryError);
    return;
  }

  console.log(`✅ Total de escuelas en la base de datos: ${allSchools.length}`);
  console.table(allSchools.map(s => ({
    ID: s.id,
    Nombre: s.name,
    Slug: s.slug,
    Plan: s.plan_name,
    Estado: s.status,
    Email: s.contact_email
  })));
}

main();
