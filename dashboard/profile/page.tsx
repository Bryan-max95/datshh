'use client';

import { motion } from 'framer-motion';
import { User, Mail, Edit } from 'lucide-react';
import Link from 'next/link';

export default function ProfilePage() {
  // Mock user data (replace with actual data source if needed)
  const user = {
    name: 'Bryan', // Using your name from provided info
    email: 'bryan@bwpentesting.com', // Placeholder; adjust as needed
    role: 'Network Administrator', // Example role
    lastLogin: 'April 25, 2025, 08:30 AM', // Example timestamp
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-800">Perfil de Usuario</h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#A50000] transition-colors"
        >
          <Edit className="w-5 h-5" />
          Editar Perfil
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Información del Usuario</h2>
          <div className="flex items-center gap-6 mb-6">
            <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-2xl font-bold">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-700">{user.name}</h3>
              <p className="text-gray-500">{user.role}</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-3 text-gray-600">
              <Mail className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Email</p>
                <p className="text-gray-600">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-gray-600">
              <User className="w-5 h-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-700">Rol</p>
                <p className="text-gray-600">{user.role}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Card */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Actividad</h2>
          <div className="space-y-4 text-gray-600">
            <div>
              <p className="text-sm font-medium text-gray-700">Último Inicio de Sesión</p>
              <p className="text-gray-600">{user.lastLogin}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Section */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Configuración de Seguridad</h2>
        <div className="space-y-4 text-gray-600">
          <div className="flex justify-between items-center">
            <span>Autenticación de Dos Factores</span>
            <button className="px-4 py-2 bg-[#8B0000] text-white rounded-md hover:bg-[#A50000] transition-colors">
              Habilitar
            </button>
          </div>
          <div className="flex justify-between items-center">
            <span>Cambiar Contraseña</span>
            <Link
              href="/dashboard/profile/change-password"
              className="px-4 py-2 bg-[#8B0000] text-white rounded-md hover:bg-[#A50000] transition-colors"
            >
              Actualizar
            </Link>
          </div>
        </div>
      </div>
    </motion.div>
  );
}