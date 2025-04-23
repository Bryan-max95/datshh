/* src/app/dashboard/profile/page.tsx */
'use client';

import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { data: session, status } = useSession();

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
      <h1 className="text-3xl font-bold text-[#8B0000]">Profile</h1>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">User Information</h2>
        <div className="space-y-2 text-gray-400">
          <p><strong>Name:</strong> {session.user?.name || 'N/A'}</p>
          <p><strong>Email:</strong> {session.user?.email || 'N/A'}</p>
        </div>
      </div>
    </motion.div>
  );
}