/* src/app/dashboard/compliance/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ComplianceWidget from '../components/widgets/ComplianceWidget';
import { fetchPolicies } from '../lib/api';
import { Policy, Compliance } from '../../types';
import { useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CompliancePage() {
  const { data: session, status } = useSession();
  const [timeRange, setTimeRange] = useState('30');

  const { data: policies, error, isLoading } = useQuery({
    queryKey: ['policies', timeRange],
    queryFn: async () => {
      const data = await fetchPolicies({ timeRange });
      return data;
    },
    enabled: status === 'authenticated',
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  useEffect(() => {
    if (error) {
      toast.error('Failed to load policies');
      console.error('Error fetching policies:', error);
    }
  }, [error]);

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Loading...
      </div>
    );
  }

  if (status !== 'authenticated') {
    return <div className="text-red-500 p-6">Please log in to continue.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 space-y-6"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-[#8B0000]">Compliance</h1>
      <div className="bg-[#2D2D2D] p-4 sm:p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Filter by Time Range</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 w-full sm:w-auto"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Loading policies...
        </div>
      ) : (
        <ComplianceWidget
          complianceData={policies?.map((policy: Policy) => ({
            _id: policy._id,
            standard: policy.name,
            status: policy.status === 'Activa' ? 'Cumple' : 'No Cumple',
            lastChecked: new Date().toISOString(),
          })) || []}
        />
      )}
    </motion.div>
  );
}