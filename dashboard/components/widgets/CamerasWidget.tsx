/* src/app/dashboard/components/widgets/CamerasWidget.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Camera } from '../../../types';
import { fetchCameras } from '../../lib/api';

export default function CamerasWidget() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadCameras = async () => {
      try {
        const data = await fetchCameras();
        setCameras(data);
        setError('');
      } catch (error) {
        setError('Error al cargar cámaras');
        console.error(error);
      }
    };
    loadCameras();
  }, []);

  const criticalVulnerabilities = cameras.reduce(
    (sum, camera) => sum + (camera.vulnerabilities?.filter((v) => v.severity === 'CRITICAL').length || 0),
    0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Cámaras IP</h2>
      {error && <p className="text-red-500">{error}</p>}
      <div className="space-y-2">
        <p>Total de Cámaras: <span className="text-[#8B0000]">{cameras.length}</span></p>
        <p>Vulnerabilidades Críticas: <span className="text-red-500">{criticalVulnerabilities}</span></p>
      </div>
    </motion.div>
  );
}