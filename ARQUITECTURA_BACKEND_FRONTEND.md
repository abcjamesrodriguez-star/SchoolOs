# 🏗️ Análisis Arquitectural: Lógica de Backend en el Frontend

> **Fecha:** 2026-09-04  
> **Proyecto:** SchoolOS — `principal_proyect`  
> **Alcance:** Auditoría de seguridad y separación de responsabilidades

---

## El Problema

Este es un proyecto Astro con arquitectura **SSR + cliente**. Astro ejecuta el frontmatter (`---`) en el **servidor** y los `<script>` sin `is:inline` en el **navegador del cliente** (vía Vite bundle).

El problema raíz es que hay **operaciones de base de datos, creación de usuarios y llamadas con privilegios administrativos que se están ejecutando directamente en el navegador**, cuando deben ir por endpoints de API protegidos con `requireAuth`.

---

## Violaciones Encontradas

### 🔴 CRÍTICO — Lógica privilegiada ejecutándose en el navegador

---

#### Violación 1: `new.astro` — Wizard de Nueva Escuela

**Archivo:** `src/pages/es/app/super-admin/schools/new.astro` (L618–L1223)

El `<script>` cliente (bundle Vite del navegador) hace:

| Línea | Código | Problema |
|-------|--------|----------|
| L619 | `import { schoolService } from '../../../../../services/schoolService'` | Importa el servicio de backend en el bundle del browser |
| L1117 | `schoolService.uploadSchoolLogo(file, slug)` | Escribe en Supabase Storage desde el browser |
| L1120 | `schoolService.uploadRectorAvatar(file, slug)` | Ídem |
| L1132 | `schoolService.createSchool({...})` | **Inserta directamente en `public.schools`** sin pasar por API |
| L1192 | `supabase.from('users').upsert({...})` | **Escribe en `public.users`** directamente desde el browser |

> ⚠️ **Riesgo:** `schoolService.createSchool()` usa el cliente Supabase anon key. Si RLS no está perfectamente configurado, **cualquier usuario puede crear escuelas**. El rector se upsert desde el cliente sin validación de permisos en servidor.

---

#### Violación 2: `users.astro` — Panel de Usuarios Super Admin

**Archivo:** `src/pages/es/app/super-admin/users.astro`

| Línea | Código | Problema |
|-------|--------|----------|
| L504–L506 | `import { passwordResetTicketService }` + `window.passwordResetTicketService = ...` | **Expone el servicio en `window`** — accesible por cualquier extensión, script inyectado o XSS |
| L581 | `window.passwordResetTicketService.executeTicket({...})` | Cambia contraseña de rector **desde el browser** |
| L834 | `supabase.from('users').upsert({...})` | Fallback que escribe en `public.users` directo |
| L839 | `supabase.from('users').update({...})` | Ídem |
| L843 | `supabase.from('schools').update({...})` | Actualiza escuelas directamente |
| L1111 | `window.passwordResetTicketService.createSuperAdminTicket({...})` | Crea tickets de reset desde el browser |

> ⚠️ **Riesgo:** El fallback directo a Supabase (L834–L846) bypasea completamente la capa de autenticación de servidor. Exponer `passwordResetTicketService` en `window` permite que cualquier XSS lo llame.

---

#### Violación 3: `settings.astro` — Panel School Admin

**Archivo:** `src/pages/es/app/school-admin/settings.astro`

| Línea | Código | Problema |
|-------|--------|----------|
| L173 | `import { passwordResetTicketService } from '...'` | Importa servicio en el bundle del cliente |
| L214 | `passwordResetTicketService.getMyTickets()` | Consulta DB desde browser |
| L295 | `passwordResetTicketService.createOwnSchoolAdminTicket({...})` | Crea tickets desde el browser |

---

### 🟡 MODERADO — Servicios con patrón dual server/client

Los siguientes servicios usan `typeof window !== 'undefined'` para decidir qué cliente Supabase usar. El patrón es problemático porque en el cliente igualmente hacen escrituras con el cliente anónimo:

| Servicio | Métodos problemáticos |
|----------|----------------------|
| `src/services/schoolService.ts` | `createSchool()`, `updateSchool()` ejecutables desde browser |
| `src/services/userService.ts` | `getUsers()` expone todos los users al anon key |
| `src/services/auditService.ts` | `getRecentLogs()` desde browser |
| `src/services/passwordResetTicketService.ts` | `executeTicket()`, `createSuperAdminTicket()` desde browser |
| `src/services/rectorProvisioningService.ts` | Path de cliente con `signUp` + `upsert` directos |

---

### ✅ Lo que está bien (no tocar)

- `src/pages/api/admin/school.ts` — Usa `requireAuth(['super_admin'])` correctamente
- `src/pages/api/admin/delete-user.ts` — Endpoint protegido
- `src/pages/api/auth/activate-teacher.ts` — Usa `createAdminSupabase` solo en servidor
- `src/lib/apiAuth.ts` — El middleware `requireAuth` está bien implementado
- Los frontmatters `---` de páginas Astro SSR — estos sí corren en servidor correctamente

---

## Plan de Corrección

La estrategia es clara: **todo lo que muta datos o requiere permisos elevados debe ir por endpoints `/api/`**. El cliente solo hace `fetch()` a la API, nunca llama a Supabase directamente para mutaciones.

---

### Paso 1 — Nuevos Endpoints API

#### `[NEW]` `src/pages/api/admin/upload-asset.ts`

Endpoint para subir logos y avatares a Storage.
- Recibe `multipart/form-data`
- Verifica `super_admin` con `requireAuth`
- Sube a Supabase Storage con el cliente admin
- Devuelve la URL pública

```typescript
// POST /api/admin/upload-asset
// Body: FormData { file, type: 'logo'|'avatar', slug }
// Response: { ok: true, url: string }
```

#### `[MODIFY]` `src/pages/api/admin/school.ts`

Ya maneja `create_school`. Extender para que el action `create_school` también haga el upsert del rector en `public.users` (actualmente lo hace el cliente como fallback).

#### `[NEW]` `src/pages/api/admin/password-tickets.ts`

Centraliza gestión de tickets de contraseña para Super Admin:

```typescript
// GET  /api/admin/password-tickets               → getTicketQueue()
// POST /api/admin/password-tickets {action:'create_ticket', ...}  → createSuperAdminTicket()
// POST /api/admin/password-tickets {action:'execute_ticket', ...} → executeTicket() via Edge Function
```

#### `[NEW]` `src/pages/api/school-admin/password-tickets.ts`

Tickets propios para rectores:

```typescript
// GET  /api/school-admin/password-tickets → getMyTickets()
// POST /api/school-admin/password-tickets → createOwnSchoolAdminTicket()
// Ambos con requireAuth(['school_admin'])
```

---

### Paso 2 — Limpiar `new.astro` (Wizard Escuela)

**ANTES** (en `<script>` cliente):
```js
import { schoolService } from '../../../../../services/schoolService'; // ❌
logoUrl = await schoolService.uploadSchoolLogo(file, slug);            // ❌
const newSchool = await schoolService.createSchool({...});             // ❌
await supabase.from('users').upsert({...});                            // ❌
```

**DESPUÉS** (todo via fetch):
```js
// 1. Subir logo
const formData = new FormData();
formData.append('file', logoFile);
formData.append('slug', slug);
const { url: logoUrl } = await fetchAuth('/api/admin/upload-asset', {
  method: 'POST', body: formData
}).then(r => r.json());

// 2. Crear escuela + rector (un solo endpoint)
const { school } = await fetchAuth('/api/admin/school', {
  method: 'POST',
  body: JSON.stringify({ action: 'create_school', school: { ...datos, logoUrl, rectorAvatarUrl } })
}).then(r => r.json());
```

> ✅ Sin imports de services. Sin supabase directo. Solo `fetch()` a los endpoints `/api/`.

---

### Paso 3 — Limpiar `users.astro`

```diff
- import { passwordResetTicketService } from '../../../../services/passwordResetTicketService';
- window.passwordResetTicketService = passwordResetTicketService;

// executeTicket:
- await window.passwordResetTicketService.executeTicket({ ticketId, newPassword });
+ await fetchAuth('/api/admin/password-tickets', {
+   method: 'POST',
+   body: JSON.stringify({ action: 'execute_ticket', ticketId, newPassword })
+ });

// createSuperAdminTicket:
- await window.passwordResetTicketService.createSuperAdminTicket({...});
+ await fetchAuth('/api/admin/password-tickets', {
+   method: 'POST',
+   body: JSON.stringify({ action: 'create_ticket', ...datos })
+ });

// Eliminar fallback directo L834–L846:
- await supabase.from('users').upsert({...});
- await supabase.from('users').update({...});
- await supabase.from('schools').update({...});
+ // Si la API falla, mostrar error al usuario — no hacer fallback directo
```

---

### Paso 4 — Limpiar `settings.astro`

```diff
- import { passwordResetTicketService } from '../../../../services/passwordResetTicketService';

// getMyTickets:
- const tickets = await passwordResetTicketService.getMyTickets();
+ const tickets = await fetchAuth('/api/school-admin/password-tickets').then(r => r.json());

// createOwnSchoolAdminTicket:
- await passwordResetTicketService.createOwnSchoolAdminTicket({...});
+ await fetchAuth('/api/school-admin/password-tickets', {
+   method: 'POST',
+   body: JSON.stringify({ reason, resetMethod })
+ });
```

---

### Paso 5 — Guards en los Servicios

```typescript
// schoolService.ts — createSchool, updateSchool
if (typeof window !== 'undefined') {
  throw new Error('createSchool/updateSchool solo pueden llamarse desde el servidor. Usa /api/admin/school');
}

// passwordResetTicketService.ts — executeTicket, createSuperAdminTicket
if (typeof window !== 'undefined') {
  throw new Error('Este método es solo de servidor. Usa /api/admin/password-tickets');
}
```

---

## Resumen de Archivos Afectados

| # | Archivo | Cambio | Prioridad |
|---|---------|--------|-----------|
| 1 | `src/pages/api/admin/upload-asset.ts` | **CREAR** | 🔴 Alta |
| 2 | `src/pages/api/admin/password-tickets.ts` | **CREAR** | 🔴 Alta |
| 3 | `src/pages/api/school-admin/password-tickets.ts` | **CREAR** | 🔴 Alta |
| 4 | `src/pages/api/admin/school.ts` | Extender `create_school` con upsert rector | 🟡 Media |
| 5 | `src/pages/es/app/super-admin/schools/new.astro` | Reemplazar imports/llamadas directas por `fetch()` | 🔴 Alta |
| 6 | `src/pages/es/app/super-admin/users.astro` | Eliminar `window.passwordResetTicketService` y fallbacks | 🔴 Alta |
| 7 | `src/pages/es/app/school-admin/settings.astro` | Reemplazar imports por `fetch()` | 🟡 Media |
| 8 | `src/services/schoolService.ts` | Guards server-only en mutaciones | 🟢 Baja |
| 9 | `src/services/passwordResetTicketService.ts` | Guards server-only en métodos privilegiados | 🟢 Baja |

---

## Verificación Post-Corrección

### Checks automáticos (PowerShell)

```powershell
# Verificar que no queden imports de services en scripts cliente
Select-String -Recurse -Include "*.astro" -Pattern "import.*from.*services/" src/pages/

# Verificar que no queden supabase.from() directos en páginas (fuera del frontmatter ---)
Select-String -Recurse -Include "*.astro" -Pattern "supabase\.from\(" src/pages/

# Verificar que window.*Service no exista expuesto
Select-String -Recurse -Include "*.astro","*.ts" -Pattern "window\.\w*[Ss]ervice" src/pages/
```

### Checks manuales

1. Crear escuela desde el wizard → mutaciones visibles en **Network tab → `/api/admin/...`**
2. Crear ticket de password reset → responde 200 desde la API, no desde Supabase directo
3. Ejecutar ticket → funciona vía Edge Function server-side
4. DevTools: no aparece `passwordResetTicketService` en `window` de ninguna página
5. Abrir la consola del browser → no se puede llamar `window.passwordResetTicketService.executeTicket`

---

## Open Questions

1. **¿Existe `/api/admin/rector.ts`?** — El `users.astro` hace `fetch('/api/admin/rector', ...)` en L802 pero no se encontró el archivo en la búsqueda. ¿Existe en otra ruta o hay que crearlo?

2. **¿Los uploads a Storage van al servidor?** — Los uploads de logos/avatares pueden hacerse directo al browser si el bucket tiene políticas públicas correctas. La alternativa es routing por `/api/admin/upload-asset` (más seguro pero más lento). ¿Cuál prefieres?

3. **¿También aplica el mismo análisis a las páginas `/en/`?** — Hay duplicados en inglés (`/en/app/super-admin/...`). ¿Se aplican los mismos cambios en paralelo?
