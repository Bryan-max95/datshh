/* src/app/dashboard/lib/api/devicesApi.ts */
import { axiosInstance, cache, sanitize } from '../../lib/api/index';
import { Device } from '../../../types';

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
  return cache(cacheKey, async () => {
    const response = await axiosInstance.get('/equipos', {
      params: sanitize({ page, limit, search }),
    });
    return response.data;
  });
}

export async function addDevice(device: {
  name: string;
  ipAddress: string;
  deviceType: string;
  group: string;
}): Promise<Device> {
  const response = await axiosInstance.post('/equipos', sanitize(device));
  return response.data;
}

export async function deleteDevice(_id: string): Promise<void> {
  await axiosInstance.delete('/equipos', {
    data: sanitize({ _id }),
  });
}