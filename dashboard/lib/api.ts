// File: lib/api.ts
import { neon } from '@neondatabase/serverless';
import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../api/auth/[...nextauth]';
import { Device, Camera, Report, ShodanData, GreyNoiseData } from '../../types';

// Conexión a Neon Postgres
const sql = neon(process.env.DATABASE_URL || '');

// Claves de API
const SHODAN_API_KEY = process.env.SHODAN_API_KEY || '';
const GREYNOISE_API_KEY = process.env.GREYNOISE_API_KEY || '';
const VULNERS_API_KEY = process.env.VULNERS_API_KEY || '';
const NMAP_API_URL = process.env.NMAP_API_URL || '';
const NMAP_API_TOKEN = process.env.NMAP_API_TOKEN || '';

// Función para sanitizar entradas
const sanitizeInput = (input: any) => {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = Array.isArray(input) ? [] : {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
};

// --- Funciones para Dispositivos ---
export async function fetchDevices(): Promise<Device[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const result = await sql(
      `SELECT * FROM devices WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    );

    return result.map((row: any) => ({
      _id: row.id.toString(),
      name: row.name,
      ipAddress: row.ip_address,
      deviceType: row.device_type,
      group: row.group,
      userId: row.user_id,
      status: row.status,
      os: row.os,
      cpuUsage: row.cpu_usage,
      memoryUsage: row.memory_usage,
      browsers: row.browsers || [],
      software: row.software || [],
      cves: row.cves || [],
      shodanData: row.shodan_data,
      greyNoiseData: row.greynoise_data,
      geo: row.geo,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw new Error('Failed to fetch devices');
  }
}

export async function addDevice(input: Omit<Device, '_id' | 'createdAt'>): Promise<Device> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const sanitizedInput = sanitizeInput({
      ...input,
      userId: session.user.id,
    });

    const result = await sql(
      `
      INSERT INTO devices (
        name, ip_address, device_type, "group", user_id, status, os, cpu_usage, memory_usage,
        browsers, software, cves, shodan_data, greynoise_data, geo, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        sanitizedInput.name,
        sanitizedInput.ipAddress,
        sanitizedInput.deviceType,
        sanitizedInput.group,
        sanitizedInput.userId,
        sanitizedInput.status,
        sanitizedInput.os,
        sanitizedInput.cpuUsage,
        sanitizedInput.memoryUsage,
        sanitizedInput.browsers,
        sanitizedInput.software,
        sanitizedInput.cves,
        sanitizedInput.shodanData,
        sanitizedInput.greyNoiseData,
        sanitizedInput.geo,
      ]
    );

    const newDevice = result[0];
    return {
      _id: newDevice.id.toString(),
      name: newDevice.name,
      ipAddress: newDevice.ip_address,
      deviceType: newDevice.device_type,
      group: newDevice.group,
      userId: newDevice.user_id,
      status: newDevice.status,
      os: newDevice.os,
      cpuUsage: newDevice.cpu_usage,
      memoryUsage: newDevice.memory_usage,
      browsers: newDevice.browsers || [],
      software: newDevice.software || [],
      cves: newDevice.cves || [],
      shodanData: newDevice.shodan_data,
      greyNoiseData: newDevice.greynoise_data,
      geo: newDevice.geo,
      createdAt: newDevice.created_at
        ? new Date(newDevice.created_at).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error adding device:', error);
    throw new Error('Failed to add device');
  }
}

export async function deleteDevice(id: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const result = await sql(
      `DELETE FROM devices WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, session.user.id]
    );

    if (result.length === 0) {
      throw new Error('Device not found or unauthorized');
    }
  } catch (error) {
    console.error('Error deleting device:', error);
    throw new Error('Failed to delete device');
  }
}

// --- Funciones para Cámaras ---
export async function fetchCameras(): Promise<Camera[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const result = await sql(
      `SELECT * FROM cameras WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    );

    return result.map((row: any) => ({
      _id: row.id.toString(),
      ipAddress: row.ip_address,
      name: row.name,
      manufacturer: row.manufacturer,
      model: row.model,
      userId: row.user_id,
      ports: row.ports || [],
      lastScanned: row.last_scanned ? new Date(row.last_scanned).toISOString() : new Date().toISOString(),
      shodanData: row.shodan_data,
      greyNoiseData: row.greynoise_data,
      vulnerabilities: row.vulnerabilities || [],
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching cameras:', error);
    throw new Error('Failed to fetch cameras');
  }
}

export async function addCamera(input: Omit<Camera, '_id' | 'createdAt'>): Promise<Camera> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const sanitizedInput = sanitizeInput({
      ...input,
      userId: session.user.id,
    });

    const result = await sql(
      `
      INSERT INTO cameras (
        ip_address, name, manufacturer, model, user_id, ports, last_scanned,
        shodan_data, greynoise_data, vulnerabilities, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [
        sanitizedInput.ipAddress,
        sanitizedInput.name,
        sanitizedInput.manufacturer,
        sanitizedInput.model,
        sanitizedInput.userId,
        sanitizedInput.ports,
        sanitizedInput.shodanData,
        sanitizedInput.greyNoiseData,
        sanitizedInput.vulnerabilities,
      ]
    );

    const newCamera = result[0];
    return {
      _id: newCamera.id.toString(),
      ipAddress: newCamera.ip_address,
      name: newCamera.name,
      manufacturer: newCamera.manufacturer,
      model: newCamera.model,
      userId: newCamera.user_id,
      ports: newCamera.ports || [],
      lastScanned: newCamera.last_scanned
        ? new Date(newCamera.last_scanned).toISOString()
        : new Date().toISOString(),
      shodanData: newCamera.shodan_data,
      greyNoiseData: newCamera.greynoise_data,
      vulnerabilities: newCamera.vulnerabilities || [],
      createdAt: newCamera.created_at
        ? new Date(newCamera.created_at).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error adding camera:', error);
    throw new Error('Failed to add camera');
  }
}

export async function deleteCamera(id: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const result = await sql(
      `DELETE FROM cameras WHERE id = $1 AND user_id = $2 RETURNING id`,
      [id, session.user.id]
    );

    if (result.length === 0) {
      throw new Error('Camera not found or unauthorized');
    }
  } catch (error) {
    console.error('Error deleting camera:', error);
    throw new Error('Failed to delete camera');
  }
}

export async function updateCamera(id: string, input: Partial<Omit<Camera, '_id' | 'createdAt'>>): Promise<Camera> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const sanitizedInput = sanitizeInput(input);

    const result = await sql(
      `
      UPDATE cameras
      SET
        ip_address = COALESCE($1, ip_address),
        name = COALESCE($2, name),
        manufacturer = COALESCE($3, manufacturer),
        model = COALESCE($4, model),
        ports = COALESCE($5, ports),
        last_scanned = COALESCE($6, last_scanned),
        shodan_data = COALESCE($7, shodan_data),
        greynoise_data = COALESCE($8, greynoise_data),
        vulnerabilities = COALESCE($9, vulnerabilities)
      WHERE id = $10 AND user_id = $11
      RETURNING *
      `,
      [
        sanitizedInput.ipAddress,
        sanitizedInput.name,
        sanitizedInput.manufacturer,
        sanitizedInput.model,
        sanitizedInput.ports,
        sanitizedInput.lastScanned ? new Date(sanitizedInput.lastScanned) : null,
        sanitizedInput.shodanData,
        sanitizedInput.greyNoiseData,
        sanitizedInput.vulnerabilities,
        id,
        session.user.id,
      ]
    );

    if (result.length === 0) {
      throw new Error('Camera not found or unauthorized');
    }

    const updatedCamera = result[0];
    return {
      _id: updatedCamera.id.toString(),
      ipAddress: updatedCamera.ip_address,
      name: updatedCamera.name,
      manufacturer: updatedCamera.manufacturer,
      model: updatedCamera.model,
      userId: updatedCamera.user_id,
      ports: updatedCamera.ports || [],
      lastScanned: updatedCamera.last_scanned
        ? new Date(updatedCamera.last_scanned).toISOString()
        : new Date().toISOString(),
      shodanData: updatedCamera.shodan_data,
      greyNoiseData: updatedCamera.greynoise_data,
      vulnerabilities: updatedCamera.vulnerabilities || [],
      createdAt: updatedCamera.created_at
        ? new Date(updatedCamera.created_at).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error updating camera:', error);
    throw new Error('Failed to update camera');
  }
}

// --- Funciones para Reportes ---
export async function fetchReports(): Promise<Report[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const result = await sql(
      `SELECT * FROM reports WHERE user_id = $1 ORDER BY created_at DESC`,
      [session.user.id]
    );

    return result.map((row: any) => ({
      _id: row.id.toString(),
      title: row.title,
      description: row.description,
      type: row.type,
      date: row.date ? new Date(row.date).toISOString() : new Date().toISOString(),
      userId: row.user_id,
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw new Error('Failed to fetch reports');
  }
}

export async function generateReport(input: {
  title: string;
  description: string;
  type: 'security' | 'performance' | 'compliance';
}): Promise<Report> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const sanitizedInput = sanitizeInput(input);

    const result = await sql(
      `
      INSERT INTO reports (title, description, type, user_id, date, created_at)
      VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING *
      `,
      [sanitizedInput.title, sanitizedInput.description, sanitizedInput.type, session.user.id]
    );

    const newReport = result[0];
    return {
      _id: newReport.id.toString(),
      title: newReport.title,
      description: newReport.description,
      type: newReport.type,
      date: newReport.date ? new Date(newReport.date).toISOString() : new Date().toISOString(),
      userId: newReport.user_id,
      createdAt: newReport.created_at
        ? new Date(newReport.created_at).toISOString()
        : new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error generating report:', error);
    throw new Error('Failed to generate report');
  }
}

// --- Funciones para Escaneo de Red ---
export async function scanCameras(ipRange: string): Promise<Camera[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const sanitizedIpRange = sanitizeHtml(ipRange);
    const response = await axios.post(
      `${NMAP_API_URL}/scan`,
      { ipRange: sanitizedIpRange },
      { headers: { Authorization: `Bearer ${NMAP_API_TOKEN}` } }
    );

    const scannedCameras = response.data.cameras || [];
    const cameras: Camera[] = [];

    for (const cam of scannedCameras) {
      const shodanData = await fetchShodanData(cam.ipAddress);
      const greyNoiseData = await fetchGreyNoiseData(cam.ipAddress);
      const vulnerabilities = await fetchVulnersData(cam.software || []);

      const newCamera = await sql(
        `
        INSERT INTO cameras (
          ip_address, name, manufacturer, model, user_id, ports, last_scanned,
          shodan_data, greynoise_data, vulnerabilities, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8, $9, CURRENT_TIMESTAMP)
        RETURNING *
        `,
        [
          cam.ipAddress,
          cam.name || `Camera_${cam.ipAddress}`,
          cam.manufacturer || 'Unknown',
          cam.model || 'Unknown',
          session.user.id,
          cam.ports || [],
          shodanData,
          greyNoiseData,
          vulnerabilities,
        ]
      );

      const camera = newCamera[0];
      cameras.push({
        _id: camera.id.toString(),
        ipAddress: camera.ip_address,
        name: camera.name,
        manufacturer: camera.manufacturer,
        model: camera.model,
        userId: camera.user_id,
        ports: camera.ports || [],
        lastScanned: camera.last_scanned
          ? new Date(camera.last_scanned).toISOString()
          : new Date().toISOString(),
        shodanData: camera.shodan_data,
        greyNoiseData: camera.greynoise_data,
        vulnerabilities: camera.vulnerabilities || [],
        createdAt: camera.created_at
          ? new Date(camera.created_at).toISOString()
          : new Date().toISOString(),
      });
    }

    return cameras;
  } catch (error) {
    console.error('Error scanning cameras:', error);
    throw new Error('Failed to scan cameras');
  }
}

export async function scanNetworkWithNmap(ipRange: string): Promise<Device[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    const sanitizedIpRange = sanitizeHtml(ipRange);
    const response = await axios.post(
      `${NMAP_API_URL}/scan`,
      { ipRange: sanitizedIpRange },
      { headers: { Authorization: `Bearer ${NMAP_API_TOKEN}` } }
    );

    const scannedDevices = response.data.devices || [];
    const devices: Device[] = [];

    for (const dev of scannedDevices) {
      const shodanData = await fetchShodanData(dev.ipAddress);
      const greyNoiseData = await fetchGreyNoiseData(dev.ipAddress);
      const vulnerabilities = await fetchVulnersData(dev.software || []);

      const newDevice = await sql(
        `
        INSERT INTO devices (
          name, ip_address, device_type, "group", user_id, status, os, cpu_usage, memory_usage,
          browsers, software, cves, shodan_data, greynoise_data, geo, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, CURRENT_TIMESTAMP)
        RETURNING *
        `,
        [
          dev.name || `Device_${dev.ipAddress}`,
          dev.ipAddress,
          dev.deviceType || 'Unknown',
          dev.group || 'Default',
          session.user.id,
          dev.status || 'active',
          dev.os || 'Unknown',
          dev.cpuUsage || 0,
          dev.memoryUsage || 0,
          dev.browsers || [],
          dev.software || [],
          vulnerabilities.map((v: any) => v.cveId) || [],
          shodanData,
          greyNoiseData,
          dev.geo || { lat: 0, lng: 0 },
        ]
      );

      const device = newDevice[0];
      devices.push({
        _id: device.id.toString(),
        name: device.name,
        ipAddress: device.ip_address,
        deviceType: device.device_type,
        group: device.group,
        userId: device.user_id,
        status: device.status,
        os: device.os,
        cpuUsage: device.cpu_usage,
        memoryUsage: device.memory_usage,
        browsers: device.browsers || [],
        software: device.software || [],
        cves: device.cves || [],
        shodanData: device.shodan_data,
        greyNoiseData: device.greynoise_data,
        geo: device.geo,
        createdAt: device.created_at
          ? new Date(device.created_at).toISOString()
          : new Date().toISOString(),
      });
    }

    return devices;
  } catch (error) {
    console.error('Error scanning network:', error);
    throw new Error('Failed to scan network');
  }
}

// --- Funciones para APIs Externas ---
export async function fetchShodanData(ip: string): Promise<ShodanData | null> {
  try {
    const sanitizedIp = sanitizeHtml(ip);
    const response = await axios.get(`https://api.shodan.io/shodan/host/${sanitizedIp}`, {
      params: { key: SHODAN_API_KEY },
    });

    return {
      ip: response.data.ip_str,
      ports: response.data.ports || [],
      cpes: response.data.cpes || [],
      vulns: response.data.vulns || [],
      tags: response.data.tags || [],
      product: response.data.product || '',
      version: response.data.version || '',
      hostnames: response.data.hostnames || [],
      os: response.data.os || '',
      org: response.data.org || '',
    };
  } catch (error) {
    console.error('Error fetching Shodan data:', error);
    return null;
  }
}

export async function fetchGreyNoiseData(ip: string): Promise<GreyNoiseData | null> {
  try {
    const sanitizedIp = sanitizeHtml(ip);
    const response = await axios.get(`https://api.greynoise.io/v3/community/${sanitizedIp}`, {
      headers: { 'key': GREYNOISE_API_KEY },
    });

    return {
      ip: response.data.ip,
      noise: response.data.noise,
      riot: response.data.riot,
      classification: response.data.classification,
      name: response.data.name,
      lastSeen: response.data.last_seen,
    };
  } catch (error) {
    console.error('Error fetching GreyNoise data:', error);
    return null;
  }
}

export async function fetchVulnersData(software: { name: string; version: string }[]): Promise<any[]> {
  try {
    const vulnerabilities: any[] = [];
    for (const soft of software) {
      const sanitizedSoftware = sanitizeInput(soft);
      const response = await axios.get('https://vulners.com/api/v3/search/lucene/', {
        params: {
          query: `${sanitizedSoftware.name} ${sanitizedSoftware.version}`,
          apiKey: VULNERS_API_KEY,
        },
      });

      if (response.data.data.search) {
        vulnerabilities.push(
          ...response.data.data.search.map((vuln: any) => ({
            cveId: vuln._source.id,
            severity: vuln._source.cvss.score > 7 ? 'high' : vuln._source.cvss.score > 4 ? 'medium' : 'low',
            description: vuln._source.description,
            link: vuln._source.href,
          }))
        );
      }
    }
    return vulnerabilities;
  } catch (error) {
    console.error('Error fetching Vulners data:', error);
    return [];
  }
}