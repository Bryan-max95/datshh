'use client';

import { motion } from 'framer-motion';
import TokenGuard from '../../components/TokenGuard';

export default function Compliance() {
  return (
    <TokenGuard>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
        <h1 className="text-3xl font-bold text-[#8B0000]">Compliance</h1>
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <p className="text-gray-500">Compliance dashboard coming soon...</p>
          {/* TODO: Añadir ComplianceWidget, PolicyWidget, etc. */}
        </div>
      </motion.div>
    </TokenGuard>
  );
}