# src/app/dashboard/agent/network.py
import socket
import subprocess
import re
import xml.etree.ElementTree as ElementTree
from datetime import datetime
import redis # type: ignore
import json

def validate_ip(ip: str) -> bool:
    """Validate IP address format."""
    ip_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$"
    return bool(re.match(ip_pattern, ip))

def validate_network(network: str) -> bool:
    """Validate network CIDR format."""
    network_pattern = r"^(?:[0-9]{1,3}\.){3}[0-9]{1,3}/[0-9]{1,2}$"
    return bool(re.match(network_pattern, network))

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

def scan_local_cameras(redis_client: redis.Redis, network: str = "192.168.1.0/24") -> list[dict]:
    """Scan local network for IP cameras using nmap."""
    if not validate_network(network):
        print(f"Invalid network format: {network}")
        return []
    
    cache_key = f"scan_cameras:{network}"
    cached = redis_client.get(cache_key)
    if cached:
        return json.loads(cached)
    
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
            product = service.get('product amd64') if service is not None else 'Unknown'
            cameras.append({
                'ipAddress': ip,
                'name': f"Camera {ip}",
                'manufacturer': product,
                'model': product,
                'ports': ports,
                'lastScanned': datetime.now().isoformat()
            })
        
        redis_client.setex(cache_key, 3600, json.dumps(cameras))
        return cameras
    except subprocess.CalledProcessError as e:
        print(f"Error scanning cameras: {str(e)}")
        return []
    except Exception as e:
        print(f"Unexpected error scanning cameras: {str(e)}")
        return []