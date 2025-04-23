/* src/app/dashboard/compliance/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ComplianceWidget from '../components/widgets/ComplianceWidget';
import { fetchPolicies } from '../lib/api';
import { Policy } from '../../types';
import { useSession } from 'next-auth/react';

export default function CompliancePage() {
  const { data: session, status } = useSession();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadPolicies() {
      if (status === 'authenticated') {
        try {
          const data = await fetchPolicies();
          setPolicies(data);
          setError('');
        } catch (err) {
          setError('Failed to load policies');
          console.error('Error fetching policies:', err);
        }
      }
    }
    loadPolicies();
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
      <h1 className="text-3xl font-bold text-[#8B0000]">Compliance</h1>
      {error && <p className="text-red-500">{error}</p>}
      <ComplianceWidget complianceData={policies.map((policy) => ({
        _id: policy._id,
        standard: policy.name,
        status: policy.status === 'Activa' ? 'Cumple' : 'No Cumple',
        lastChecked: new Date().toISOString(),
      }))} />
    </motion.div>
  );
}