import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

// Leer .env
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
  const email = 'kumikasato45@gmail.com';
  const name = 'Kumika Sato';
  const role = 'super_admin';
  const password = 'SuperAdmin2026!*';

  console.log(`👑 Creando cuenta de Super Admin para: ${name} (${email})...\n`);

  // 1. Verificar si ya existe en auth.users
  const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
  const existingAuthUser = listData?.users?.find(u => u.email === email);

  let userId;

  if (existingAuthUser) {
    console.log('ℹ️ El usuario ya existía en auth.users. Actualizando contraseña y metadatos...');
    userId = existingAuthUser.id;
    await supabase.auth.admin.updateUserById(userId, {
      password: password,
      email_confirm: true,
      user_metadata: { name, role, school_id: null }
    });
  } else {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name,
        role,
        school_id: null
      }
    });

    if (authError) {
      console.error('❌ Error al crear usuario en Supabase Auth:', authError);
      return;
    }
    userId = authData.user.id;
    console.log('✅ Usuario creado en Supabase Auth con ID:', userId);
  }

  // 2. Asegurar registro en public.users
  const { data: publicUser, error: publicError } = await supabase
    .from('users')
    .upsert({
      id: userId,
      email: email,
      name: name,
      role: role,
      school_id: null,
      status: 'active',
    })
    .select()
    .single();

  if (publicError) {
    console.error('❌ Error al registrar en public.users:', publicError);
    return;
  }

  console.log('✅ ¡Super Admin configurado exitosamente en public.users!');
  console.log('--------------------------------------------------');
  console.log('📌 ID de Usuario:', publicUser.id);
  console.log('📌 Nombre:', publicUser.name);
  console.log('📌 Correo:', publicUser.email);
  console.log('📌 Rol:', publicUser.role);
  console.log('📌 School ID:', publicUser.school_id, '(Correcto: NULL para super_admin)');
  console.log('📌 Contraseña asignada:', password);
  console.log('--------------------------------------------------');

  // 3. Probar Login real con credenciales
  console.log('\n🔐 Probando inicio de sesión con Supabase Auth...');
  const testClient = createClient(url, env.PUBLIC_SUPABASE_PUBLISHABLE_KEY || secret);
  const { data: loginData, error: loginError } = await testClient.auth.signInWithPassword({
    email,
    password
  });

  if (loginError) {
    console.error('❌ Error en prueba de login:', loginError.message);
  } else {
    console.log('🎉 ¡Prueba de inicio de sesión EXITOSA! Token JWT generado correctamente.');
    console.log('👤 Sesión activa para:', loginData.user.email);
  }
}

main();
