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
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Key Metrics</h2>
      <div className="mb-4">
        <select
          onChange={(e) => onTimeRangeChange(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
        >
          <option value="7">Last 7 Days</option>
          <option value="30">Last 30 Days</option>
          <option value="90">Last 90 Days</option>
        </select>
      </div>
      {data ? (
        <div className="grid grid-cols-2 gap-4 text-gray-400">
          <div>
            <p className="text-sm">Monitored Devices</p>
            <p className="text-xl font-bold text-white">{data.monitoredDevices}</p>
          </div>
          <div>
            <p className="text-sm">Monitored Cameras</p>
            <p className="text-xl font-bold text-white">{data.monitoredCameras}</p>
          </div>
          <div>
            <p className="text-sm">Total CVEs</p>
            <p className="text-xl font-bold text-white">{data.totalCves}</p>
          </div>
          <div>
            <p className="text-sm">Critical CVEs</p>
            <p className="text-xl font-bold text-red-500">{data.criticalCves}</p>
          </div>
        </div>
      ) : (
        <p className="text-gray-400">No data available.</p>
      )}
    </motion.div>
  );
}