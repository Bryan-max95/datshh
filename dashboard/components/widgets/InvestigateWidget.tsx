/* src/app/dashboard/components/widgets/InvestigateWidget.tsx */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { investigateDomain } from '../../lib/api';

export default function InvestigateWidget() {
  const [domain, setDomain] = useState('');
  const [result, setResult] = useState<{ status: string; categories: string[] } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInvestigate = async () => {
    if (!domain) {
      setError('Please enter a domain');
      return;
    }
    try {
      setLoading(true);
      const data = await investigateDomain(domain);
      setResult(data);
      setError('');
    } catch (err) {
      setError('Failed to investigate domain');
      console.error('Error investigating domain:', err);
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
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Domain Investigation</h2>
      <div className="flex gap-4 mb-4">
        <input
          type="text"
          placeholder="Enter domain (e.g., example.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 flex-1"
        />
        <motion.button
          whileHover={{ scale: 1.05 }}
          onClick={handleInvestigate}
          disabled={loading}
          className={`bg-[#8B0000] text-white px-4 py-2 rounded ${loading ? 'opacity-50' : ''}`}
        >
          {loading ? 'Investigating...' : 'Investigate'}
        </motion.button>
      </div>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {result ? (
        <div className="space-y-2 text-gray-400">
          <p><strong>Domain:</strong> {domain}</p>
          <p><strong>Status:</strong> {result.status}</p>
          <p><strong>Categories:</strong> {result.categories.join(', ')}</p>
        </div>
      ) : (
        <p className="text-gray-400">Enter a domain to investigate.</p>
      )}
    </motion.div>
  );
}