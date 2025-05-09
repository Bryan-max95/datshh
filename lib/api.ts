import axios from 'axios';
import sanitizeHtml from 'sanitize-html';
import { MongoClient, ObjectId } from 'mongodb';
import { createClient } from 'redis';
import { Device, Camera, ShodanData, GreyNoiseData } from '../../types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../api/auth/[...nextauth]';

const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/cybersecurity_dashboard?retryWrites=true&w=majority');
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

mongoClient.connect();
redisClient.connect();

const db = mongoClient.db('cybersecurity_dashboard');
const devicesCollection = db.collection('devices');
const camerasCollection = db.collection('cameras');

const SHODAN_API_KEY = process.env.SHODAN_API_KEY || '';
const GREYNOISE_API_KEY = process.env.GREYNOISE_API_KEY || '';
const VULNERS_API_KEY = process.env.VULNERS_API_KEY || '';

export async function fetchDevices({ page = 1, limit = 10, search = '' }: { page?: number; limit?: number; search?: string } = {}): Promise<{ devices: Device[]; totalPages: number }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const query = {
      userId: session.user.id,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } },
          { deviceType: { $regex: search, $options: 'i' } },
          { group: { $regex: search, $options: 'i' } },
        ],
      }),
    };
    const total = await devicesCollection.countDocuments(query);
    const devices = await devicesCollection
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const mappedDevices: Device[] = devices.map((doc) => ({
      _id: doc._id.toString(),
      name: doc.name || '',
      ipAddress: doc.ipAddress || '',
      deviceType: doc.deviceType || '',
      group: doc.group || '',
      userId: doc.userId || session.user.id,
      status: doc.status || 'Unknown',
      os: doc.os || 'Unknown',
      cpuUsage: doc.cpuUsage || 0,
      memoryUsage: doc.memoryUsage || 0,
      browsers: doc.browsers || [],
      software: doc.software || [],
      cves: doc.cves || [],
      shodanData: doc.shodanData || null,
      greyNoiseData: doc.greyNoiseData || null,
      geo: doc.geo || { lat: 0, lng: 0 },
      createdAt: doc.createdAt || new Date().toISOString(),
    }));

    return { devices: mappedDevices, totalPages: Math.ceil(total / limit) };
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
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const sanitizedDevice = {
      name: sanitizeHtml(device.name),
      ipAddress: sanitizeHtml(device.ipAddress),
      deviceType: sanitizeHtml(device.deviceType),
      group: sanitizeHtml(device.group),
      userId: session.user.id,
      status: 'Online',
      os: 'Unknown',
      cpuUsage: 0,
      memoryUsage: 0,
      browsers: [],
      software: [],
      cves: [],
      shodanData: null,
      greyNoiseData: null,
      geo: { lat: 0, lng: 0 },
      createdAt: new Date().toISOString(),
    };
    const newId = new ObjectId().toString();
    await devicesCollection.insertOne({
      _id: new ObjectId(newId),
      ...sanitizedDevice,
    });
    return { _id: newId, ...sanitizedDevice };
  } catch (error) {
    console.error('Error adding device:', error);
    throw new Error('Failed to add device');
  }
}

export async function deleteDevice(_id: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const result = await devicesCollection.deleteOne({ _id: new ObjectId(sanitizeHtml(_id)), userId: session.user.id });
    if (result.deletedCount === 0) {
      throw new Error('Device not found or not authorized');
    }
  } catch (error) {
    console.error('Error deleting device:', error);
    throw new Error('Failed to delete device');
  }
}

export async function fetchCameras({
  page = 1,
  limit = 10,
  search = '',
  manufacturer = '',
  model = '',
}: {
  page?: number;
  limit?: number;
  search?: string;
  manufacturer?: string;
  model?: string;
}): Promise<{ cameras: Camera[]; totalPages: number }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const cacheKey = `cameras:${page}:${limit}:${search}:${manufacturer}:${model}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const query = {
      userId: session.user.id,
      ...(search && {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { ipAddress: { $regex: search, $options: 'i' } },
          { manufacturer: { $regex: search, $options: 'i' } },
          { model: { $regex: search, $options: 'i' } },
        ],
      }),
      ...(manufacturer && { manufacturer: { $regex: `^${manufacturer}$`, $options: 'i' } }),
      ...(model && { model: { $regex: `^${model}$`, $options: 'i' } }),
    };

    const total = await camerasCollection.countDocuments(query);
    const cameras = await camerasCollection
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    const mappedCameras: Camera[] = cameras.map((doc) => ({
      _id: doc._id.toString(),
      ipAddress: doc.ipAddress || '',
      name: doc.name || '',
      manufacturer: doc.manufacturer || '',
      model: doc.model || '',
      userId: doc.userId || session.user.id,
      ports: doc.ports || [],
      lastScanned: doc.lastScanned || '',
      shodanData: doc.shodanData || null,
      greyNoiseData: doc.greyNoiseData || null,
      vulnerabilities: doc.vulnerabilities || [],
    }));

    const result = { cameras: mappedCameras, totalPages: Math.ceil(total / limit) };
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Error fetching cameras:', error);
    throw new Error('Failed to fetch cameras');
  }
}

export async function addCamera(camera: {
  ports: number[]; // Cambiado de 'never[]' a 'number[]'
  ipAddress: string;
  name: string;
  manufacturer?: string;
  model?: string;
  lastScanned?: string;
}): Promise<Camera> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const sanitizedCamera = {
      ipAddress: sanitizeHtml(camera.ipAddress),
      name: sanitizeHtml(camera.name),
      manufacturer: camera.manufacturer ? sanitizeHtml(camera.manufacturer) : '',
      model: camera.model ? sanitizeHtml(camera.model) : '',
      userId: session.user.id,
      ports: camera.ports || [], // Asegúrate de que 'ports' nunca sea undefined
      lastScanned: camera.lastScanned || new Date().toISOString(),
      shodanData: null,
      greyNoiseData: null,
      vulnerabilities: [],
    };
    const newId = new ObjectId().toString();
    await camerasCollection.insertOne({
      _id: new ObjectId(newId),
      ...sanitizedCamera,
    });
    return { _id: newId, ...sanitizedCamera };
  } catch (error) {
    console.error('Error adding camera:', error);
    throw new Error('Failed to add camera');
  }
}

export async function deleteCamera(_id: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const result = await camerasCollection.deleteOne({ _id: new ObjectId(sanitizeHtml(_id)), userId: session.user.id });
    if (result.deletedCount === 0) {
      throw new Error('Camera not found or not authorized');
    }
  } catch (error) {
    console.error('Error deleting camera:', error);
    throw new Error('Failed to delete camera');
  }
}


export async function updateCamera(_id: string, camera: Partial<Camera>): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const sanitizedCamera = {
      ipAddress: camera.ipAddress ? sanitizeHtml(camera.ipAddress) : undefined,
      name: camera.name ? sanitizeHtml(camera.name) : undefined,
      manufacturer: camera.manufacturer ? sanitizeHtml(camera.manufacturer) : undefined,
      model: camera.model ? sanitizeHtml(camera.model) : undefined,
      lastScanned: camera.lastScanned || new Date().toISOString(),
    };
    const updateDoc = { $set: Object.fromEntries(Object.entries(sanitizedCamera).filter(([_, v]) => v !== undefined)) };
    const result = await camerasCollection.updateOne(
      { _id: new ObjectId(sanitizeHtml(_id)), userId: session.user.id },
      updateDoc
    );
    if (result.matchedCount === 0) {
      throw new Error('Camera not found or not authorized');
    }
  } catch (error) {
    console.error('Error updating camera:', error);
    throw new Error('Failed to update camera');
  }
}

export async function scanCameras(target: string = '192.168.1.0/24'): Promise<Camera[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const cacheKey = `camerascan:${target}:${session.user.id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await axios.post(
      `${process.env.NMAP_API_URL}/scan`,
      { target: sanitizeHtml(target), args: '-sS -p554,80,443,8080 --script=http-title,rtsp-methods' },
      {
        headers: {
          Authorization: `Bearer ${process.env.NMAP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data: { ip: string; hostnames: { name: string }[]; state: string; os: string; ports: { port: number; state: string; service: string; version: string }[] }[] =
      response.data;

    const cameras: Camera[] = data
      .filter((host) =>
        host.ports.some((p) => ['rtsp', 'http', 'https'].includes(p.service) || p.port === 554)
      )
      .map((host) => ({
        _id: new ObjectId().toString(),
        ipAddress: host.ip,
        name: host.hostnames[0]?.name || host.ip,
        manufacturer: host.ports.find((p) => p.version)?.version.split(' ')[0] || 'Unknown',
        model: host.ports.find((p) => p.version)?.version || 'Unknown',
        userId: session.user.id,
        ports: host.ports.map((p) => p.port),
        lastScanned: new Date().toISOString(),
        shodanData: null,
        greyNoiseData: null,
        vulnerabilities: [],
      }));

    if (cameras.length > 0) {
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(cameras));
    }

    return cameras;
  } catch (error) {
    console.error('Error scanning cameras:', error);
    throw new Error('Failed to scan cameras');
  }
}

export async function scanNetworkWithNmap(target: string, args: string = '-sS -O -sV'): Promise<{ devices: Device[] }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }
    const cacheKey = `nmap:${target}:${session.user.id}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const response = await axios.post(
      `${process.env.NMAP_API_URL}/scan`,
      { target: sanitizeHtml(target), args },
      {
        headers: {
          Authorization: `Bearer ${process.env.NMAP_API_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const data: { ip: string; hostnames: { name: string }[]; state: string; os: string; ports: { port: number; state: string; service: string; version: string }[] }[] =
      response.data;

    const devices: Device[] = data.map((host) => ({
      _id: new ObjectId().toString(),
      name: host.hostnames[0]?.name || host.ip,
      ipAddress: host.ip,
      deviceType: host.os || 'Unknown',
      group: 'Network',
      status: host.state === 'up' ? 'Online' : 'Offline',
      os: host.os,
      cpuUsage: 0,
      memoryUsage: 0,
      browsers: [],
      software: host.ports.map((p) => ({ name: p.service, version: p.version || '' })),
      cves: [],
      shodanData: null,
      greyNoiseData: null,
      geo: { lat: 0, lng: 0 },
      userId: session.user.id,
      createdAt: new Date().toISOString(),
    }));

    if (devices.length > 0) {
      await devicesCollection.insertMany(
        devices.map((device) => ({
          ...device,
          _id: new ObjectId(device._id),
        }))
      );
      await redisClient.setEx(cacheKey, 3600, JSON.stringify({ devices }));
    }

    return { devices };
  } catch (error) {
    console.error('Error scanning network with Nmap:', error);
    throw new Error('No se pudo realizar el escaneo de red');
  }
}

export async function fetchShodanData(ip: string): Promise<ShodanData | null> {
  if (!ip) return null;
  try {
    const cacheKey = `shodan:${ip}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const response = await axios.get(`https://api.shodan.io/shodan/host/${sanitizeHtml(ip)}`, {
      params: { key: SHODAN_API_KEY },
    });
    const data: ShodanData = {
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
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
    return data;
  } catch (error: any) {
    console.error('Error fetching Shodan data:', error.message);
    if (error.response?.status === 404) return null;
    throw new Error('Failed to fetch Shodan data');
  }
}

export async function fetchGreyNoiseData(ip: string): Promise<GreyNoiseData | null> {
  if (!ip) return null;
  try {
    const cacheKey = `greynoise:${ip}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const response = await axios.get(`https://api.greynoise.io/v3/community/${sanitizeHtml(ip)}`, {
      headers: { key: GREYNOISE_API_KEY },
    });
    const data: GreyNoiseData = {
      ip,
      noise: response.data.noise || false,
      riot: response.data.riot || false,
      classification: response.data.classification || 'unknown',
      name: response.data.name || '',
      lastSeen: response.data.last_seen || '',
    };
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
    return data;
  } catch (error: any) {
    console.error('Error fetching GreyNoise data:', error.message);
    if (error.response?.status === 404) return null;
    throw new Error('Failed to fetch GreyNoise data');
  }
}

export async function fetchVulnersData(product: string): Promise<{ cveId: string; severity: string; description: string; link?: string }[]> {
  if (!product) return [];
  try {
    const cacheKey = `vulners:${product}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const response = await axios.get('https://vulners.com/api/v3/search/lucene/', {
      params: {
        query: sanitizeHtml(product),
        apiKey: VULNERS_API_KEY,
      },
    });
    if (response.data.result === 'OK') {
      const data = response.data.data.search.map((item: any) => ({
        cveId: item.id,
        severity: item.cvss?.score?.toString() || 'UNKNOWN',
        description: item.title || '',
        link: item.href || '',
      }));
      await redisClient.setEx(cacheKey, 3600, JSON.stringify(data));
      return data;
    }
    return [];
  } catch (error) {
    console.error('Error fetching Vulners data:', error);
    return [];
  }
}