/* src/app/dashboard/settings/page.tsx */
'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import TokenInput from '../components/widgets/TokenInput';
import { useSession } from 'next-auth/react';

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [token, setToken] = useState('');

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
  };

  if (status === 'loading') {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  if (status !== 'authenticated') {
    return <div className="text-red-500 p-6">Please log in to continue.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">Settings</h1>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">API Token</h2>
        <TokenInput onTokenChange={handleTokenChange} />
        {token && <p className="text-gray-400 mt-4">Current Token: {token}</p>}
      </div>
    </motion.div>
  );
}