import urllib.request
import urllib.error
import json
import time
import getpass
import os

print('\n' + '='*80)
print('🚀 INICIANDO PRUEBA END-TO-END: CASCADA COMPLETA (MODO DETALLADO)')
print('='*80 + '\n')

supabase_url = None
supabase_key = None
supabase_secret = None
try:
    with open('.env', 'r', encoding='utf-8') as f:
        for line in f:
            if line.startswith('SUPABASE_URL=') or line.startswith('PUBLIC_SUPABASE_URL='):
                supabase_url = line.split('=', 1)[1].strip()
            elif line.startswith('PUBLIC_SUPABASE_PUBLISHABLE_KEY=') or line.startswith('SUPABASE_PUBLISHABLE_KEY='):
                supabase_key = line.split('=', 1)[1].strip()
            elif line.startswith('SUPABASE_SECRET_KEY='):
                supabase_secret = line.split('=', 1)[1].strip()
except Exception as e:
    print(f'❌ Error leyendo .env: {e}')
    exit(1)

print(f'✅ Conectando a Supabase: {supabase_url}...')

print('\n🔑 Por favor ingresa las credenciales del Super Admin (ej. kumikasato):')
super_email = input('Correo: ').strip()
super_pass = getpass.getpass('Contraseña: ').strip()

def fetch_json(url, method='GET', body=None, headers=None):
    req_headers = {'Content-Type': 'application/json'}
    if headers: req_headers.update(headers)
    data = json.dumps(body).encode('utf-8') if body else None
    req = urllib.request.Request(url, data=data, headers=req_headers, method=method)
    try:
        res = urllib.request.urlopen(req, timeout=10)
        return res.status, json.loads(res.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read().decode('utf-8'))
        except: return e.code, {'error': e.read().decode('utf-8')}
    except Exception as e:
        return 500, {'error': str(e)}

def print_step(title, url, method, payload, status, response):
    print(f"\n{'-'*80}")
    print(f"👉 PASO: {title}")
    print(f"📡 Request:  {method} {url}")
    if payload:
        print(f"📦 Payload:  {json.dumps(payload, indent=2)}")
    print(f"📥 Response: HTTP {status}")
    print(f"📄 Data:     {json.dumps(response, indent=2)}")
    print(f"{'-'*80}")

# 1. Login Super Admin
status, data = fetch_json(f"{supabase_url}/auth/v1/token?grant_type=password", 'POST', 
                          {"email": super_email, "password": super_pass}, 
                          {"apikey": supabase_key})

if status not in (200, 201) or 'access_token' not in data:
    print(f'\n❌ Fallo el Login: HTTP {status} - {data}')
    exit(1)

super_token = data['access_token']
print('\n✅ [1/7] Sesion iniciada correctamente como Super Admin.')

BASE_API = 'http://localhost:4321/api'
unique_id = str(int(time.time()))[-6:] # Un sufijo unico de 6 digitos para evitar colisiones

# 2. Crear Institucion
school_slug = f"qa-school-{unique_id}"
school_payload = {
    "action": "create_school",
    "school": {
        "name": f"Colegio QA {unique_id}",
        "slug": school_slug,
        "contactEmail": f"admin_{unique_id}@qa-school.com"
    }
}
status, data = fetch_json(f"{BASE_API}/admin/school", 'POST', school_payload, {"Authorization": f"Bearer {super_token}"})
print_step("Crear Institucion", f"{BASE_API}/admin/school", "POST", school_payload, status, data)

if status not in (200, 201) or not data.get('school'):
    exit(1)

school_id = data['school']['id']

# 3. Aprovisionar Rector
rector_email = f"rector_{unique_id}@qa-school.com"
rector_payload = {
    "action": "provision",
    "schoolId": school_id,
    "name": f"Rector Test {unique_id}",
    "email": rector_email,
    "phone": "3001234567"
}
status, data = fetch_json(f"{BASE_API}/admin/rector", 'POST', rector_payload, {"Authorization": f"Bearer {super_token}"})
print_step("Aprovisionar Rector", f"{BASE_API}/admin/rector", "POST", rector_payload, status, data)

if status not in (200, 201) or not data.get('user'):
    exit(1)

rector_id = data['user']['id']
print(f'✅ Rector aprovisionado con exito! Correo: {rector_email}')

# 5. Login como Rector
time.sleep(1)
rector_pass = 'Rector2026!*'
login_rector_payload = {"email": rector_email, "password": rector_pass}
status, data = fetch_json(f"{supabase_url}/auth/v1/token?grant_type=password", 'POST', 
                          login_rector_payload, {"apikey": supabase_key})
print_step("Login como el nuevo Rector", f"{supabase_url}/auth/v1/token", "POST", {"email": rector_email, "password": "***"}, status, {"access_token": "obtenido..." if 'access_token' in data else "Fallo", "role": data.get('user', {}).get('role', '')})

if status not in (200, 201) or 'access_token' not in data:
    exit(1)

rector_token = data['access_token']

# 6. Inicializar Grados
grades_payload = {
    "action": "init_grades",
    "defaultGrades": [
        {"school_id": school_id, "grade_level": g, "sections_count": 1, "capacity_per_room": 30, "is_offered": True}
        for g in ['6°', '7°', '8°', '9°', '10°', '11°']
    ]
}
status, data = fetch_json(f"{BASE_API}/school-admin/courses", 'POST', grades_payload, {"Authorization": f"Bearer {rector_token}"})
print_step("Inicializar Grados del Colegio", f"{BASE_API}/school-admin/courses", "POST", grades_payload, status, data)

if status not in (200, 201) or not data.get('ok'):
    exit(1)

# 7. Crear Estudiante
student_payload = {
    "email": f"alumno_{unique_id}@qa-school.com",
    "password": "AlumnoQA2026*",
    "name": f"Alumno QA {unique_id}",
    "school_id": school_id,
    "role": "student"
}
status, data = fetch_json(f"{BASE_API}/admin/create-student", 'POST', student_payload, {"Authorization": f"Bearer {rector_token}"})
print_step("Matricular Estudiante", f"{BASE_API}/admin/create-student", "POST", student_payload, status, data)

if status not in (200, 201) or not data.get('success'):
    exit(1)

print('\n' + '='*80)
print('🚀 PRUEBA FINALIZADA - EXITO TOTAL 🎉')
print('='*80 + '\n')
