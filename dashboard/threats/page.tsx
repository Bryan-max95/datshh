/* src/app/dashboard/threats/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ThreatTable from '../components/widgets/ThreatTable';
import { fetchThreats } from '../lib/api';
import { Threat } from '../../types';
import { useSession } from 'next-auth/react';

export default function ThreatsPage() {
  const { data: session, status } = useSession();
  const [threats, setThreats] = useState<Threat[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadThreats() {
      if (status === 'authenticated') {
        try {
          const data = await fetchThreats();
          setThreats(data);
          setError('');
        } catch (err) {
          setError('Failed to load threats');
          console.error('Error fetching threats:', err);
        }
      }
    }
    loadThreats();
  }, [status]);

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
      <h1 className="text-3xl font-bold text-[#8B0000]">Threats</h1>
      {error && <p className="text-red-500">{error}</p>}
      <ThreatTable threats={threats} />
    </motion.div>
  );
}