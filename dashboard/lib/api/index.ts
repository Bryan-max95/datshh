/* src/app/dashboard/lib/api/index.ts */
import axios from 'axios';
import { createClient } from 'redis';
import sanitizeHtml from 'sanitize-html';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redisClient.on('error', (err: any) => console.error('Redis Client Error', err));
redisClient.connect();

export const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Interceptors for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.message);
    throw new Error(error.response?.data?.error || 'API request failed');
  }
);

export const cache = async <T>(key: string, fetchFn: () => Promise<T>, ttl: number = 3600): Promise<T> => {
  const cached = await redisClient.get(key);
  if (cached) {
    return JSON.parse(cached);
  }
  const data = await fetchFn();
  await redisClient.setEx(key, ttl, JSON.stringify(data));
  return data;
};

export const sanitize = (input: any): any => {
  if (typeof input === 'string') {
    return sanitizeHtml(input);
  }
  if (Array.isArray(input)) {
    return input.map(sanitize);
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitize(input[key]);
    }
    return sanitized;
  }
  return input;
};

export * from './camerasApi';
export * from './devicesApi';
export * from './policiesApi';