import { neon } from '@neondatabase/serverless';
import { createClient } from 'redis';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../api/auth/[...nextauth]';
import sanitizeHtml from 'sanitize-html';
import axios from 'axios';
import { Camera } from '../../../types';

const sql = neon(process.env.DATABASE_URL!);
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });
redisClient.connect();

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
      throw new Error('No autorizado');
    }

    const cacheKey = `cameras:${page}:${limit}:${search}:${manufacturer}:${model}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM cameras WHERE user_id = $1';
    const params: any[] = [session.user.id];
    let paramIndex = 2;

    if (search) {
      query += ` AND (name ILIKE $${paramIndex} OR ip_address ILIKE $${paramIndex} OR manufacturer ILIKE $${paramIndex} OR model ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (manufacturer) {
      query += ` AND manufacturer ILIKE $${paramIndex}`;
      params.push(manufacturer);
      paramIndex++;
    }
    if (model) {
      query += ` AND model ILIKE $${paramIndex}`;
      params.push(model);
      paramIndex++;
    }

    query += ` ORDER BY last_scanned DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const cameras = await sql(query, params);
    const countResult = await sql(
      'SELECT COUNT(*) FROM cameras WHERE user_id = $1' +
        (search ? ' AND (name ILIKE $2 OR ip_address ILIKE $2 OR manufacturer ILIKE $2 OR model ILIKE $2)' : '') +
        (manufacturer ? ' AND manufacturer ILIKE $' + (search ? '3' : '2') : '') +
        (model ? ' AND model ILIKE $' + (manufacturer ? (search ? '4' : '3') : (search ? '3' : '2')) : ''),
      [
        session.user.id,
        ...(search ? [`%${search}%`] : []),
        ...(manufacturer ? [manufacturer] : []),
        ...(model ? [model] : []),
      ]
    );
    const total = parseInt(countResult[0].count);
    const totalPages = Math.ceil(total / limit);

    const mappedCameras: Camera[] = cameras.map((doc) => ({
      _id: doc.id,
      ipAddress: doc.ip_address || '',
      name: doc.name || '',
      manufacturer: doc.manufacturer || '',
      model: doc.model || '',
      userId: doc.user_id || session.user.id,
      ports: doc.ports || [],
      lastScanned: doc.last_scanned ? new Date(doc.last_scanned).toISOString() : '',
      shodanData: doc.shodan_data || null,
      greyNoiseData: doc.grey_noise_data || null,
      vulnerabilities: doc.vulnerabilities || [],
    }));

    const result = { cameras: mappedCameras, totalPages };
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
    return result;
  } catch (error) {
    console.error('Error al obtener cámaras:', error);
    throw new Error('No se pudieron obtener las cámaras');
  }
}

export async function addCamera(camera: {
  ports: number[];
  ipAddress: string;
  name: string;
  manufacturer?: string;
  model?: string;
  lastScanned?: string;
}): Promise<Camera> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
    }

    const sanitizedCamera = {
      ipAddress: sanitizeHtml(camera.ipAddress),
      name: sanitizeHtml(camera.name),
      manufacturer: camera.manufacturer ? sanitizeHtml(camera.manufacturer) : '',
      model: camera.model ? sanitizeHtml(camera.model) : '',
      userId: session.user.id,
      ports: camera.ports || [],
      lastScanned: camera.lastScanned || new Date().toISOString(),
      shodanData: null,
      greyNoiseData: null,
      vulnerabilities: [],
    };

    const result = await sql(
      `INSERT INTO cameras (ip_address, name, manufacturer, model, user_id, ports, last_scanned, shodan_data, grey_noise_data, vulnerabilities)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        sanitizedCamera.ipAddress,
        sanitizedCamera.name,
        sanitizedCamera.manufacturer,
        sanitizedCamera.model,
        sanitizedCamera.userId,
        JSON.stringify(sanitizedCamera.ports),
        sanitizedCamera.lastScanned,
        sanitizedCamera.shodanData,
        sanitizedCamera.greyNoiseData,
        JSON.stringify(sanitizedCamera.vulnerabilities),
      ]
    );

    const newCamera = result[0];
    return {
      _id: newCamera.id,
      ...sanitizedCamera,
    };
  } catch (error) {
    console.error('Error al añadir cámara:', error);
    throw new Error('No se pudo añadir la cámara');
  }
}

export async function updateCamera(_id: string, camera: Partial<Camera>): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
    }

    const sanitizedCamera = {
      ipAddress: camera.ipAddress ? sanitizeHtml(camera.ipAddress) : undefined,
      name: camera.name ? sanitizeHtml(camera.name) : undefined,
      manufacturer: camera.manufacturer ? sanitizeHtml(camera.manufacturer) : undefined,
      model: camera.model ? sanitizeHtml(camera.model) : undefined,
      lastScanned: camera.lastScanned || new Date().toISOString(),
    };

    const updates: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (sanitizedCamera.ipAddress) {
      updates.push(`ip_address = $${paramIndex++}`);
      params.push(sanitizedCamera.ipAddress);
    }
    if (sanitizedCamera.name) {
      updates.push(`name = $${paramIndex++}`);
      params.push(sanitizedCamera.name);
    }
    if (sanitizedCamera.manufacturer) {
      updates.push(`manufacturer = $${paramIndex++}`);
      params.push(sanitizedCamera.manufacturer);
    }
    if (sanitizedCamera.model) {
      updates.push(`model = $${paramIndex++}`);
      params.push(sanitizedCamera.model);
    }
    updates.push(`last_scanned = $${paramIndex++}`);
    params.push(sanitizedCamera.lastScanned);

    if (updates.length === 0) {
      throw new Error('No hay campos para actualizar');
    }

    params.push(sanitizeHtml(_id), session.user.id);
    const query = `UPDATE cameras SET ${updates.join(', ')} WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1} RETURNING *`;

    const result = await sql(query, params);
    if (result.length === 0) {
      throw new Error('Cámara no encontrada o no autorizada');
    }
  } catch (error) {
    console.error('Error al actualizar cámara:', error);
    throw new Error('No se pudo actualizar la cámara');
  }
}

export async function deleteCamera(_id: string): Promise<void> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
    }

    const result = await sql('DELETE FROM cameras WHERE id = $1 AND user_id = $2 RETURNING *', [sanitizeHtml(_id), session.user.id]);
    if (result.length === 0) {
      throw new Error('Cámara no encontrada o no autorizada');
    }
  } catch (error) {
    console.error('Error al eliminar cámara:', error);
    throw new Error('No se pudo eliminar la cámara');
  }
}

export async function scanCameras(target: string = '192.168.1.0/24'): Promise<Camera[]> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      throw new Error('No autorizado');
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
        _id: '', // Será generado por la base de datos
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
      const inserted = await sql(
        `INSERT INTO cameras (ip_address, name, manufacturer, model, user_id, ports, last_scanned, shodan_data, grey_noise_data, vulnerabilities)
         SELECT * FROM jsonb_to_recordset($1::jsonb) AS (ip_address TEXT, name TEXT, manufacturer TEXT, model TEXT, user_id TEXT, ports JSONB, last_scanned TEXT, shodan_data JSONB, grey_noise_data JSONB, vulnerabilities JSONB)
         RETURNING *`,
        [JSON.stringify(cameras.map((c) => ({ ...c, _id: undefined })))]
      );

      cameras.forEach((camera, index) => {
        camera._id = inserted[index].id;
      });

      await redisClient.setEx(cacheKey, 3600, JSON.stringify(cameras));
    }

    return cameras;
  } catch (error) {
    console.error('Error al escanear cámaras:', error);
    throw new Error('No se pudo realizar el escaneo de cámaras');
  }
}