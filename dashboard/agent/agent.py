import requests
import platform
import psutil
import winreg
import subprocess
from datetime import datetime

# Configuración de APIs
CLIENT_ID = 'd4343540-df98-4d57-b21c-34f13947c209'
TENANT_ID = 'BWPDefenderSecret'
CLIENT_SECRET = 'OQ_8Q~5d28BoUtqEOI2uh_wRGIiHxkaR.n8Gwbpp'
GREYNOISE_API_KEY = 'bmeNWnfBIykcVZIc2UIWpIrnHDZUNUrK9sH56CnGnDeSwuv9eYkjxuLiGYm3Dim2'
TOKEN_URL = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"

def get_access_token():
    """Obtiene token de acceso de Azure AD"""
    data = {
        'grant_type': 'client_credentials',
        'client_id': CLIENT_ID,
        'client_secret': CLIENT_SECRET,
        'scope': 'https://graph.microsoft.com/.default',
    }
    try:
        response = requests.post(TOKEN_URL, data=data, timeout=10)
        response.raise_for_status()
        return response.json()['access_token']
    except requests.exceptions.RequestException as e:
        raise Exception(f"Error al obtener token: {str(e)}")

def get_ip_address():
    """Obtiene la IP pública del sistema"""
    try:
        return requests.get('https://api.ipify.org', timeout=5).text
    except:
        return 'Desconocido'

def get_shodan_data(ip):
    """Consulta información de Shodan"""
    if ip == 'Desconocido':
        return {'error': 'IP no disponible'}
    
    try:
        response = requests.get(f'https://internetdb.shodan.io/{ip}', timeout=5)
        return response.json() if response.status_code == 200 else {
            'ports': [], 
            'cpes': [], 
            'vulns': [],
            'error': f"Error Shodan: {response.status_code}"
        }
    except Exception as e:
        return {
            'ports': [], 
            'cpes': [], 
            'vulns': [],
            'error': f"Excepción Shodan: {str(e)}"
        }

def get_grey_noise_data(ip):
    """Consulta información de GreyNoise"""
    if ip == 'Desconocido':
        return {'error': 'IP no disponible'}
    
    try:
        response = requests.get(
            f'https://api.greynoise.io/v3/community/{ip}',
            headers={'Accept': 'application/json', 'key': GREYNOISE_API_KEY},
            timeout=5
        )
        if response.status_code == 200:
            data = response.json()
            return {
                'noise': data.get('noise', False),
                'riot': data.get('riot', False),
                'classification': data.get('classification', 'unknown'),
                'name': data.get('name', ''),
                'lastSeen': data.get('last_seen', ''),
                'error': None
            }
        return {
            'error': f"Error GreyNoise: {response.status_code}",
            **response.json()
        }
    except Exception as e:
        return {
            'error': f"Excepción GreyNoise: {str(e)}",
            'noise': False,
            'riot': False
        }

def get_browser_versions():
    """Detecta versiones de navegadores instalados"""
    browsers = []
    
    # Chrome
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, 
                          r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\chrome.exe") as key:
            path = winreg.QueryValueEx(key, "")[0]
            version = subprocess.check_output(f'"{path}" --version', shell=True).decode().strip()
            browsers.append({
                'name': 'Chrome',
                'version': version.replace('Google Chrome ', '')
            })
    except Exception:
        pass

    # Firefox
    try:
        with winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE,
                          r"SOFTWARE\Mozilla\Mozilla Firefox") as key:
            version = winreg.QueryValueEx(key, "CurrentVersion")[0]
            browsers.append({
                'name': 'Firefox',
                'version': version
            })
    except Exception:
        pass

    return browsers

def get_installed_software():
    """Obtiene lista de software instalado"""
    software = []
    try:
        output = subprocess.check_output(
            'wmic product get name,version /format:csv',
            shell=True,
            stderr=subprocess.PIPE
        ).decode('utf-8', 'ignore')
        
        for line in output.splitlines()[1:]:
            if ',' in line:
                parts = line.split(',')
                if len(parts) >= 3 and parts[1].strip():
                    software.append({
                        'name': parts[1].strip(),
                        'version': parts[2].strip() if len(parts) >= 3 else 'Desconocida'
                    })
    except Exception as e:
        print(f"Error obteniendo software: {str(e)}")
    
    return software

def check_vulnerabilities(software):
    """Busca vulnerabilidades conocidas"""
    cves = []
    for s in software:
        try:
            response = requests.get(
                'https://services.nvd.nist.gov/rest/json/cves/1.0',
                params={
                    'keyword': s['name'],
                    'resultsPerPage': 3
                },
                timeout=10
            )
            
            if response.status_code == 200:
                for vuln in response.json().get('result', {}).get('CVE_Items', []):
                    try:
                        cve_data = vuln.get('cve', {})
                        description = next(
                            (desc['value'] for desc in 
                             cve_data.get('description', {}).get('description_data', [])
                             if desc.get('lang') == 'en'),
                            'Sin descripción disponible'
                        )
                        
                        cvss_data = (vuln.get('impact', {})
                                    .get('baseMetricV3', {})
                                    .get('cvssV3', {}))
                        
                        cves.append({
                            'software': f"{s['name']} {s['version']}",
                            'cveId': cve_data.get('CVE_data_meta', {}).get('ID', ''),
                            'severity': cvss_data.get('baseSeverity', 'UNKNOWN'),
                            'description': description[:200] + '...' if len(description) > 200 else description,
                            'score': cvss_data.get('baseScore', 0)
                        })
                    except Exception as e:
                        print(f"Error procesando CVE: {str(e)}")
                        continue
        except Exception as e:
            print(f"Error consultando NVD: {str(e)}")
            continue
    
    # Ordenar por severidad y score
    severity_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
    return sorted(
        cves,
        key=lambda x: (severity_order.get(x['severity'], 4), -x['score'])
    )[:15]

def generate_report(device_info):
    """Genera reporte en formato legible"""
    report_lines = [
        f"=== Reporte de Seguridad - {datetime.now().strftime('%Y-%m-%d %H:%M')} ===",
        f"\nSistema: {device_info['name']}",
        f"OS: {device_info['os']}",
        f"IP: {device_info['ipAddress']}",
        f"\n--- Estado del Sistema ---",
        f"CPU: {device_info['cpuUsage']}% | Memoria: {device_info['memoryUsage']}%",
    ]
    
    # Navegadores
    if device_info['browsers']:
        report_lines.append("\n--- Navegadores ---")
        for browser in device_info['browsers']:
            report_lines.append(f"{browser['name']}: {browser['version']}")
    
    # Datos de IP
    report_lines.append("\n--- Análisis de IP ---")
    shodan = device_info['shodanData']
    report_lines.append(f"Shodan - Puertos: {', '.join(map(str, shodan.get('ports', [])) or 'Ninguno')}")
    
    greynoise = device_info['greyNoiseData']
    report_lines.append(f"GreyNoise - Clasificación: {greynoise.get('classification', 'unknown')}")
    
    # Vulnerabilidades
    if device_info['cves']:
        report_lines.append("\n--- Vulnerabilidades Críticas ---")
        for cve in device_info['cves'][:5]:  # Mostrar solo las 5 más críticas
            report_lines.append(
                f"[{cve['severity']}] {cve['cveId']} - {cve['software']}\n"
                f"Score: {cve['score']} | {cve['description']}\n"
            )
    
    # Guardar en archivo
    filename = f"security_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt"
    with open(filename, 'w', encoding='utf-8') as f:
        f.write('\n'.join(report_lines))
    
    return filename

def main():
    """Función principal"""
    try:
        print("Recopilando información del sistema...")
        system_info = {
            'name': platform.node(),
            'os': f"{platform.system()} {platform.release()}",
            'ipAddress': get_ip_address(),
            'cpuUsage': psutil.cpu_percent(interval=1),
            'memoryUsage': psutil.virtual_memory().percent,
            'browsers': get_browser_versions(),
            'software': get_installed_software(),
            'shodanData': {},
            'greyNoiseData': {},
            'timestamp': datetime.now().isoformat()
        }
        
        print("Consultando servicios de seguridad...")
        system_info['shodanData'] = get_shodan_data(system_info['ipAddress'])
        system_info['greyNoiseData'] = get_grey_noise_data(system_info['ipAddress'])
        
        print("Buscando vulnerabilidades...")
        system_info['cves'] = check_vulnerabilities(system_info['software'])
        
        print("Generando reporte...")
        report_file = generate_report(system_info)
        print(f"Reporte guardado como: {report_file}")
        
        print("Obteniendo token de acceso...")
        token = get_access_token()
        print("Autenticación exitosa")
        
        # Aquí iría el envío a tu backend
        # register_device(token, system_info)
        
    except Exception as e:
        print(f"Error crítico: {str(e)}")
        with open('error.log', 'a') as f:
            f.write(f"[{datetime.now()}] ERROR: {str(e)}\n")

if __name__ == '__main__':
    main()