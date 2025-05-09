from flask import Flask, request, jsonify
import nmap
import os
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import jwt
from functools import wraps

app = Flask(__name__)
limiter = Limiter(app, key_func=get_remote_address, default_limits=["100 per day", "10 per hour"])
nm = nmap.PortScanner()

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get('Authorization')
        if not token or not token.startswith('Bearer '):
            return jsonify({'error': 'Token required'}), 401
        try:
            jwt.decode(token.replace('Bearer ', ''), os.environ['JWT_SECRET'], algorithms=['HS256'])
        except:
            return jsonify({'error': 'Invalid token'}), 401
        return f(*args, **kwargs)
    return decorated

@app.route('/scan', methods=['POST'])
@limiter.limit("5 per minute")
@require_auth
def scan():
    data = request.get_json()
    target = data.get('target')
    args = data.get('args', '-sS -O -sV')

    if not target:
        return jsonify({'error': 'Target is required'}), 400

    try:
        nm.scan(target, arguments=args)
        results = []

        for host in nm.all_hosts():
            host_data = {
                'ip': host,
                'hostnames': nm[host].hostnames,
                'state': nm[host].state(),
                'os': nm[host].get('osclass', [{}])[0].get('osfamily', 'Unknown'),
                'ports': []
            }
            for proto in nm[host].all_protocols():
                ports = nm[host][proto].keys()
                for port in ports:
                    port_data = {
                        'port': port,
                        'state': nm[host][proto][port]['state'],
                        'service': nm[host][proto][port]['name'],
                        'version': nm[host][proto][port].get('version', '')
                    }
                    host_data['ports'].append(port_data)
            results.append(host_data)

        return jsonify(results)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))