/* src/app/dashboard/components/widgets/ThreatChart.tsx */
'use client';

import { motion } from 'framer-motion';
import { ThreatChartProps } from '../../../types';

export default function ThreatChart({ timeRange }: ThreatChartProps) {
  // Simulación de datos para el gráfico (puedes usar Chart.js o similar)
  const threats = [
    { id: 1, type: 'Malware', risk: 'Crítico', timestamp: '2025-04-20' },
    { id: 2, type: 'Phishing', risk: 'Alto', timestamp: '2025-04-21' },
  ].filter((threat) => {
    // Filtrar por timeRange (lógica de ejemplo)
    const date = new Date(threat.timestamp);
    const now = new Date();
    if (timeRange === '7d') {
      return date >= new Date(now.setDate(now.getDate() - 7));
    } else if (timeRange === '30d') {
      return date >= new Date(now.setDate(now.getDate() - 30));
    } else if (timeRange === '90d') {
      return date >= new Date(now.setDate(now.getDate() - 90));
    }
    return true;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Gráfico de Amenazas ({timeRange})</h2>
      <div className="space-y-2">
        {threats.length > 0 ? (
          threats.map((threat) => (
            <p key={threat.id} className="text-white">
              {threat.type} - {threat.risk} ({threat.timestamp})
            </p>
          ))
        ) : (
          <p className="text-gray-400">No hay amenazas para el rango seleccionado.</p>
        )}
      </div>
    </motion.div>
  );
}