/* src/app/dashboard/incidents/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import IncidentTable from '../components/widgets/IncidentTable';
import { fetchIncidents } from '../lib/api';
import { Incident } from '../../types';
import { useSession } from 'next-auth/react';

export default function IncidentsPage() {
  const { data: session, status } = useSession();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadIncidents() {
      if (status === 'authenticated') {
        try {
          const data = await fetchIncidents();
          setIncidents(data);
          setError('');
        } catch (err) {
          setError('Failed to load incidents');
          console.error('Error fetching incidents:', err);
        }
      }
    }
    loadIncidents();
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
      <h1 className="text-3xl font-bold text-[#8B0000]">Incidents</h1>
      {error && <p className="text-red-500">{error}</p>}
      <IncidentTable incidents={incidents} />
    </motion.div>
  );
}