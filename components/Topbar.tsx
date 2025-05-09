'use client';

import { useSession } from 'next-auth/react';
import { Bell, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '../layout';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';

interface TopbarProps {}

export default function Topbar({}: TopbarProps) {
  const { theme } = useTheme();
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Mock fetching notifications (replace with real API call)
    const mockNotifications = ['New vulnerability detected', 'Camera scan completed'];
    setNotifications(mockNotifications);
    if (mockNotifications.length > 0) {
      mockNotifications.forEach((notif) => toast.info(notif));
    }
  }, []);

  return (
    <div className={`p-4 flex justify-between items-center border-b border-[#8B0000]/50 ${theme === 'dark' ? 'bg-[#1F1F1F]' : 'bg-white'}`}>
      <h1 className="text-xl font-bold text-red">Cybersecurity Dashboard</h1>
      <div className="flex items-center gap-4">
        <motion.div
          whileHover={{ scale: 1.1 }}
          className="text-gray-400 hover:text-white cursor-pointer relative"
          onClick={() => notifications.forEach((notif) => toast.info(notif))}
        >
          <Bell className="w-6 h-6" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
              {notifications.length}
            </span>
          )}
        </motion.div>
        {session && (
          <div className="flex items-center gap-2 text-gray-400">
            <img
              src={session.user?.image || '/default-avatar.png'}
              alt="User avatar"
              className="w-8 h-8 rounded-full"
            />
            <span>{session.user?.name || 'User'}</span>
          </div>
        )}
      </div>
    </div>
  );
}