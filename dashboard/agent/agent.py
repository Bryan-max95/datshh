# src/app/dashboard/agent/agent.py
import requests
import platform
import psutil
import socket
import json
from datetime import datetime
import winreg
import os
from typing import Dict, List, Any
import xml.etree.ElementTree as ElementTree
import subprocess
import re

# Configuration
CLIENT_ID = os.getenv("CLIENT_ID")
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GREYNOISE_API_KEY = os.getenv("GREYNOISE_API_KEY")
NVD_API_KEY = os.getenv("NVD_API_KEY")
SHODAN_API_KEY = os.getenv("SHODAN_API_KEY")
VULNERS_API_KEY = os.getenv("VULNERS_API_KEY")
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:3001/api")

# Input validation
def validate_ip(ip: str) -> bool:
    """Validate IP address format."""
    ip_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    return bool(re.match(ip_pattern, ip))

def validate_network(network: str) -> bool:
    """Validate network CIDR format."""
    network_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$"
    return bool(re.match(network_pattern, network))

def get_access_token() -> str:
    """Obtain an access token using Azure AD."""
    if not all([CLIENT_ID, TENANT_ID, CLIENT_SECRET]):
        print("Missing Azure AD credentials")
        return ""
    try:
        url = f"https://login.microsoftonline.com/{TENANT_ID}/oauth2/v2.0/token"
        payload = {
            'client_id': CLIENT_ID,
            'scope': 'https://graph.microsoft.com/.default',
            'client_secret': CLIENT_SECRET,
            'grant_type': 'client_credentials'
        }
        headers = {'Content-Type': 'application/x-www-form-urlencoded'}
        response = requests.post(url, data=payload, headers=headers, timeout=10)
        response.raise_for_status()
        return response.json()['access_token']
    except requests.exceptions.RequestException as e:
        print(f"Error obtaining token: {str(e)}")
        return ""

def get_ip_address() -> str:
    """Obtain the device's IP address."""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip if validate_ip(ip) else "127.0.0.1"
    except socket.error:
        return "127.0.0.1"

def get_browser_versions() -> List[Dict[str, str]]:
    """Obtain installed browser versions."""
    browsers = []
    browser_paths = {
        'Edge': r"SOFTWARE\Microsoft\Edge",
        'Chrome': r"SOFTWARE\Google\Chrome",
        'Firefox': r"SOFTWARE\Mozilla\Mozilla Firefox"
    }
    for name, path in browser_paths.items():
        try:
            key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, path)
            version, _ = winreg.QueryValueEx(key, "Version")
            browsers.append({"name": name, "version": version})
            winreg.CloseKey(key)
        except WindowsError:
            continue
    return browsers

def get_installed_software() -> List[Dict[str, str]]:
    """Obtain list of installed software."""
    software_list = []
    try:
        key = winreg.OpenKey(winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall")
        for i in range(winreg.QueryInfoKey(key)[0]):
            subkey_name = winreg.EnumKey(key, i)
            subkey = winreg.OpenKey(key, subkey_name)
            try:
                name, _ = winreg.QueryValueEx(subkey, "DisplayName")
                version, _ = winreg.QueryValueEx(subkey, "DisplayVersion")
                software_list.append({"name": name, "version": version})
            except WindowsError:
                continue
            winreg.CloseKey(subkey)
        winreg.CloseKey(key)
    except Exception as e:
        print(f"Error fetching installed software: {str(e)}")
    return software_list

def scan_local_cameras(network: str = "192.168.1.0/24") -> List[Dict[str, Any]]:
    """Scan local network for IP cameras using nmap."""
    if not validate_network(network):
        print(f"Invalid network format: {network}")
        return []
    try:
        cmd = ["nmap", "-p", "80,554,8554", "--open", network, "-oX", "-"]
        result = subprocess.run(cmd, capture_output=True, text=True, check=True)
        root = ElementTree.fromstring(result.stdout)
        
        cameras = []
        for host in root.findall('.//host'):
            ip = host.find('address').get('addr')
            if not validate_ip(ip):
                continue
            ports = [int(p.find('portid').text) for p in host.findall('.//port')]
            service = host.find('.//service')
            product = service.get('product') if service is not None else 'Unknown'
            cameras.append({
                'ipAddress': ip,
                'name': f"Camera {ip}",
                'manufacturer': product,
                'model': product,
                'ports': ports,
                'lastScanned': datetime.now().isoformat()
            })
        return cameras
    except subprocess.CalledProcessError as e:
        print(f"Error scanning cameras: {str(e)}")
        return []
    except Exception as e:
        print(f"Unexpected error scanning cameras: {str(e)}")
        return []

def get_shodan_data(ip: str) -> Dict[str, Any]:
    """Query Shodan for the given IP."""
    if not validate_ip(ip) or not SHODAN_API_KEY:
        print(f"Invalid IP or missing Shodan API key: {ip}")
        return {}
    try:
        url = f"https://api.shodan.io/shodan/host/{ip}"
        params = {'key': SHODAN_API_KEY}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            'ip': ip,
            'ports': data.get('ports', []),
            'cpes': data.get('cpes', []),
            'vulns': data.get('vulns', []),
            'tags': data.get('tags', []),
            'product': data.get('product', ''),
            'version': data.get('version', ''),
            'hostnames': data.get('hostnames', []),
            'os': data.get('os', 'N/A'),
            'org': data.get('org', 'N/A')
        }
    except requests.exceptions.RequestException as e:
        print(f"Shodan error: {str(e)}")
        return {}

def get_grey_noise_data(ip: str) -> Dict[str, Any]:
    """Query GreyNoise for the given IP."""
    if not validate_ip(ip) or not GREYNOISE_API_KEY:
        print(f"Invalid IP or missing GreyNoise API key: {ip}")
        return {}
    try:
        url = f"https://api.greynoise.io/v3/community/{ip}"
        headers = {'Accept': 'application/json', 'key': GREYNOISE_API_KEY}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        return {
            'ip': ip,
            'noise': data.get('noise', False),
            'riot': data.get('riot', False),
            'classification': data.get('classification', 'unknown'),
            'name': data.get('name', ''),
            'lastSeen': data.get('last_seen', '')
        }
    except requests.exceptions.RequestException as e:
        print(f"GreyNoise error: {str(e)}")
        return {}

def get_vulners_data(product: str) -> List[Dict[str, str]]:
    """Query Vulners API for vulnerabilities."""
    if not product or not VULNERS_API_KEY:
        print(f"Invalid product or missing Vulners API key: {product}")
        return []
    try:
        url = "https://vulners.com/api/v3/search/lucene/"
        params = {'query': product, 'apiKey': VULNERS_API_KEY}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data['result'] == 'OK':
            return [{
                'cveId': item.get('id'),
                'severity': item.get('cvss', {}).get('score', 'UNKNOWN'),
                'description': item.get('title', ''),
                'link': item.get('href', '')
            } for item in data['data']['search']]
        return []
    except requests.exceptions.RequestException as e:
        print(f"Vulners error: {str(e)}")
        return []

def check_vulnerabilities(software: List[Dict[str, str]]) -> List[Dict[str, str]]:
    """Query NVD for vulnerabilities."""
    if not NVD_API_KEY:
        print("Missing NVD API key")
        return []
    cves = []
    try:
        url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
        headers = {'apiKey': NVD_API_KEY}
        for soft in software:
            params = {'keywordSearch': f"{soft['name']} {soft['version']}"}
            try:
                response = requests.get(url, headers=headers, params=params, timeout=10)
                response.raise_for_status()
                data = response.json()
                for vuln in data.get('vulnerabilities', []):
                    cve = vuln.get('cve', {})
                    cves.append({
                        'cveId': cve.get('id', ''),
                        'severity': cve.get('metrics', {}).get('cvssMetricV31', [{}])[0].get('cvssData', {}).get('baseSeverity', 'UNKNOWN'),
                        'description': cve.get('descriptions', [{}])[0].get('value', '')
                    })
            except requests.exceptions.RequestException as e:
                print(f"NVD error for {soft['name']}: {str(e)}")
    except Exception as e:
        print(f"General NVD error: {str(e)}")
    return cves

def generate_report(system_info: Dict[str, Any]) -> str:
    """Generate a JSON report with collected information."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report = {
        'timestamp': system_info['timestamp'],
        'device_info': {
            'name': system_info['name'],
            'os': system_info['os'],
            'ip': system_info['ipAddress'],
            'cpu_usage': system_info['cpuUsage'],
            'memory_usage': system_info['memoryUsage']
        },
        'security_data': {
            'browsers': system_info['browsers'],
            'software': system_info['software'],
            'cves': system_info['cves'],
            'shodan': system_info['shodanData'],
            'grey_noise': system_info['greyNoiseData']
        }
    }
    filename = f"report_{timestamp}.json"
    try:
        with open(filename, 'w', encoding='utf-8') as f:
            json.dump(report, f, indent=2, ensure_ascii=False)
        return filename
    except IOError as e:
        print(f"Error saving report: {str(e)}")
        return ""

def register_device(token: str, device_info: Dict[str, Any]) -> None:
    """Register device with the server."""
    if not token:
        print("No token provided for device registration")
        return
    try:
        response = requests.post(
            f'{BACKEND_API_URL}/register-device',
            json={'token': token, 'deviceInfo': device_info},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
        print("Device registered successfully")
    except requests.exceptions.RequestException as e:
        print(f"Error registering device: {str(e)}")

def register_camera(token: str, camera_info: Dict[str, Any]) -> None:
    """Register a camera with the server."""
    if not token or not validate_ip(camera_info.get('ipAddress', '')):
        print(f"Invalid token or IP for camera: {camera_info.get('ipAddress', '')}")
        return
    try:
        response = requests.post(
            f'{BACKEND_API_URL}/cameras',
            json={'token': token, 'cameraInfo': camera_info},
            headers={'Content-Type': 'application/json'},
            timeout=10
        )
        response.raise_for_status()
        print(f"Camera {camera_info['ipAddress']} registered successfully")
    except requests.exceptions.RequestException as e:
        print(f"Error registering camera: {str(e)}")

def main():
    try:
        print("Collecting system information...")
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
        
        print("Querying security services...")
        system_info['shodanData'] = get_shodan_data(system_info['ipAddress'])
        system_info['greyNoiseData'] = get_grey_noise_data(system_info['ipAddress'])
        
        print("Checking vulnerabilities...")
        system_info['cves'] = check_vulnerabilities(system_info['software'])
        
        print("Generating report...")
        report_file = generate_report(system_info)
        print(f"Report saved as: {report_file}")
        
        print("Obtaining access token...")
        token = get_access_token()
        if not token:
            print("Authentication failed")
            return
        
        print("Registering device with server...")
        register_device(token, system_info)
        
        print("Scanning local cameras...")
        cameras = scan_local_cameras()
        for camera in cameras:
            camera['shodanData'] = get_shodan_data(camera['ipAddress'])
            camera['greyNoiseData'] = get_grey_noise_data(camera['ipAddress'])
            camera['vulnerabilities'] = get_vulners_data(camera['manufacturer'] or 'camera')
            register_camera(token, camera)
        
    except Exception as e:
        print(f"Critical error: {str(e)}")
        with open('error.log', 'a') as f:
            f.write(f"[{datetime.now()}] ERROR: {str(e)}\n")

if __name__ == "__main__":
    main()