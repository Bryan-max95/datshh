/* src/app/dashboard/reports/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ReportWidget from '../components/widgets/ReportWidget';
import { fetchReports } from '../lib/api';
import { Report } from '../../types';
import { useSession } from 'next-auth/react';

export default function ReportsPage() {
  const { data: session, status } = useSession();
  const [reports, setReports] = useState<Report[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReports() {
      if (status === 'authenticated') {
        try {
          const data = await fetchReports();
          setReports(data);
          setError('');
        } catch (err) {
          setError('Failed to load reports');
          console.error('Error fetching reports:', err);
        }
      }
    }
    loadReports();
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
      <h1 className="text-3xl font-bold text-[#8B0000]">Reports</h1>
      {error && <p className="text-red-500">{error}</p>}
      <ReportWidget reports={reports} />
    </motion.div>
  );
}