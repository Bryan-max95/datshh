/* src/app/dashboard/components/EmptyState.tsx */
'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';

interface EmptyStateProps {
  message: string;
}

export default function EmptyState({ message }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center p-6 text-gray-400"
    >
      <AlertCircle className="w-12 h-12 mb-4" />
      <p>{message}</p>
    </motion.div>
  );
}