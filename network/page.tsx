'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search, Scan, FileText } from 'lucide-react';
import { fetchDevices, addDevice, deleteDevice, fetchShodanData, fetchVulnersData, fetchGreyNoiseData, scanNetworkWithNmap } from '../lib/api';
import { Device, ShodanData, GreyNoiseData } from '../../types';
import { z } from 'zod';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';

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
  const [scanTarget, setScanTarget] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [selectedIP, setSelectedIP] = useState('');
  const [analysisData, setAnalysisData] = useState<{
    shodan: ShodanData | null;
    vulners: { cveId: string; severity: string; description: string; link?: string }[];
    greynoise: GreyNoiseData | null;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanLoading, setScanLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const devicesPerPage = 10;

  // Explicitly type the cache
  const cache = new Map<string, { shodan: ShodanData | null; vulners: { cveId: string; severity: string; description: string; link?: string }[]; greynoise: GreyNoiseData | null }>();

  useEffect(() => {
    loadDevices();
  }, [searchTerm]);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const data = await fetchDevices({ search: searchTerm });
      setDevices(data.devices);
      if (data.devices.length > 0 && !selectedIP) {
        setSelectedIP(data.devices[0].ipAddress);
      }
      setError('');
    } catch (err) {
      setError('No se pudieron cargar los dispositivos');
      console.error('Error al obtener dispositivos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDevice = async () => {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDevice = async (_id: string) => {
    try {
      setLoading(true);
      await deleteDevice(_id);
      await loadDevices();
      if (selectedIP === devices.find((d) => d._id === _id)?.ipAddress) {
        setSelectedIP('');
        setAnalysisData(null);
      }
      setError('');
    } catch (error) {
      setError('No se pudo eliminar el dispositivo');
      console.error('Error al eliminar dispositivo:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeIP = async () => {
    if (!selectedIP) {
      setError('Por favor selecciona una IP para analizar');
      return;
    }
    try {
      setLoading(true);
      if (cache.has(selectedIP)) {
        setAnalysisData(cache.get(selectedIP)!);
        setError('');
        return;
      }

      // Explicitly type the Promise.all results
      const [shodanData, greynoiseData]: [ShodanData | null, GreyNoiseData | null] = await Promise.all([
        fetchShodanData(selectedIP),
        fetchGreyNoiseData(selectedIP),
      ]);

      // Fetch vulners data after shodanData is resolved to avoid circular reference
      const vulnersData: { cveId: string; severity: string; description: string; link?: string }[] = shodanData?.product
        ? await fetchVulnersData(`${shodanData.product} ${shodanData.version || ''}`)
        : [];

      const analysis = { shodan: shodanData, greynoise: greynoiseData, vulners: vulnersData };
      cache.set(selectedIP, analysis);
      setAnalysisData(analysis);
      setError('');
    } catch (error) {
      setError('No se pudieron obtener los datos de análisis');
      console.error('Error al analizar IP:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleScanNetwork = async () => {
    if (!scanTarget) {
      setError('Por favor ingresa un objetivo para escanear');
      return;
    }
    try {
      setScanLoading(true);
      await scanNetworkWithNmap(scanTarget);
      await loadDevices();
      setError('');
    } catch (err) {
      setError('Error al escanear la red. Verifica el objetivo.');
      console.error('Error al escanear red:', err);
    } finally {
      setScanLoading(false);
    }
  };

  const generatePDF = () => {
    if (!analysisData) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Informe de Análisis de IP: ${selectedIP}`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);

    if (analysisData.shodan) {
      doc.setFontSize(14);
      doc.text('Datos de Shodan', 20, 40);
      autoTable(doc, {
        startY: 45,
        head: [['Campo', 'Valor']],
        body: [
          ['Sistema Operativo', analysisData.shodan.os || 'N/A'],
          ['Organización', analysisData.shodan.org || 'N/A'],
          ['Puertos Abiertos', analysisData.shodan.ports.join(', ') || 'Ninguno'],
          ['Vulnerabilidades', analysisData.shodan.vulns.join(', ') || 'Ninguna'],
          ['Producto', analysisData.shodan.product || 'N/A'],
          ['Versión', analysisData.shodan.version || 'N/A'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (analysisData.vulners.length > 0) {
      const finalY = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(14);
      doc.text('Vulnerabilidades (Vulners)', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['CVE ID', 'Severidad', 'Descripción']],
        body: analysisData.vulners.map((v) => [v.cveId, v.severity, v.description.substring(0, 100) + '...']),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (analysisData.greynoise) {
      const finalY = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(14);
      doc.text('Datos de GreyNoise', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Campo', 'Valor']],
        body: [
          ['Clasificación', analysisData.greynoise.classification],
          ['Nombre', analysisData.greynoise.name || 'N/A'],
          ['Última vez visto', analysisData.greynoise.lastSeen || 'N/A'],
          ['Ruido', analysisData.greynoise.noise ? 'Sí' : 'No'],
          ['RIOT', analysisData.greynoise.riot ? 'Sí' : 'No'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    doc.save(`Informe_IP_${selectedIP}.pdf`);
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

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Escanear Red</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Ingresa IP o rango (ej. 192.168.1.0/24)"
            value={scanTarget}
            onChange={(e) => setScanTarget(e.target.value)}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={scanLoading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleScanNetwork}
            disabled={scanLoading}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center justify-center gap-2"
          >
            {scanLoading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
              </svg>
            ) : (
              <Scan className="w-5 h-5" />
            )}
            Escanear
          </motion.button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Añadir Dispositivo</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <input
            type="text"
            placeholder="Nombre"
            value={newDevice.name}
            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Dirección IP"
            value={newDevice.ipAddress}
            onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Tipo de Dispositivo"
            value={newDevice.deviceType}
            onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={loading}
          />
          <input
            type="text"
            placeholder="Grupo"
            value={newDevice.group}
            onChange={(e) => setNewDevice({ ...newDevice, group: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={loading}
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleAddDevice}
            disabled={loading}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center justify-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
              </svg>
            ) : (
              <Plus className="w-5 h-5" />
            )}
            Añadir
          </motion.button>
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar dispositivos..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full bg-white border border-gray-300 text-gray-900 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={loading}
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Lista de Dispositivos</h2>
        {loading ? (
          <div className="flex justify-center py-6">
            <svg className="animate-spin h-8 w-8 text-[#8B0000]" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
            </svg>
          </div>
        ) : currentDevices.length === 0 ? (
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
                          disabled={loading}
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
                disabled={currentPage === 1 || loading}
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
                disabled={currentPage === totalPages || loading}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Siguiente
              </motion.button>
            </div>
          </>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Analizar Dispositivo</h2>
        <div className="flex gap-4 mb-4">
          <select
            value={selectedIP}
            onChange={(e) => setSelectedIP(e.target.value)}
            className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 flex-1 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={loading}
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
            disabled={loading}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            {loading ? (
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8h8a8 8 0 01-8 8 8 8 0 01-8-8z" />
              </svg>
            ) : (
              'Analizar'
            )}
          </motion.button>
        </div>
        {analysisData && (
          <Dialog>
            <DialogTrigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <FileText className="w-5 h-5" /> Ver Informe
              </motion.button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Informe de Análisis para IP: {selectedIP}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {analysisData.shodan && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Datos de Shodan</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Campo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-2">Sistema Operativo</td>
                          <td className="px-4 py-2">{analysisData.shodan.os || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Organización</td>
                          <td className="px-4 py-2">{analysisData.shodan.org || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Puertos Abiertos</td>
                          <td className="px-4 py-2">{analysisData.shodan.ports.join(', ') || 'Ninguno'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Vulnerabilidades</td>
                          <td className="px-4 py-2">{analysisData.shodan.vulns.join(', ') || 'Ninguna'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Producto</td>
                          <td className="px-4 py-2">{analysisData.shodan.product || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Versión</td>
                          <td className="px-4 py-2">{analysisData.shodan.version || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                {analysisData.vulners.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Vulnerabilidades (Vulners)</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">CVE ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Severidad</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Descripción</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {analysisData.vulners.map((vuln) => (
                          <tr key={vuln.cveId}>
                            <td className="px-4 py-2">{vuln.cveId}</td>
                            <td className="px-4 py-2">{vuln.severity}</td>
                            <td className="px-4 py-2">{vuln.description.substring(0, 100)}...</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {analysisData.greynoise && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800">Datos de GreyNoise</h3>
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Campo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        <tr>
                          <td className="px-4 py-2">Clasificación</td>
                          <td className="px-4 py-2">{analysisData.greynoise.classification}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Nombre</td>
                          <td className="px-4 py-2">{analysisData.greynoise.name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Última vez visto</td>
                          <td className="px-4 py-2">{analysisData.greynoise.lastSeen || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Ruido</td>
                          <td className="px-4 py-2">{analysisData.greynoise.noise ? 'Sí' : 'No'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">RIOT</td>
                          <td className="px-4 py-2">{analysisData.greynoise.riot ? 'Sí' : 'No'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={generatePDF}
                  className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" /> Exportar a PDF
                </motion.button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </motion.div>
  );
}