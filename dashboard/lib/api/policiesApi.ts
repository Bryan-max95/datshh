/* src/app/dashboard/lib/api/policiesApi.ts */
import { axiosInstance, cache, sanitize } from '../../lib/api/index';
import { Policy } from '../../../types';

interface FetchPoliciesParams {
  timeRange?: string;
}

export async function fetchPolicies({ timeRange = '30' }: FetchPoliciesParams): Promise<Policy[]> {
  const cacheKey = `policies:${timeRange}`;
  return cache(cacheKey, async () => {
    const response = await axiosInstance.get('/policies', {
      params: sanitize({ timeRange }),
    });
    return response.data;
  });
}