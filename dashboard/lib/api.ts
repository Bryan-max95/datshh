/* src/app/dashboard/lib/api.ts */
import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { Device, Camera, Policy, Incident, Report, Threat, ShodanData, GreyNoiseData } from '../../types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const SHODAN_API_KEY = process.env.NEXT_PUBLIC_SHODAN_API_KEY || '';
const GREYNOISE_API_KEY = process.env.NEXT_PUBLIC_GREYNOISE_API_KEY || '';
const VULNERS_API_KEY = process.env.NEXT_PUBLIC_VULNERS_API_KEY || '';

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
});

export async function fetchDevices(): Promise<Device[]> {
  try {
    const response = await axiosInstance.get('/equipos');
    return response.data;
  } catch (error) {
    console.error('Error fetching devices:', error);
    throw new Error('Failed to fetch devices');
  }
}

export async function addDevice(device: {
  name: string;
  ipAddress: string;
  deviceType: string;
  group: string;
}): Promise<Device> {
  try {
    const sanitizedDevice = {
      name: sanitizeHtml(device.name),
      ipAddress: sanitizeHtml(device.ipAddress),
      deviceType: sanitizeHtml(device.deviceType),
      group: sanitizeHtml(device.group),
    };
    const response = await axiosInstance.post('/equipos', sanitizedDevice);
    return response.data;
  } catch (error) {
    console.error('Error adding device:', error);
    throw new Error('Failed to add device');
  }
}

export async function deleteDevice(_id: string): Promise<void> {
  try {
    const response = await axiosInstance.delete('/equipos', {
      data: { _id: sanitizeHtml(_id) },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting device:', error);
    throw new Error('Failed to delete device');
  }
}

export async function fetchSummary({ timeRange }: { timeRange: string }): Promise<any> {
  try {
    const response = await axiosInstance.get('/summary', {
      params: { timeRange: sanitizeHtml(timeRange) },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching summary:', error);
    throw new Error('Failed to fetch summary');
  }
}

export async function fetchShodanData(ip: string): Promise<ShodanData | null> {
  if (!ip) return null;
  try {
    const response = await axios.get(`https://api.shodan.io/shodan/host/${sanitizeHtml(ip)}`, {
      params: { key: SHODAN_API_KEY },
    });
    return {
      ip,
      ports: response.data.ports || [],
      cpes: response.data.cpes || [],
      vulns: response.data.vulns || [],
      tags: response.data.tags || [],
      product: response.data.product || '',
      version: response.data.version || '',
      hostnames: response.data.hostnames || [],
      os: response.data.os || 'N/A',
      org: response.data.org || 'N/A',
    };
  } catch (error: any) {
    console.error('Error fetching Shodan data:', error.message);
    if (error.response?.status === 404) return null;
    throw new Error('Failed to fetch Shodan data');
  }
}

export async function fetchGreyNoiseData(ip: string): Promise<GreyNoiseData | null> {
  if (!ip) return null;
  try {
    const response = await axios.get(`https://api.greynoise.io/v3/community/${sanitizeHtml(ip)}`, {
      headers: { key: GREYNOISE_API_KEY },
    });
    return {
      ip,
      noise: response.data.noise || false,
      riot: response.data.riot || false,
      classification: response.data.classification || 'unknown',
      name: response.data.name || '',
      lastSeen: response.data.last_seen || '', // Changed from last_seen to lastSeen
    };
  } catch (error: any) {
    console.error('Error fetching GreyNoise data:', error.message);
    if (error.response?.status === 404) return null;
    throw new Error('Failed to fetch GreyNoise data');
  }
}

export async function fetchVulnersData(product: string): Promise<{ cveId: string; severity: string; description: string; link?: string }[]> {
  if (!product) return [];
  try {
    const response = await axios.get('https://vulners.com/api/v3/search/lucene/', {
      params: {
        query: sanitizeHtml(product),
        apiKey: VULNERS_API_KEY,
      },
    });
    if (response.data.result === 'OK') {
      return response.data.data.search.map((item: any) => ({
        cveId: item.id,
        severity: item.cvss?.score?.toString() || 'UNKNOWN',
        description: item.title || '',
        link: item.href || '',
      }));
    }
    return [];
  } catch (error) {
    console.error('Error fetching Vulners data:', error);
    return [];
  }
}

export async function fetchCameras(p0: { page: number; limit: number; search: string; }): Promise<Camera[]> {
  try {
    const response = await axiosInstance.get('/cameras');
    return response.data;
  } catch (error) {
    console.error('Error fetching cameras:', error);
    throw new Error('Failed to fetch cameras');
  }
}

export async function addCamera(camera: {
  ipAddress: string;
  name: string;
  manufacturer?: string;
  model?: string;
  ports?: number[];
  lastScanned?: string;
}): Promise<Camera> {
  try {
    const sanitizedCamera = {
      ipAddress: sanitizeHtml(camera.ipAddress),
      name: sanitizeHtml(camera.name),
      manufacturer: camera.manufacturer ? sanitizeHtml(camera.manufacturer) : undefined,
      model: camera.model ? sanitizeHtml(camera.model) : undefined,
      ports: camera.ports,
      lastScanned: camera.lastScanned,
    };
    const response = await axiosInstance.post('/cameras', sanitizedCamera);
    return response.data;
  } catch (error) {
    console.error('Error adding camera:', error);
    throw new Error('Failed to add camera');
  }
}

export async function deleteCamera(_id: string): Promise<void> {
  try {
    const response = await axiosInstance.delete('/cameras', {
      data: { _id: sanitizeHtml(_id) },
    });
    return response.data;
  } catch (error) {
    console.error('Error deleting camera:', error);
    throw new Error('Failed to delete camera');
  }
}

export async function scanCameras(query: string = 'port:554 has_screenshot:true'): Promise<Camera[]> {
  try {
    const response = await axios.get(`https://api.shodan.io/shodan/host/search`, {
      params: {
        key: SHODAN_API_KEY,
        query: sanitizeHtml(query),
      },
    });
    return response.data.matches.map((item: any) => ({
      ipAddress: item.ip_str,
      name: item.product || 'Unknown Camera',
      manufacturer: item.org || 'Unknown',
      model: item.product || 'Unknown',
      ports: item.ports || [],
      lastScanned: new Date().toISOString(),
      shodanData: {
        ports: item.ports || [],
        cpes: item.cpes || [],
        vulns: item.vulns || [],
        tags: item.tags || [],
      },
    }));
  } catch (error) {
    console.error('Error scanning cameras:', error);
    throw new Error('Failed to scan cameras');
  }
}

export async function fetchPolicies(p0: { timeRange: string; }): Promise<Policy[]> {
  try {
    const response = await axiosInstance.get('/policies');
    return response.data;
  } catch (error) {
    console.error('Error fetching policies:', error);
    throw new Error('Failed to fetch policies');
  }
}

export async function fetchIncidents(): Promise<Incident[]> {
  try {
    const response = await axiosInstance.get('/incidents');
    return response.data;
  } catch (error) {
    console.error('Error fetching incidents:', error);
    throw new Error('Failed to fetch incidents');
  }
}

export async function fetchReports(): Promise<Report[]> {
  try {
    const response = await axiosInstance.get('/reports');
    return response.data;
  } catch (error) {
    console.error('Error fetching reports:', error);
    throw new Error('Failed to fetch reports');
  }
}

export async function fetchThreats(): Promise<Threat[]> {
  try {
    const response = await axiosInstance.get('/threats');
    return response.data;
  } catch (error) {
    console.error('Error fetching threats:', error);
    throw new Error('Failed to fetch threats');
  }
}

export async function investigateDomain(domain: string): Promise<{ status: string; categories: string[] }> {
  try {
    // Mock implementation (replace with real API call)
    return {
      status: 'active',
      categories: ['web', 'business'],
    };
  } catch (error) {
    console.error('Error investigating domain:', error);
    throw new Error('Failed to investigate domain');
  }
}

export async function validateToken(token: string): Promise<{ valid: boolean }> {
  try {
    // Mock implementation (replace with real token validation)
    return { valid: token === 'valid-token' };
  } catch (error) {
    console.error('Error validating token:', error);
    throw new Error('Failed to validate token');
  }
}