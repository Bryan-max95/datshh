/* src/app/dashboard/components/widgets/ShodanWidget.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { fetchShodanData } from '../../lib/api';
import { ShodanWidgetProps, ShodanData } from '../../../types';

export default function ShodanWidget({ ip }: ShodanWidgetProps) {
  const [data, setData] = useState<ShodanData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      if (!ip) return;
      try {
        setLoading(true);
        const shodanData = await fetchShodanData(ip);
        setData(shodanData);
        setError('');
      } catch (err) {
        setError('Failed to load Shodan data');
        console.error('Error fetching Shodan data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [ip]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Shodan Data</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : !data ? (
        <p className="text-gray-400">No Shodan data available for IP: {ip}</p>
      ) : (
        <div className="space-y-2 text-gray-400">
          <p><strong>IP:</strong> {data.ip}</p>
          <p><strong>Ports:</strong> {data.ports.join(', ') || 'None'}</p>
          <p><strong>CPEs:</strong> {data.cpes.join(', ') || 'None'}</p>
          <p><strong>Vulnerabilities:</strong> {data.vulns.join(', ') || 'None'}</p>
          <p><strong>Tags:</strong> {data.tags.join(', ') || 'None'}</p>
          <p><strong>Product:</strong> {data.product || 'Unknown'}</p>
          <p><strong>Version:</strong> {data.version || 'Unknown'}</p>
          <p><strong>Hostnames:</strong> {data.hostnames?.join(', ') || 'None'}</p>
          <p><strong>OS:</strong> {data.os || 'Unknown'}</p>
          <p><strong>Organization:</strong> {data.org || 'Unknown'}</p>
        </div>
      )}
    </motion.div>
  );
}