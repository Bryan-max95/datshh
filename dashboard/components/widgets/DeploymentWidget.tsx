/* src/app/dashboard/components/widgets/DeploymentWidget.tsx */
'use client';

import { motion } from 'framer-motion';
import { Trash2 } from 'lucide-react';
import { DeploymentWidgetProps } from '../../../types';

export default function DeploymentWidget({ devices, onDelete }: DeploymentWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Deployed Devices</h2>
      {devices.length === 0 ? (
        <p className="text-gray-400">No devices deployed.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>IP</th>
                <th>Type</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device._id}>
                  <td>{device.name}</td>
                  <td>{device.ipAddress}</td>
                  <td>{device.deviceType}</td>
                  <td>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      onClick={() => onDelete(device._id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </motion.button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}