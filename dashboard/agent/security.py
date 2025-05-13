# src/app/dashboard/agent/security.py
import requests
import os
import json
import redis # type: ignore
from typing import Dict, List, Any

# Configuration
CLIENT_ID = os.getenv("CLIENT_ID")
TENANT_ID = os.getenv("TENANT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")
GREYNOISE_API_KEY = os.getenv("GREYNOISE_API_KEY")
NVD_API_KEY = os.getenv("NVD_API_KEY")
SHODAN_API_KEY = os.getenv("SHODAN_API_KEY")
VULNERS_API_KEY = os.getenv("VULNERS_API_KEY")

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

def get_shodan_data(ip: str, redis_client: redis.Redis) -> Dict[str, Any]:
    """Query Shodan for the given IP."""
    if not ip or not SHODAN_API_KEY:
        print(f"Invalid IP or missing Shodan API key: {ip}")
        return {}
    
    cache_key = f"shodan:{ip}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    try:
        url = f"https://api.shodan.io/shodan/host/{ip}"
        params = {'key': SHODAN_API_KEY}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        result = {
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
        redis_client.setex(cache_key, 3600, json.dumps(result))
        return result
    except requests.exceptions.RequestException as e:
        print(f"Shodan error: {str(e)}")
        return {}

def get_grey_noise_data(ip: str, redis_client: redis.Redis) -> Dict[str, Any]:
    """Query GreyNoise for the given IP."""
    if not ip or not GREYNOISE_API_KEY:
        print(f"Invalid IP or missing GreyNoise API key: {ip}")
        return {}
    
    cache_key = f"greynoise:{ip}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    try:
        url = f"https://api.greynoise.io/v3/community/{ip}"
        headers = {'Accept': 'application/json', 'key': GREYNOISE_API_KEY}
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()
        result = {
            'ip': ip,
            'noise': data.get('noise', False),
            'riot': data.get('riot', False),
            'classification': data.get('classification', 'unknown'),
            'name': data.get('name', ''),
            'lastSeen': data.get('last_seen', '')
        }
        redis_client.setex(cache_key, 3600, json.dumps(result))
        return result
    except requests.exceptions.RequestException as e:
        print(f"GreyNoise error: {str(e)}")
        return {}

def get_vulners_data(product: str, redis_client: redis.Redis) -> List[Dict[str, str]]:
    """Query Vulners API for vulnerabilities."""
    if not product or not VULNERS_API_KEY:
        print(f"Invalid product or missing Vulners API key: {product}")
        return []
    
    cache_key = f"vulners:{product}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
    try:
        url = "https://vulners.com/api/v3/search/lucene/"
        params = {'query': product, 'apiKey': VULNERS_API_KEY}
        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        if data['result'] == 'OK':
            result = [{
                'cveId': item.get('id'),
                'severity': item.get('cvss', {}).get('score', 'UNKNOWN'),
                'description': item.get('title', ''),
                'link': item.get('href', '')
            } for item in data['data']['search']]
            redis_client.setex(cache_key, 3600, json.dumps(result))
            return result
        return []
    except requests.exceptions.RequestException as e:
        print(f"Vulners error: {str(e)}")
        return []

def check_vulnerabilities(software: List[Dict[str, str]], redis_client: redis.Redis) -> List[Dict[str, str]]:
    """Query NVD for vulnerabilities."""
    if not NVD_API_KEY:
        print("Missing NVD API key")
        return []
    
    cves = []
    for soft in software:
        cache_key = f"nvd:{soft['name']}:{soft['version']}"
        cached = redis_client.get(cache_key)
        if cached:
            cves.extend(json.loads(cached))
            continue
        
        try:
            url = "https://services.nvd.nist.gov/rest/json/cves/2.0"
            headers = {'apiKey': NVD_API_KEY}
            params = {'keywordSearch': f"{soft['name']} {soft['version']}"}
            response = requests.get(url, headers=headers, params=params, timeout=10)
            response.raise_for_status()
            data = response.json()
            soft_cves = [{
                'cveId': cve.get('cve', {}).get('id', ''),
                'severity': cve.get('cve', {}).get('metrics', {}).get('cvssMetricV31', [{}])[0].get('cvssData', {}).get('baseSeverity', 'UNKNOWN'),
                'description': cve.get('cve', {}).get('descriptions', [{}])[0].get('value', '')
            } for cve in data.get('vulnerabilities', [])]
            cves.extend(soft_cves)
            redis_client.setex(cache_key, 3600, json.dumps(soft_cves))
        except requests.exceptions.RequestException as e:
            print(f"NVD error for {soft['name']}: {str(e)}")
    return cves