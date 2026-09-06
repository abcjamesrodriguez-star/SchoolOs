import urllib.request
import urllib.error
import json
import time
import socket

BASE_URL = 'http://localhost:4321'

# Esperar a que el servidor este vivo
for i in range(15):
    try:
        urllib.request.urlopen(BASE_URL)
        break
    except:
        time.sleep(1)

endpoints = [
    { 'path': '/api/admin/create-student', 'method': 'POST' },
    { 'path': '/api/admin/delete-user', 'method': 'POST' },
    { 'path': '/api/admin/password-tickets', 'method': 'POST' },
    { 'path': '/api/admin/password-tickets', 'method': 'GET' },
    { 'path': '/api/admin/rector', 'method': 'POST' },
    { 'path': '/api/admin/school', 'method': 'POST' },
    { 'path': '/api/admin/upload-asset', 'method': 'POST' },
    { 'path': '/api/auth/activate-teacher', 'method': 'POST' },
    { 'path': '/api/auth/complete-activation', 'method': 'POST' },
    { 'path': '/api/auth/set-profile', 'method': 'POST' },
    { 'path': '/api/auth/verify-ticket', 'method': 'GET' },
    { 'path': '/api/auth/verify-ticket', 'method': 'POST' },
    { 'path': '/api/school-admin/courses', 'method': 'POST' },
    { 'path': '/api/school-admin/courses', 'method': 'DELETE' },
    { 'path': '/api/school-admin/password-tickets', 'method': 'POST' },
    { 'path': '/api/school-admin/password-tickets', 'method': 'GET' },
    { 'path': '/api/school-admin/time-slots', 'method': 'GET' },
    { 'path': '/api/school-admin/time-slots', 'method': 'POST' },
    { 'path': '/api/school-admin/time-slots', 'method': 'PUT' },
    { 'path': '/api/teacher/labs', 'method': 'GET' },
    { 'path': '/api/teacher/labs', 'method': 'POST' },
    { 'path': '/api/teacher/labs', 'method': 'PATCH' },
]

print(f'\n--- INICIANDO PRUEBA DE ENDPOINTS EN {BASE_URL} ---\n')

for ep in endpoints:
    url = BASE_URL + ep['path']
    req = urllib.request.Request(url, method=ep['method'])
    req.add_header('Content-Type', 'application/json')
    
    # Enviar payload vacio para POST
    data = b'{}' if ep['method'] in ['POST', 'DELETE'] else None

    try:
        if data:
            resp = urllib.request.urlopen(req, data=data, timeout=5)
        else:
            resp = urllib.request.urlopen(req, timeout=5)
        
        status = resp.status
        body = resp.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        status = e.code
        body = e.read().decode('utf-8')
    except Exception as e:
        status = 'ERROR'
        body = str(e)
        
    print(f"[{ep['method']}] {ep['path']}  ---> HTTP {status}")
    try:
        parsed = json.loads(body)
        print(f"    Respuesta: {json.dumps(parsed)}")
    except:
        print(f"    Respuesta: {body[:100].strip()}...")
    print('-' * 60)
