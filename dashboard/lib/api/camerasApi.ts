/* src/app/dashboard/lib/api/camerasApi.ts */
import { axiosInstance, cache, sanitize } from './index';
import { Camera, ShodanData, GreyNoiseData } from '../../../types';

interface FetchCamerasParams {
  page?: number;
  limit?: number;
  search?: string;
}

export async function fetchCameras({
  page = 1,
  limit = 10,
  search = '',
}: FetchCamerasParams): Promise<{ cameras: Camera[]; totalPages: number }> {
  const cacheKey = `cameras:${page}:${limit}:${search}`;
  return cache(cacheKey, async () => {
    const response = await axiosInstance.get('/cameras', {
      params: sanitize({ page, limit, search }),
    });
    // Ensure the response data matches FetchCamerasResponse
    const data = response.data;
    if (!data || !Array.isArray(data.cameras) || typeof data.totalPages !== 'number') {
      throw new Error('Invalid response structure from /cameras API');
    }
    return {
      cameras: data.cameras,
      totalPages: data.totalPages,
    };
  });
}

export async function addCamera(camera: {
  ipAddress: string;
  name: string;
  manufacturer?: string;
  model?: string;
  lastScanned?: string;
}): Promise<Camera> {
  const response = await axiosInstance.post('/cameras', sanitize(camera));
  return response.data;
}

export async function deleteCamera(_id: string): Promise<void> {
  await axiosInstance.delete('/cameras', {
    data: sanitize({ _id }),
  });
}

export async function scanCameras(): Promise<Camera[]> {
  const response = await axiosInstance.post('/cameras/scan');
  return response.data;
}

export async function fetchShodanData(ip: string): Promise<ShodanData | null> {
  try {
    const response = await axiosInstance.get(`/shodan/${ip}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function fetchGreyNoiseData(ip: string): Promise<GreyNoiseData | null> {
  try {
    const response = await axiosInstance.get(`/greynoise/${ip}`);
    return response.data || null;
  } catch {
    return null;
  }
}

export async function fetchVulnersData(query: string): Promise<Array<{ cveId: string; severity: string; description: string; link?: string }>> {
  try {
    const response = await axiosInstance.get(`/vulners`, { params: { query } });
    return response.data || [];
  } catch {
    return [];
  }
}