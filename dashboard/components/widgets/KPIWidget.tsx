/* src/app/dashboard/components/widgets/KPIWidget.tsx */
'use client';

import { motion } from 'framer-motion';
import { KPIWidgetProps } from '../../../types';

export default function KPIWidget({ data, onTimeRangeChange }: KPIWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Indicadores Clave</h2>
      <div className="space-y-2">
        <select
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 mb-4"
        >
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
          <option value="90d">Últimos 90 días</option>
        </select>
        {data ? (
          <>
            <p>Dispositivos Monitoreados: <span className="text-[#8B0000]">{data.monitoredDevices}</span></p>
            <p>Cámaras Monitoreadas: <span className="text-[#8B0000]">{data.monitoredCameras}</span></p>
            <p>Total CVE: <span className="text-[#8B0000]">{data.totalCves}</span></p>
            <p>CVE Críticos: <span className="text-red-500">{data.criticalCves}</span></p>
          </>
        ) : (
          <p className="text-gray-400">Cargando datos...</p>
        )}
      </div>
    </motion.div>
  );
}