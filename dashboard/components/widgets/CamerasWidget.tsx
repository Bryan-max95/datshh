/* src/app/dashboard/components/widgets/CamerasWidget.tsx */
'use client';

import { motion } from 'framer-motion';
import { CamerasWidgetProps } from '../../../types';

export default function CamerasWidget({ cameras }: CamerasWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">IP Cameras</h2>
      {cameras.length === 0 ? (
        <p className="text-gray-400">No cameras found.</p>
      ) : (
        <div>
          <p className="text-white">Total Cameras: {cameras.length}</p>
          <ul className="mt-2 space-y-2">
            {cameras.slice(0, 5).map((camera) => (
              <li key={camera._id} className="text-gray-400">
                {camera.name} ({camera.ipAddress})
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}