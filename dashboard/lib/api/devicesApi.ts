import { neon } from '@neondatabase/serverless';
import { createClient } from 'redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../api/auth/[...nextauth]';
import sanitizeHtml from 'sanitize-html';
import { Device } from '../../../types';

const sql = neon(process.env.DATABASE_URL!);
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect();

export async function fetchDevices({
  page = 1,
  limit = 10,
  search = '',
}: { page?: number; limit?: number; search?: string } = {}): Promise<{ devices: Device[]; totalPages: number }> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
    }

    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM devices WHERE user_id = $1';
    const params: any[] = [session.user.id];

    if (search) {
      query += ' AND (name ILIKE $2 OR ip_address ILIKE $2 OR device_type ILIKE $2 OR group_name ILIKE $2)';
      params.push(`%${search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const devices = await sql(query, params);
    const countResult = await sql(
      'SELECT COUNT(*) FROM devices WHERE user_id = $1' + (search ? ' AND (name ILIKE $2 OR ip_address ILIKE $2 OR device_type ILIKE $2 OR group_name ILIKE $2)' : ''),
      search ? [session.user.id, `%${search}%`] : [session.user.id]
    );
    const total = parseInt(countResult[0].count);
    const totalPages = Math.ceil(total / limit);

    const mappedDevices: Device[] = devices.map((doc) => ({
      _id: doc.id,
      name: doc.name || '',
      ipAddress: doc.ip_address || '',
      deviceType: doc.device_type || '',
      group: doc.group_name || '',
      userId: doc.user_id || session.user.id,
      status: doc.status || 'Unknown',
      os: doc.os || 'Unknown',
      cpuUsage: doc.cpu_usage || 0,
      memoryUsage: doc.memory_usage || 0,
      browsers: doc.browsers || [],
      software: doc.software || [],
      cves: doc.cves || [],
      shodanData: doc.shodan_data || null,
      greyNoiseData: doc.grey_noise_data || null,
      geo: doc.geo || { lat: 0, lng: 0 },
      createdAt: doc.created_at ? new Date(doc.created_at).toISOString() : new Date().toISOString(),
    }));

    return { devices: mappedDevices, totalPages };
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
}): Promise<Device> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
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

    const result = await sql(
      `INSERT INTO devices (name, ip_address, device_type, group_name, user_id, status, os, cpu_usage, memory_usage, browsers, software, cves, shodan_data, grey_noise_data, geo, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
       RETURNING *`,
      [
        sanitizedDevice.name,
        sanitizedDevice.ipAddress,
        sanitizedDevice.deviceType,
        sanitizedDevice.group,
        sanitizedDevice.userId,
        sanitizedDevice.status,
        sanitizedDevice.os,
        sanitizedDevice.cpuUsage,
        sanitizedDevice.memoryUsage,
        JSON.stringify(sanitizedDevice.browsers),
        JSON.stringify(sanitizedDevice.software),
        JSON.stringify(sanitizedDevice.cves),
        sanitizedDevice.shodanData,
        sanitizedDevice.greyNoiseData,
        JSON.stringify(sanitizedDevice.geo),
        sanitizedDevice.createdAt,
      ]
    );

    const newDevice = result[0];
    return {
      _id: newDevice.id,
      ...sanitizedDevice,
    };
  } catch (error) {
    console.error('Error al añadir dispositivo:', error);
    throw new Error('No se pudo añadir el dispositivo');
  }
}

export async function deleteDevice(_id: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
    }

    const result = await sql('DELETE FROM devices WHERE id = $1 AND user_id = $2 RETURNING *', [sanitizeHtml(_id), session.user.id]);
    if (result.length === 0) {
      throw new Error('Dispositivo no encontrado o no autorizado');
    }
  } catch (error) {
    console.error('Error al eliminar dispositivo:', error);
    throw new Error('No se pudo eliminar el dispositivo');
  }
}