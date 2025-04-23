'use client';

import { useSession } from 'next-auth/react';
import { Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';

interface TopbarProps {
  theme: 'dark' | 'light';
}

export default function Topbar({ theme }: TopbarProps) {
  const { data: session } = useSession();

  return (
    <div className={`p-4 flex justify-between items-center border-b border-[#8B0000]/50 ${theme === 'dark' ? 'bg-[#1F1F1F]' : 'bg-white'}`}>
      <h1 className="text-xl font-bold text-white">Cybersecurity Dashboard</h1>
      <div className="flex items-center gap-4">
        <motion.div whileHover={{ scale: 1.1 }} className="text-gray-400 hover:text-white cursor-pointer">
          <Bell className="w-6 h-6" />
        </motion.div>
        {session && (
          <div className="flex items-center gap-2 text-gray-400">
            <User className="w-6 h-6" />
            <span>{session.user?.name || 'User'}</span>
          </div>
        )}
      </div>
    </div>
  );
}
