'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import ComplianceWidget from '../components/widgets/ComplianceWidget';
import { fetchPolicies } from '../lib/api';
import { Policy, Compliance } from '../../types';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';

export default function CompliancePage() {
  const [timeRange, setTimeRange] = useState('30');

  // Obtener políticas usando react-query
  const { data: policies, error, isLoading } = useQuery({
    queryKey: ['policies', timeRange],
    queryFn: async () => {
      const data = await fetchPolicies({ timeRange });
      return data;
    },
    staleTime: 5 * 60 * 1000, // Cache de 5 minutos
  });

  // Manejar errores al cargar políticas
  useEffect(() => {
    if (error) {
      toast.error('Error al cargar las políticas');
      console.error('Error al obtener políticas:', error);
    }
  }, [error]);

  // Mostrar estado de carga inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-gray-400">
        <Loader2 className="w-8 h-8 animate-spin mr-2" />
        Cargando...
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-4 sm:p-6 space-y-6"
    >
      <h1 className="text-2xl sm:text-3xl font-bold text-[#8B0000]">Cumplimiento</h1>
      <div className="bg-[#2D2D2D] p-4 sm:p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Filtrar por Rango de Tiempo</h2>
        <select
          value={timeRange}
          onChange={(e) => setTimeRange(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 w-full sm:w-auto"
        >
          <option value="7">Últimos 7 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
        </select>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center text-gray-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" />
          Cargando políticas...
        </div>
      ) : (
        <ComplianceWidget
          complianceData={
            policies?.map((policy: Policy) => ({
              _id: policy._id,
              standard: policy.name,
              status: policy.status === 'Activa' ? 'Cumple' : 'No Cumple',
              lastChecked: new Date().toISOString(),
            })) || []
          }
        />
      )}
    </motion.div>
  );
}