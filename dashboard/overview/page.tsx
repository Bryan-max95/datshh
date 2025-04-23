/* src/app/dashboard/overview/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SummaryWidget from '../components/widgets/KPIWidget';
import MapWidget from '../components/widgets/MapWidget';
import ThreatChart from '../components/widgets/ThreatChart';
import ShodanWidget from '../components/widgets/ShodanWidget';
import GreyNoiseWidget from '../components/widgets/GreyNoiseWidget';
import ComplianceWidget from '../components/widgets/ComplianceWidget';
import { fetchDevices, fetchSummary } from '../lib/api';
import { Device, SummaryData } from '../../types';
import { useSession } from 'next-auth/react';

export default function DashboardOverview() {
  const { data: session, status } = useSession();
  const [selectedIP, setSelectedIP] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    async function loadData() {
      if (status === 'authenticated') {
        try {
          const [fetchedDevices, summary] = await Promise.all([
            fetchDevices(),
            fetchSummary({ timeRange }), // ✅ Corrección aquí
          ]);
          setDevices(fetchedDevices);
          setSummaryData(summary);
          if (fetchedDevices.length > 0) {
            setSelectedIP(fetchedDevices[0].ipAddress);
          }
          setError('');
        } catch (err) {
          setError('Failed to load dashboard data');
          console.error('Error fetching data:', err);
        }
      }
    }
    loadData();
  }, [status, timeRange]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  if (status === 'loading') {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  if (status !== 'authenticated') {
    return <div className="text-red-500 p-6">Please log in to view the dashboard.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">Dashboard Overview</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryWidget data={summaryData} onTimeRangeChange={handleTimeRangeChange} />
        <MapWidget />
        <ThreatChart timeRange={timeRange} />
        <ShodanWidget ip={selectedIP} />
        <GreyNoiseWidget ip={selectedIP} />
        <ComplianceWidget complianceData={[] /* Fetch from policies endpoint if needed */} />
      </div>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Select Device</h2>
        {devices.length === 0 ? (
          <p className="text-gray-400">No devices available.</p>
        ) : (
          <select
            value={selectedIP}
            onChange={(e) => setSelectedIP(e.target.value)}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 w-full"
          >
            {devices.map((device) => (
              <option key={device._id} value={device.ipAddress}>
                {device.name} ({device.ipAddress})
              </option>
            ))}
          </select>
        )}
      </div>
    </motion.div>
  );
}
