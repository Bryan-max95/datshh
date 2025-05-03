
import { MongoClient, ObjectId } from 'mongodb';
import { createClient } from 'redis';
import { Device } from '../../../types';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../api/auth/[...nextauth]';
import sanitizeHtml from 'sanitize-html';

const mongoClient = new MongoClient(process.env.MONGODB_URI || 'mongodb+srv://<username>:<password>@cluster0.mongodb.net/cybersecurity_dashboard?retryWrites=true&w=majority');
const redisClient = createClient({ url: process.env.REDIS_URL || 'redis://localhost:6379' });

mongoClient.connect();
redisClient.connect();

const db = mongoClient.db('cybersecurity_dashboard');
const devicesCollection = db.collection('devices');

interface FetchDevicesParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchDevices({
  page = 1,
  limit = 10,
  search = '',
}: FetchDevicesParams): Promise<{ devices: Device[]; totalPages: number }> {
  const cacheKey = `devices:${page}:${limit}:${search}`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }

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

  try {
    const total = await devicesCollection.countDocuments(query);
    const devices = await devicesCollection
      .find(query)
      .skip((page - 1) * limit)
      .limit(limit)
      .toArray();

    // Explicitly map MongoDB documents to Device type
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

    const result = { devices: mappedDevices, totalPages: Math.ceil(total / limit) };
    await redisClient.setEx(cacheKey, 3600, JSON.stringify(result));
    return result;
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

  try {
    const newId = new ObjectId().toString();
    await devicesCollection.insertOne({ _id: new ObjectId(newId), ...sanitizedDevice });
    return { _id: newId, ...sanitizedDevice };
  } catch (error) {
    console.error('Error adding device:', error);
    throw new Error('Failed to add device');
  }
}

export async function deleteDevice(_id: string): Promise<void> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  try {
    const result = await devicesCollection.deleteOne({ _id: new ObjectId(sanitizeHtml(_id)), userId: session.user.id });
    if (result.deletedCount === 0) {
      throw new Error('Device not found or not authorized');
    }
  } catch (error) {
    console.error('Error deleting device:', error);
    throw new Error('Failed to delete device');
  }
}