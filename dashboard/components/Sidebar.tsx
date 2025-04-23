'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Network, Camera, Shield, AlertTriangle,
  FileText, Settings, User, HelpCircle, LogOut
} from 'lucide-react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';

interface SidebarProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

export default function Sidebar({ theme, toggleTheme }: SidebarProps) {
  const { data: session, status } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { name: 'Overview', path: '/dashboard/overview', icon: Home },
    { name: 'Network', path: '/dashboard/network', icon: Network },
    { name: 'Cameras', path: '/dashboard/cameras', icon: Camera },
    { name: 'Vulnerabilities', path: '/dashboard/vulnerabilities', icon: Shield },
    { name: 'Threats', path: '/dashboard/threats', icon: AlertTriangle },
    { name: 'Compliance', path: '/dashboard/compliance', icon: FileText },
    { name: 'Incidents', path: '/dashboard/incidents', icon: AlertTriangle },
    { name: 'Reports', path: '/dashboard/reports', icon: FileText },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    { name: 'Profile', path: '/dashboard/profile', icon: User },
    { name: 'Support', path: '/dashboard/support', icon: HelpCircle },
  ];

  if (status === 'loading') {
    return <div className="bg-[#1F1F1F] h-screen p-4 text-gray-400">Loading...</div>;
  }

  return (
    <motion.div
      initial={{ width: isOpen ? 250 : 80 }}
      animate={{ width: isOpen ? 250 : 80 }}
      className="bg-[#1F1F1F] h-screen p-4 flex flex-col"
    >
      <div className="flex justify-between items-center mb-6">
        {isOpen && <h2 className="text-xl font-bold text-white">Dashboard</h2>}
        <motion.button
          whileHover={{ scale: 1.1 }}
          onClick={() => setIsOpen(!isOpen)}
          className="text-gray-400 hover:text-white"
        >
          {isOpen ? '◄' : '►'}
        </motion.button>
      </div>
      <nav className="flex-1">
        {menuItems.map((item) => (
          <Link key={item.name} href={item.path}>
            <motion.div
              whileHover={{ backgroundColor: '#2D2D2D' }}
              className="flex items-center p-2 rounded-lg text-gray-400 hover:text-white mb-2"
            >
              <item.icon className="w-6 h-6 mr-2" />
              {isOpen && <span>{item.name}</span>}
            </motion.div>
          </Link>
        ))}
      </nav>

      {/* Botón para cambiar el tema */}
      <motion.div
        whileHover={{ backgroundColor: '#2D2D2D' }}
        onClick={toggleTheme}
        className="flex items-center p-2 rounded-lg text-gray-400 hover:text-white cursor-pointer mb-2"
      >
        🌓
        {isOpen && <span className="ml-2">Switch to {theme === 'dark' ? 'Light' : 'Dark'}</span>}
      </motion.div>

      {session && (
        <motion.div
          whileHover={{ backgroundColor: '#2D2D2D' }}
          onClick={() => signOut()}
          className="flex items-center p-2 rounded-lg text-gray-400 hover:text-white cursor-pointer"
        >
          <LogOut className="w-6 h-6 mr-2" />
          {isOpen && <span>Log Out</span>}
        </motion.div>
      )}
    </motion.div>
  );
}
