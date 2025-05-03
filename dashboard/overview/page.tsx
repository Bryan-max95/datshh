'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SummaryWidget from '../components/widgets/KPIWidget';
import MapWidget from '../components/widgets/MapWidget';
import ThreatChart from '../components/widgets/ThreatChart';
import ShodanWidget from '../components/widgets/ShodanWidget';
import GreyNoiseWidget from '../components/widgets/GreyNoiseWidget';
import ComplianceWidget from '../components/widgets/ComplianceWidget';
import { fetchDevices, fetchSummary, fetchPolicies } from '../lib/api';
import { Device, SummaryData, Policy, Compliance } from '../../types';

export default function DashboardOverview() {
  const [selectedIP, setSelectedIP] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [complianceData, setComplianceData] = useState<Compliance[]>([]);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState('30');

  useEffect(() => {
    async function loadData() {
      try {
        const [fetchedDevices, summary, policies] = await Promise.all([
          fetchDevices(),
          fetchSummary({ timeRange }),
          fetchPolicies({ timeRange }),
        ]);
        setDevices(fetchedDevices);
        setSummaryData(summary);
        setComplianceData(
          policies.map((policy: Policy) => ({
            _id: policy._id,
            standard: policy.name,
            status: policy.status === 'Activa' ? 'Cumple' : 'No Cumple',
            lastChecked: new Date().toISOString(),
          }))
        );
        if (fetchedDevices.length > 0) {
          setSelectedIP(fetchedDevices[0].ipAddress);
        }
        setError('');
      } catch (err) {
        setError('Error al cargar los datos del dashboard');
        console.error('Error al obtener datos:', err);
      }
    }
    loadData();
  }, [timeRange]);

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-red-800">Resumen del Dashboard</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <SummaryWidget data={summaryData} onTimeRangeChange={handleTimeRangeChange} />
        <MapWidget />
        <ThreatChart timeRange={timeRange} />
        <ShodanWidget ip={selectedIP} />
        <GreyNoiseWidget ip={selectedIP} />
        <ComplianceWidget complianceData={complianceData} />
      </div>
      <div className="bg-gray-800 p-6 rounded-lg border border-[#1E3A8A]/50">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">Seleccionar Dispositivo</h2>
        {devices.length === 0 ? (
          <p className="text-gray-400">No hay dispositivos disponibles.</p>
        ) : (
          <select
            value={selectedIP}
            onChange={(e) => setSelectedIP(e.target.value)}
            className="bg-gray-900 text-white border border-[#1E3A8A]/50 rounded px-3 py-2 w-full"
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