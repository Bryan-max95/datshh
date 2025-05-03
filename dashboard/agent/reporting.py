# src/app/dashboard/agent/reporting.py
import os
import requests
import json
from datetime import datetime
from typing import Dict, Any

BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:4000/api")

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
    if not token or not camera_info.get('ipAddress'):
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