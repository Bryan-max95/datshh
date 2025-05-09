'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Home, Network, Camera, Shield, AlertTriangle,
  FileText, Settings, User, HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '../layout';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@radix-ui/react-tooltip';
import Image from 'next/image';

interface MenuItem {
  name: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const menuItems: MenuItem[] = [
  { name: 'Resumen', path: '/dashboard/overview', icon: Home },
  { name: 'Red', path: '/dashboard/network', icon: Network },
  { name: 'Cámaras', path: '/dashboard/cameras', icon: Camera },
  { name: 'Vulnerabilidades', path: '/dashboard/vulnerabilities', icon: Shield },
  { name: 'Amenazas', path: '/dashboard/threats', icon: AlertTriangle },
  { name: 'Cumplimiento', path: '/dashboard/compliance', icon: FileText },
  { name: 'Incidentes', path: '/dashboard/incidents', icon: AlertTriangle },
  { name: 'Reportes', path: '/dashboard/reports', icon: FileText },
  { name: 'Configuración', path: '/dashboard/settings', icon: Settings },
  { name: 'Perfil', path: '/dashboard/profile', icon: User },
  { name: 'Soporte', path: '/dashboard/support', icon: HelpCircle },
];

export default function Sidebar() {
  const { theme, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  // Colapsar sidebar en pantallas pequeñas
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(true); // Expandir en pantallas grandes (lg)
      } else {
        setIsOpen(false); // Colapsar en pantallas pequeñas
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <TooltipProvider>
      <motion.div
        initial={{ width: isOpen ? 250 : 80 }}
        animate={{ width: isOpen ? 250 : 80 }}
        className="bg-[#1F1F1F] h-screen overflow-y-auto flex flex-col fixed top-0 left-0 lg:sticky lg:top-0 z-50"
        style={{ scrollbarWidth: 'thin', scrollbarColor: '#8B0000 #2D2D2D' }}
      >
        {/* Imagen */}
        <div className="mb-4 flex justify-center p-4">
          <Image
            src="/images/bwp1.png"
            alt="Logo del Dashboard"
            width={isOpen ? 150 : 60}
            height={isOpen ? 80 : 60}
            className="object-contain"
            priority
          />
        </div>

        {/* Encabezado con Toggle */}
        <div className="flex justify-between items-center mb-6 px-4">
          {isOpen && <h2 className="text-xl font-bold text-white">Dashboard</h2>}
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(!isOpen)}
            className="bg-[#8B0000] text-white p-2 rounded-lg hover:bg-[#A50000] transition-colors"
          >
            {isOpen ? '◄' : '►'}
          </motion.button>
        </div>

        {/* Menú */}
        <nav className="flex-1 px-2">
          {menuItems.map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link href={item.path}>
                  <motion.div
                    whileHover={{ backgroundColor: '#2D2D2D' }}
                    className="flex items-center p-2 rounded-lg text-gray-400 hover:text-white mb-2"
                  >
                    <item.icon className="w-6 h-6 min-w-[24px] mr-2" />
                    {isOpen && <span className="truncate">{item.name}</span>}
                  </motion.div>
                </Link>
              </TooltipTrigger>
              {!isOpen && <TooltipContent side="right">{item.name}</TooltipContent>}
            </Tooltip>
          ))}
        </nav>

        {/* Toggle de Tema */}
        <Tooltip>
          <TooltipTrigger asChild>
            <motion.div
              whileHover={{ backgroundColor: '#2D2D2D' }}
              onClick={toggleTheme}
              className="flex items-center p-2 rounded-lg text-gray-400 hover:text-white cursor-pointer mx-2 mb-4"
            >
              <span className="w-6 h-6 flex items-center justify-center mr-2">🌓</span>
              {isOpen && <span className="truncate">Cambiar a {theme === 'dark' ? 'Claro' : 'Oscuro'}</span>}
            </motion.div>
          </TooltipTrigger>
          {!isOpen && <TooltipContent side="right">Cambiar Tema</TooltipContent>}
        </Tooltip>
      </motion.div>
    </TooltipProvider>
  );
}