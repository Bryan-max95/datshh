# src/app/dashboard/agent/main.py
import os
import json
from datetime import datetime
import platform

import psutil
import redis # type: ignore
from dotenv import load_dotenv # type: ignore
from network import scan_local_cameras, get_ip_address
from security import get_shodan_data, get_grey_noise_data, get_vulners_data, check_vulnerabilities, get_access_token
from reporting import generate_report, register_device, register_camera

load_dotenv()

# Configuration
BACKEND_API_URL = os.getenv("BACKEND_API_URL", "http://localhost:4000/api")
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")

# Redis Client
redis_client = redis.Redis.from_url(REDIS_URL)

def main():
    try:
        print("Collecting system information...")
        system_info = {
            'name': platform.node(),
            'os': f"{platform.system()} {platform.release()}",
            'ipAddress': get_ip_address(),
            'cpuUsage': psutil.cpu_percent(interval=1),
            'memoryUsage': psutil.virtual_memory().percent,
            'software': get_installed_software(), # type: ignore
            'shodanData': {},
            'greyNoiseData': {},
            'timestamp': datetime.now().isoformat()
        }
        
        print("Querying security services...")
        system_info['shodanData'] = get_shodan_data(system_info['ipAddress'], redis_client)
        system_info['greyNoiseData'] = get_grey_noise_data(system_info['ipAddress'], redis_client)
        
        print("Checking vulnerabilities...")
        system_info['cves'] = check_vulnerabilities(system_info['software'], redis_client)
        
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
        cameras = scan_local_cameras(redis_client)
        for camera in cameras:
            camera['shodanData'] = get_shodan_data(camera['ipAddress'], redis_client)
            camera['greyNoiseData'] = get_grey_noise_data(camera['ipAddress'], redis_client)
            camera['vulnerabilities'] = get_vulners_data(camera['manufacturer'] or 'camera', redis_client)
            register_camera(token, camera)
        
    except Exception as e:
        print(f"Critical error: {str(e)}")
        with open('error.log', 'a') as f:
            f.write(f"[{datetime.now()}] ERROR: {str(e)}\n")

if __name__ == "__main__":
    main()