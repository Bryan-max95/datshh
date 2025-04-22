import axios from 'axios';
import sanitizeHtml from 'sanitize-html';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api';
const SHODAN_API_KEY = process.env.SHODAN_API_KEY || 'tu_clave_shodan';
const GREYNOISE_API_KEY = process.env.GREYNOISE_API_KEY || 'bmeNWnfBIykcVZIc2UIWpIrnHDZUNUrK9sH56CnGnDeSwuv9eYkjxuLiGYm3Dim2';
const VULNERS_API_KEY = process.env.VULNERS_API_KEY || 'tu_clave_vulners';

export async function fetchDevices() {
  try {
    const response = await axios.get(`${API_BASE_URL}/equipos`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener dispositivos:', error);
    throw new Error('No se pudieron obtener los dispositivos');
  }
}

export async function addDevice(device: {
  name: string;
  ipAddress: string;
  deviceType: string;
  group: string;
}) {
  try {
    const sanitizedDevice = {
      name: sanitizeHtml(device.name),
      ipAddress: sanitizeHtml(device.ipAddress),
      deviceType: sanitizeHtml(device.deviceType),
      group: sanitizeHtml(device.group),
    };
    const response = await axios.post(`${API_BASE_URL}/equipos`, sanitizedDevice, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al agregar dispositivo:', error);
    throw new Error('No se pudo agregar el dispositivo');
  }
}

export async function deleteDevice(_id: string) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/equipos`, {
      data: { _id: sanitizeHtml(_id) },
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al eliminar dispositivo:', error);
    throw new Error('No se pudo eliminar el dispositivo');
  }
}

export async function fetchSummary({ timeRange }: { timeRange: string } = { timeRange: '30d' }) {
  try {
    const response = await axios.get(`${API_BASE_URL}/summary`, {
      params: { timeRange: sanitizeHtml(timeRange) },
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener resumen:', error);
    throw new Error('No se pudo obtener el resumen');
  }
}

export async function fetchShodanData(ip: string) {
  try {
    const response = await axios.get(`https://api.shodan.io/shodan/host/${sanitizeHtml(ip)}`, {
      params: { key: SHODAN_API_KEY },
      headers: { 'Accept': 'application/json' },
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
    console.error('Error al obtener datos de Shodan:', error.message);
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error('No se pudieron obtener datos de Shodan');
  }
}

export async function fetchGreyNoiseData(ip: string) {
  try {
    const response = await axios.get(`https://api.greynoise.io/v3/community/${sanitizeHtml(ip)}`, {
      headers: {
        'Accept': 'application/json',
        'key': GREYNOISE_API_KEY,
      },
    });
    return {
      ip,
      noise: response.data.noise || false,
      riot: response.data.riot || false,
      classification: response.data.classification || 'unknown',
      name: response.data.name || '',
      last_seen: response.data.last_seen || '',
    };
  } catch (error: any) {
    console.error('Error al obtener datos de GreyNoise:', error.message);
    if (error.response?.status === 404) {
      return null;
    }
    throw new Error('No se pudieron obtener datos de GreyNoise');
  }
}

export async function fetchVulnersData(product: string) {
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
    console.error('Error al obtener datos de Vulners:', error);
    return [];
  }
}

export async function fetchCameras() {
  try {
    const response = await axios.get(`${API_BASE_URL}/cameras`, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener cámaras:', error);
    throw new Error('No se pudieron obtener las cámaras');
  }
}

export async function addCamera(camera: {
  ipAddress: string;
  name: string;
  manufacturer?: string;
  model?: string;
}) {
  try {
    const sanitizedCamera = {
      ipAddress: sanitizeHtml(camera.ipAddress),
      name: sanitizeHtml(camera.name),
      manufacturer: camera.manufacturer ? sanitizeHtml(camera.manufacturer) : undefined,
      model: camera.model ? sanitizeHtml(camera.model) : undefined,
    };
    const response = await axios.post(`${API_BASE_URL}/cameras`, sanitizedCamera, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al agregar cámara:', error);
    throw new Error('No se pudo agregar la cámara');
  }
}

export async function deleteCamera(_id: string) {
  try {
    const response = await axios.delete(`${API_BASE_URL}/cameras`, {
      data: { _id: sanitizeHtml(_id) },
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error al eliminar cámara:', error);
    throw new Error('No se pudo eliminar la cámara');
  }
}

export async function scanCameras(query: string = 'port:554 has_screenshot:true') {
  try {
    const response = await axios.get(`https://api.shodan.io/shodan/host/search`, {
      params: {
        key: SHODAN_API_KEY,
        query: sanitizeHtml(query),
      },
    });
    return response.data.matches.map((item: any) => ({
      ipAddress: item.ip_str,
      name: item.product || 'Cámara desconocida',
      manufacturer: item.org || 'Desconocido',
      model: item.product || 'Desconocido',
      ports: item.ports || [],
      shodanData: {
        ports: item.ports || [],
        cpes: item.cpes || [],
        vulns: item.vulns || [],
        tags: item.tags || [],
      },
    }));
  } catch (error) {
    console.error('Error al escanear cámaras:', error);
    throw new Error('No se pudieron escanear las cámaras');
  }
}