'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search } from 'lucide-react';
import { fetchDevices, addDevice, deleteDevice, fetchShodanData } from '../lib/api';
import { Device, ShodanData } from '../../types';
import { z } from 'zod';

const DeviceInputSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  ipAddress: z.string().ip('Dirección IP inválida'),
  deviceType: z.string().min(1, 'El tipo de dispositivo es requerido'),
  group: z.string().min(1, 'El grupo es requerido'),
});

export default function Network() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [newDevice, setNewDevice] = useState({
    name: '',
    ipAddress: '',
    deviceType: '',
    group: '',
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedIP, setSelectedIP] = useState('');
  const [vulnerabilityData, setVulnerabilityData] = useState<ShodanData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const devicesPerPage = 10;

  const cache = new Map<string, ShodanData>();

  useEffect(() => {
    loadDevices();
  }, []);

  const loadDevices = async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
      if (data.length > 0) {
        setSelectedIP(data[0].ipAddress);
      }
      setError('');
    } catch (err) {
      setError('No se pudieron cargar los dispositivos');
      console.error('Error al obtener dispositivos:', err);
    }
  };

  const handleAddDevice = async () => {
    try {
      DeviceInputSchema.parse(newDevice);
      await addDevice(newDevice);
      setNewDevice({ name: '', ipAddress: '', deviceType: '', group: '' });
      await loadDevices();
      setError('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('No se pudo añadir el dispositivo');
        console.error('Error al añadir dispositivo:', error);
      }
    }
  };

  const handleDeleteDevice = async (_id: string) => {
    try {
      await deleteDevice(_id);
      await loadDevices();
      setError('');
    } catch (error) {
      setError('No se pudo eliminar el dispositivo');
      console.error('Error al eliminar dispositivo:', error);
    }
  };

  const handleAnalyzeIP = async () => {
    if (!selectedIP) {
      setError('Por favor selecciona una IP para analizar');
      return;
    }
    try {
      if (cache.has(selectedIP)) {
        setVulnerabilityData(cache.get(selectedIP) as ShodanData);
        setError('');
        return;
      }
      const data = await fetchShodanData(selectedIP);
      if (data) {
        cache.set(selectedIP, data);
        setVulnerabilityData(data);
        setError('');
      } else {
        setError('No hay datos de Shodan disponibles para esta IP');
      }
    } catch (error) {
      setError('No se pudieron obtener los datos de Shodan');
      console.error('Error al obtener datos de Shodan:', error);
    }
  };

  const filteredDevices = devices.filter(
    (device) =>
      device.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.ipAddress.includes(searchTerm) ||
      device.deviceType.toLowerCase().includes(searchTerm.toLowerCase()) ||
      device.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastDevice = currentPage * devicesPerPage;
  const indexOfFirstDevice = indexOfLastDevice - devicesPerPage;
  const currentDevices = filteredDevices.slice(indexOfFirstDevice, indexOfLastDevice);
  const totalPages = Math.ceil(filteredDevices.length / devicesPerPage);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">Gestión de Red</h1>
      {error && (
        <div className="bg-red-100 border-l-4 border-red-400 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {/* Añadir Dispositivo */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Añadir Dispositivo</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Nombre"
            value={newDevice.name}
            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          />
          <input
            type="text"
            placeholder="Dirección IP"
            value={newDevice.ipAddress}
            onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          />
          <input
            type="text"
            placeholder="Tipo de Dispositivo"
            value={newDevice.deviceType}
            onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          />
          <input
            type="text"
            placeholder="Grupo"
            value={newDevice.group}
            onChange={(e) => setNewDevice({ ...newDevice, group: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddDevice}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Añadir
          </motion.button>
        </div>
      </div>

      {/* Buscar y Lista de Dispositivos */}
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar dispositivos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Lista de Dispositivos</h2>
        {devices.length === 0 ? (
          <p className="text-gray-500">No se encontraron dispositivos.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dirección IP</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grupo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentDevices.map((device) => (
                    <tr key={device._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{device.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.ipAddress}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.deviceType}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{device.group}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          onClick={() => handleDeleteDevice(device._id)}
                          className="text-[#8B0000] hover:text-[#A50000]"
                        >
                          <Trash2 className="w-5 h-5" />
                        </motion.button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-between items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Anterior
              </motion.button>
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Siguiente
              </motion.button>
            </div>
          </>
        )}
      </div>

      {/* Analizar Dispositivo */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Analizar Dispositivo</h2>
        <div className="flex gap-4 mb-4">
          <select
            value={selectedIP}
            onChange={(e) => setSelectedIP(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          >
            <option value="">Seleccionar IP</option>
            {devices.map((device) => (
              <option key={device._id} value={device.ipAddress}>
                {device.name} ({device.ipAddress})
              </option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAnalyzeIP}
            className="bg-[#8B0000] text-white px-4 py-2 rounded"
          >
            Analizar
          </motion.button>
        </div>
        {vulnerabilityData && (
          <div className="bg-white p-4 rounded border border-gray-200">
            <pre className="text-sm text-gray-800 overflow-x-auto">
              {JSON.stringify(vulnerabilityData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}