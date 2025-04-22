/* src/app/dashboard/compliance/page.tsx */
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import ComplianceWidget from '../components/widgets/ComplianceWidget';
import { Compliance } from '../../types';
import { useSession } from 'next-auth/react';

export default function Compliance() {
  const { data: session, status } = useSession();
  const [complianceData, setComplianceData] = useState<Compliance[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCompliance() {
      if (status === 'authenticated') {
        try {
          const response = await fetch('/api/compliance', {
            headers: { Authorization: `Bearer ${session.accessToken}` },
          });
          if (!response.ok) throw new Error('Error al cargar datos de cumplimiento');
          const data = await response.json();
          setComplianceData(data);
        } catch (err) {
          setError('Error al cargar datos de cumplimiento');
          console.error(err);
        }
      }
    }
    fetchCompliance();
  }, [status, session]);

  if (status === 'loading') return <div className="text-gray-400">Cargando...</div>;
  if (status !== 'authenticated') return <div className="text-red-500">Inicia sesión para continuar.</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 max-w-7xl mx-auto bg-[#1A1A1A] rounded-lg"
    >
      <h1 className="text-2xl font-bold text-[#8B0000] mb-4">Cumplimiento</h1>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <ComplianceWidget complianceData={complianceData} />
    </motion.div>
  );
}