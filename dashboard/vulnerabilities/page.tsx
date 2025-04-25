/* src/app/dashboard/vulnerabilities/page.tsx */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import VulnerabilityTable from '../components/widgets/VulnerabilityTable';
import { useSession } from 'next-auth/react';

export default function VulnerabilitiesPage() {
  const { data: session, status } = useSession();
  const [timeRange, setTimeRange] = useState('30');

  if (status === 'loading') {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  if (status !== 'authenticated') {
    return <div className="text-red-500 p-6">Please log in to continue.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">Vulnerabilities</h1>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Filter by Time Range</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
      <VulnerabilityTable timeRange={timeRange} />
    </motion.div>
  );
}