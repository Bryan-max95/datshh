'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Save, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

const SettingsPage = () => {
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  const [settings, setSettings] = useState({
    darkMode: false,
    notifications: true,
    autoRefresh: true,
    refreshInterval: 30,
  });

  // Cargar configuración al montar el componente
  useEffect(() => {
    const loadSettings = async () => {
      try {
        setIsLoading(true);
        // Simular carga de configuración desde localStorage o API
        const savedToken = localStorage.getItem('apiToken') || '';
        const savedSettings = JSON.parse(localStorage.getItem('appSettings') || '{}');
        
        setToken(savedToken);
        setSettings(prev => ({
          ...prev,
          ...savedSettings
        }));
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleTokenChange = (newToken: string) => {
    setToken(newToken);
  };

  const handleSettingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, type, checked, value } = e.target;
    
    setSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaveStatus('saving');
      
      // Simular guardado en API/localStorage
      localStorage.setItem('apiToken', token);
      localStorage.setItem('appSettings', JSON.stringify(settings));
      
      // Simular retardo de red
      await new Promise(resolve => setTimeout(resolve, 800));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="animate-spin h-8 w-8 text-[#8B0000]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#8B0000]">Configuración del Sistema</h1>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleSaveSettings}
          disabled={saveStatus === 'saving'}
          className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
        >
          {saveStatus === 'saving' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : saveStatus === 'success' ? (
            <CheckCircle className="h-5 w-5" />
          ) : saveStatus === 'error' ? (
            <AlertCircle className="h-5 w-5" />
          ) : (
            <Save className="h-5 w-5" />
          )}
          Guardar Configuración
        </motion.button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sección de Token API */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">API Configuration</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="apiToken" className="block text-sm font-medium text-gray-700 mb-1">
                Token de API
              </label>
              <input
                type="password"
                id="apiToken"
                value={token}
                onChange={(e) => handleTokenChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
                placeholder="Ingrese su token de API"
              />
              <p className="mt-1 text-xs text-gray-500">
                Este token se usa para autenticar las solicitudes a la API externa.
              </p>
            </div>
          </div>
        </div>

        {/* Sección de Preferencias */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Preferencias de la Aplicación</h2>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="darkMode"
                name="darkMode"
                checked={settings.darkMode}
                onChange={handleSettingChange}
                className="h-4 w-4 text-[#8B0000] focus:ring-[#8B0000] border-gray-300 rounded"
              />
              <label htmlFor="darkMode" className="ml-2 block text-sm text-gray-700">
                Modo oscuro
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="notifications"
                name="notifications"
                checked={settings.notifications}
                onChange={handleSettingChange}
                className="h-4 w-4 text-[#8B0000] focus:ring-[#8B0000] border-gray-300 rounded"
              />
              <label htmlFor="notifications" className="ml-2 block text-sm text-gray-700">
                Habilitar notificaciones
              </label>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="autoRefresh"
                name="autoRefresh"
                checked={settings.autoRefresh}
                onChange={handleSettingChange}
                className="h-4 w-4 text-[#8B0000] focus:ring-[#8B0000] border-gray-300 rounded"
              />
              <label htmlFor="autoRefresh" className="ml-2 block text-sm text-gray-700">
                Actualización automática
              </label>
            </div>

            {settings.autoRefresh && (
              <div>
                <label htmlFor="refreshInterval" className="block text-sm font-medium text-gray-700 mb-1">
                  Intervalo de actualización (segundos)
                </label>
                <input
                  type="number"
                  id="refreshInterval"
                  name="refreshInterval"
                  min="5"
                  max="3600"
                  value={settings.refreshInterval}
                  onChange={handleSettingChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sección de Exportación/Importación */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Gestión de Configuración</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded flex items-center justify-center gap-2 border border-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Exportar Configuración
            </button>
          </div>
          <div>
            <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded flex items-center justify-center gap-2 border border-gray-300">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Importar Configuración
            </button>
          </div>
        </div>
      </div>

      {/* Feedback de guardado */}
      {saveStatus === 'success' && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg flex items-center gap-2"
        >
          <CheckCircle className="h-5 w-5" />
          Configuración guardada exitosamente
        </motion.div>
      )}

      {saveStatus === 'error' && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg flex items-center gap-2"
        >
          <AlertCircle className="h-5 w-5" />
          Error al guardar la configuración
        </motion.div>
      )}
    </motion.div>
  );
};

export default SettingsPage;