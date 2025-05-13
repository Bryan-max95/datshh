/* src/app/dashboard/components/widgets/TokenInput.tsx */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { TokenInputProps } from '../../../types';
import { validateToken } from '../../lib/api';

export default function TokenInput({ onTokenChange }: TokenInputProps) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleValidate = async () => {
    if (!token) {
      setError('Please enter a token');
      return;
    }
    try {
      setLoading(true);
      const result = await validateToken(token);
      if (result.valid) {
        onTokenChange(token);
        setError('');
      } else {
        setError('Invalid token');
      }
    } catch (err) {
      setError('Failed to validate token');
      console.error('Error validating token:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Validate Token</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Enter token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 flex-1"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={handleValidate}
          disabled={loading}
          className={`bg-[#8B0000] text-white px-4 py-2 rounded ${loading ? 'opacity-50' : ''}`}
        >
          {loading ? 'Validating...' : 'Validate'}
        </motion.button>
      </div>
    </motion.div>
  );
}