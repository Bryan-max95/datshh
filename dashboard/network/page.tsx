'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CSVLink } from 'react-csv';
import {
  Plus,
  Trash2,
  Search,
  Scan,
  FileText,
  ExternalLink,
  Edit,
  Download,
  Loader2,
} from 'lucide-react';
import {
  fetchDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  fetchShodanData,
  fetchVulnersData,
  fetchGreyNoiseData,
  scanNetworkWithNmap,
} from '../lib/api';
import { Device, ShodanData, GreyNoiseData } from '../../types';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import TokenGuard from '../components/TokenGuard';
import DeviceTable from '../components/DeviceTable';
import sanitizeHtml from 'sanitize-html';

const DeviceInputSchema = z.object({
  ipAddress: z.string().ip('Dirección IP inválida'),
  name: z.string().min(1, 'El nombre es requerido'),
  type: z.string().optional(),
  os: z.string().optional(),
});

interface FetchDevicesParams {
  page: number;
  limit: number;
  search?: string;
  type?: string;
}

interface FetchDevicesResponse {
  devices: Device[];
  totalPages: number;
}

interface CachedData {
  shodan: ShodanData | null;
  greynoise: GreyNoiseData | null;
  vulners: { cveId: string; severity: string; description: string; link?: string }[];
  timestamp: number;
}

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [newDevice, setNewDevice] = useState({ ipAddress: '', name: '', type: '', os: '' });
  const [editingDevice, setEditingDevice] = useState<Device | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);
  const [progress, setProgress] = useState(0);

  const devicesPerPage = 10;
  const cacheTTL = 24 * 60 * 60 * 1000; // 24 horas

  // Caché persistente usando localStorage
  const getCachedData = (ip: string): CachedData | null => {
    const cached = localStorage.getItem(`device_cache_${ip}`);
    if (!cached) return null;
    const data: CachedData = JSON.parse(cached);
    if (Date.now() - data.timestamp > cacheTTL) {
      localStorage.removeItem(`device_cache_${ip}`);
      return null;
    }
    return data;
  };

  const setCachedData = (ip: string, data: CachedData) => {
    localStorage.setItem(`device_cache_${ip}`, JSON.stringify({ ...data, timestamp: Date.now() }));
  };

  // Calcular tipos de dispositivos con useMemo
  const deviceTypes = useMemo(
    () => Array.from(new Set(devices.map((d) => d.type || '').filter((t) => t))),
    [devices]
  );

  /**
   * Carga los dispositivos desde la API y enriquece con datos de Shodan, GreyNoise y Vulners
   * @param page Página actual
   * @param search Término de búsqueda
   * @param type Filtro por tipo
   */
  const loadDevices = async (page: number, search: string, type: string) => {
    setIsLoading(true);
    setProgress(0);
    try {
      const response: FetchDevicesResponse = await fetchDevices({
        page,
        limit: devicesPerPage,
        search: sanitizeHtml(search),
        ...(type ? { type: sanitizeHtml(type) } : {}),
      });

      const totalDevices = response.devices.length;
      let processed = 0;

      const enrichedDevices = await Promise.all(
        response.devices.map(async (device: Device) => {
          const cachedData = getCachedData(device.ipAddress);
          if (cachedData) {
            processed++;
            setProgress((processed / totalDevices) * 100);
            return {
              ...device,
              shodanData: cachedData.shodan ?? undefined,
              greyNoiseData: cachedData.greynoise ?? undefined,
              vulnerabilities: cachedData.vulners,
            };
          }

          const [shodanData, greyNoiseData]: [ShodanData | null, GreyNoiseData | null] = await Promise.all([
            fetchShodanData(device.ipAddress).catch(() => null),
            fetchGreyNoiseData(device.ipAddress).catch(() => null),
          ]);

          const vulnerabilities = shodanData?.product
            ? await fetchVulnersData(`${shodanData.product} ${shodanData.version || ''}`).catch(() => [])
            : [];

          const analysis: CachedData = { shodan: shodanData, greynoise: greyNoiseData, vulners: vulnerabilities, timestamp: Date.now() };
          setCachedData(device.ipAddress, analysis);

          processed++;
          setProgress((processed / totalDevices) * 100);

          return {
            ...device,
            shodanData: shodanData ?? undefined,
            greyNoiseData: greyNoiseData ?? undefined,
            vulnerabilities,
          };
        })
      );

      setDevices(enrichedDevices);
      setTotalPages(response.totalPages);
      setError('');
      toast.success(`Cargados ${enrichedDevices.length} dispositivos`);
    } catch (error) {
      setError('Error al cargar dispositivos');
      toast.error('Error al cargar dispositivos');
      console.error(error);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  useEffect(() => {
    loadDevices(currentPage, searchTerm, filterType);
  }, [currentPage, searchTerm, filterType]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  /**
   * Añade un nuevo dispositivo validando los datos
   */
  const handleAddDevice = async () => {
    try {
      const sanitizedDevice = {
        ipAddress: sanitizeHtml(newDevice.ipAddress),
        name: sanitizeHtml(newDevice.name),
        type: sanitizeHtml(newDevice.type),
        os: sanitizeHtml(newDevice.os),
      };
      DeviceInputSchema.parse(sanitizedDevice);
      await addDevice({
        ...sanitizedDevice,
        lastScanned: new Date().toISOString(),
        ports: [],
        userId: '', // Se asignará en el servidor
        createdAt: new Date().toISOString(),
        group: '',
        status: 'unknown',
        cpuUsage: 0,
        memoryUsage: 0,
        browsers: [],
        software: [],
        cves: [],
        geo: { lat: 0, lng: 0 },
      });
      setNewDevice({ ipAddress: '', name: '', type: '', os: '' });
      await loadDevices(currentPage, searchTerm, filterType);
      toast.success('Dispositivo añadido exitosamente');
      setError('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Error al añadir dispositivo');
        toast.error('Error al añadir dispositivo');
        console.error(error);
      }
    }
  };

  /**
   * Actualiza un dispositivo existente
   */
  const handleEditDevice = async () => {
    if (!editingDevice) return;
    try {
      const sanitizedDevice = {
        ipAddress: sanitizeHtml(editingDevice.ipAddress),
        name: sanitizeHtml(editingDevice.name),
        type: sanitizeHtml(editingDevice.type || ''),
        os: sanitizeHtml(editingDevice.os || ''),
      };
      DeviceInputSchema.parse(sanitizedDevice);
      await updateDevice({
        ...editingDevice,
        ...sanitizedDevice,
      });
      setEditingDevice(null);
      await loadDevices(currentPage, searchTerm, filterType);
      toast.success('Dispositivo actualizado exitosamente');
      setError('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Error al actualizar dispositivo');
        toast.error('Error al actualizar dispositivo');
        console.error(error);
      }
    }
  };

  /**
   * Elimina un dispositivo
   * @param _id ID del dispositivo
   */
  const handleDeleteDevice = async (_id: string) => {
    try {
      await deleteDevice(_id);
      await loadDevices(currentPage, searchTerm, filterType);
      toast.success('Dispositivo eliminado exitosamente');
      setError('');
    } catch (error) {
      setError('Error al eliminar dispositivo');
      toast.error('Error al eliminar dispositivo');
      console.error(error);
    }
  };

  /**
   * Escanea la red para detectar nuevos dispositivos
   */
  const handleScanNetwork = async () => {
    setIsScanning(true);
    toast.info('Escaneando red...', { autoClose: false, closeButton: false });
    try {
      const scannedDevices = await scanNetworkWithNmap();
      const DeviceScanSchema = z.object({
        ipAddress: z.string().ip(),
        name: z.string().min(1),
        type: z.string().optional(),
        os: z.string().optional(),
        ports: z.array(z.number()).optional(),
      });
      const validatedDevices = scannedDevices.map((device: Device) =>
        DeviceScanSchema.parse({
          ...device,
          ports: device.ports || [],
        })
      );
      if (validatedDevices.length > 0) {
        await Promise.all(
          validatedDevices.map(async (device) => {
            await addDevice({
              ...device,
              ports: device.ports || [],
              lastScanned: new Date().toISOString(),
              userId: '', // Se asignará en el servidor
              createdAt: new Date().toISOString(),
              group: '',
              status: 'unknown',
              cpuUsage: 0,
              memoryUsage: 0,
              browsers: [],
              software: [],
              cves: [],
              geo: { lat: 0, lng: 0 },
            });
          })
        );
      }
      await loadDevices(currentPage, searchTerm, filterType);
      toast.dismiss();
      toast.success(`Encontrados y añadidos ${validatedDevices.length} dispositivos`);
      setError('');
    } catch (error) {
      toast.dismiss();
      setError('Error al escanear red');
      toast.error('Error al escanear red');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Genera un reporte PDF para un dispositivo
   * @param device Datos del dispositivo
   */
  const generatePDF = (device: Device) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Reporte de Dispositivo: ${device.name} (${device.ipAddress})`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Valor']],
      body: [
        ['Nombre', device.name],
        ['IP', device.ipAddress],
        ['Tipo', device.type || 'N/A'],
        ['Sistema Operativo', device.os || 'N/A'],
        ['Puertos', device.ports?.join(', ') || 'N/A'],
        ['Estado', device.status || 'N/A'],
        ['Uso de CPU', `${device.cpuUsage}%`],
        ['Uso de Memoria', `${device.memoryUsage}%`],
        ['Último Escaneo', device.lastScanned ? new Date(device.lastScanned).toLocaleString() : 'N/A'],
        ['Creado', device.createdAt ? new Date(device.createdAt).toLocaleString() : 'N/A'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [139, 0, 0] },
    });

    if (device.shodanData) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('Datos de Shodan', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Campo', 'Valor']],
        body: [
          ['IP', device.shodanData.ip],
          ['SO', device.shodanData.os || 'N/A'],
          ['Organización', device.shodanData.org || 'N/A'],
          ['Puertos', device.shodanData.ports.join(', ') || 'N/A'],
          ['Vulnerabilidades', device.shodanData.vulns.join(', ') || 'N/A'],
          ['Producto', device.shodanData.product || 'N/A'],
          ['Versión', device.shodanData.version || 'N/A'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (device.vulnerabilities?.length) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('Vulnerabilidades (Vulners)', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['CVE ID', 'Severidad', 'Descripción']],
        body: device.vulnerabilities.map((v) => [v.cveId, v.severity, v.description.substring(0, 100) + '...']),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (device.greyNoiseData) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('Datos de GreyNoise', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Campo', 'Valor']],
        body: [
          ['Clasificación', device.greyNoiseData.classification],
          ['Nombre', device.greyNoiseData.name || 'N/A'],
          ['Última Vez Visto', device.greyNoiseData.lastSeen || 'N/A'],
          ['Ruido', device.greyNoiseData.noise ? 'Sí' : 'No'],
          ['RIOT', device.greyNoiseData.riot ? 'Sí' : 'No'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    doc.save(`Reporte_Dispositivo_${device.ipAddress}.pdf`);
  };

  const csvData = devices.map((device) => ({
    IP: device.ipAddress,
    Nombre: device.name,
    Tipo: device.type || 'N/A',
    Sistema_Operativo: device.os || 'N/A',
    Puertos: device.ports?.join(', ') || 'N/A',
    Vulnerabilidades: device.vulnerabilities?.map((v) => v.cveId).join(', ') || 'N/A',
    Estado: device.status || 'N/A',
    Uso_CPU: `${device.cpuUsage}%`,
    Uso_Memoria: `${device.memoryUsage}%`,
    Ultimo_Escaneo: device.lastScanned ? new Date(device.lastScanned).toLocaleString() : 'N/A',
    Creado: device.createdAt ? new Date(device.createdAt).toLocaleString() : 'N/A',
  }));

  return (
    <TokenGuard>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 bg-[#121212] min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold text-[#8B0000] mb-4 sm:mb-0">Gestión de Dispositivos de Red</h1>
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleScanNetwork}
              disabled={isScanning}
              className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            >
              <Scan className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              Escanear Red
            </motion.button>
            <CSVLink
              data={csvData}
              filename={`dispositivos-${new Date().toISOString().split('T')[0]}.csv`}
              className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
            >
              <Download className="w-5 h-5" />
              Exportar CSV
            </CSVLink>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">{error}</div>
        )}

        <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">{editingDevice ? 'Editar Dispositivo' : 'Añadir Dispositivo'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <input
              type="text"
              placeholder="Dirección IP"
              value={editingDevice ? editingDevice.ipAddress : newDevice.ipAddress}
              onChange={(e) =>
                editingDevice
                  ? setEditingDevice({ ...editingDevice, ipAddress: e.target.value })
                  : setNewDevice({ ...newDevice, ipAddress: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Nombre"
              value={editingDevice ? editingDevice.name : newDevice.name}
              onChange={(e) =>
                editingDevice
                  ? setEditingDevice({ ...editingDevice, name: e.target.value })
                  : setNewDevice({ ...newDevice, name: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Tipo"
              value={editingDevice ? editingDevice.type || '' : newDevice.type}
              onChange={(e) =>
                editingDevice
                  ? setEditingDevice({ ...editingDevice, type: e.target.value })
                  : setNewDevice({ ...newDevice, type: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Sistema Operativo"
              value={editingDevice ? editingDevice.os || '' : newDevice.os}
              onChange={(e) =>
                editingDevice
                  ? setEditingDevice({ ...editingDevice, os: e.target.value })
                  : setNewDevice({ ...newDevice, os: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            {editingDevice ? (
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEditDevice}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 flex-1"
                >
                  <Edit className="w-5 h-5" />
                  Actualizar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingDevice(null)}
                  disabled={isLoading}
                  className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 flex-1"
                >
                  Cancelar
                </motion.button>
              </div>
            ) : (
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleAddDevice}
                disabled={isLoading}
                className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Añadir Dispositivo
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar dispositivos..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
            disabled={isLoading}
          >
            <option value="">Todos los Tipos</option>
            {deviceTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Lista de Dispositivos</h2>
          {isLoading ? (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-[#8B0000]" />
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-[#8B0000] h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-gray-400 mt-2">Cargando dispositivos... {Math.round(progress)}%</p>
            </div>
          ) : devices.length === 0 ? (
            <p className="text-gray-500">No se encontraron dispositivos. Añade uno o escanea la red.</p>
          ) : (
            <>
              <DeviceTable
                devices={devices}
                onEdit={setEditingDevice}
                onDelete={handleDeleteDevice}
                onViewDetails={setSelectedDevice}
                isLoading={isLoading}
              />
              {totalPages > 1 && (
                <div className="mt-4 flex justify-between items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1 || isLoading}
                    className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Anterior
                  </motion.button>
                  <span className="text-sm text-gray-300">
                    Página {currentPage} de {totalPages}
                  </span>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || isLoading}
                    className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
                  >
                    Siguiente
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedDevice && (
          <Dialog open={!!selectedDevice} onOpenChange={() => setSelectedDevice(null)}>
            <DialogContent className="max-w-3xl bg-[#1C1C1C] text-gray-300 border-[#8B0000]/30">
              <DialogHeader>
                <DialogTitle>
                  Reporte de Dispositivo: {selectedDevice.name} ({selectedDevice.ipAddress})
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <table className="min-w-full divide-y divide-[#8B0000]/30">
                  <thead className="bg-[#2A2A2A]">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Campo</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#8B0000]/30">
                    <tr>
                      <td className="px-4 py-2">Nombre</td>
                      <td className="px-4 py-2">{selectedDevice.name}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">IP</td>
                      <td className="px-4 py-2">{selectedDevice.ipAddress}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Tipo</td>
                      <td className="px-4 py-2">{selectedDevice.type || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Sistema Operativo</td>
                      <td className="px-4 py-2">{selectedDevice.os || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Puertos</td>
                      <td className="px-4 py-2">{selectedDevice.ports?.join(', ') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Estado</td>
                      <td className="px-4 py-2">{selectedDevice.status || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Uso de CPU</td>
                      <td className="px-4 py-2">{selectedDevice.cpuUsage}%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Uso de Memoria</td>
                      <td className="px-4 py-2">{selectedDevice.memoryUsage}%</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Último Escaneo</td>
                      <td className="px-4 py-2">
                        {selectedDevice.lastScanned ? new Date(selectedDevice.lastScanned).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Creado</td>
                      <td className="px-4 py-2">
                        {selectedDevice.createdAt ? new Date(selectedDevice.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {selectedDevice.shodanData && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300">Datos de Shodan</h3>
                    <table className="min-w-full divide-y divide-[#8B0000]/30">
                      <thead className="bg-[#2A2A2A]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Campo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#8B0000]/30">
                        <tr>
                          <td className="px-4 py-2">IP</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.ip}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">SO</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.os || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Organización</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.org || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Puertos</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.ports.join(', ') || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Vulnerabilidades</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.vulns.join(', ') || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Producto</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.product || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Versión</td>
                          <td className="px-4 py-2">{selectedDevice.shodanData.version || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedDevice.vulnerabilities?.length ? (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300">Vulnerabilidades</h3>
                    <table className="min-w-full divide-y divide-[#8B0000]/30">
                      <thead className="bg-[#2A2A2A]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">CVE ID</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Severidad</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Descripción</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Enlace</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#8B0000]/30">
                        {selectedDevice.vulnerabilities.map((vuln) => (
                          <tr key={vuln.cveId}>
                            <td className="px-4 py-2">{vuln.cveId}</td>
                            <td className="px-4 py-2">{vuln.severity}</td>
                            <td className="px-4 py-2">{vuln.description}</td>
                            <td className="px-4 py-2">
                              {vuln.link && z.string().url().safeParse(vuln.link).success ? (
                                <a
                                  href={vuln.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-400 hover:underline flex items-center gap-1"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                  Detalles
                                </a>
                              ) : (
                                'N/A'
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {selectedDevice.greyNoiseData && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-300">Datos de GreyNoise</h3>
                    <table className="min-w-full divide-y divide-[#8B0000]/30">
                      <thead className="bg-[#2A2A2A]">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Campo</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400">Valor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#8B0000]/30">
                        <tr>
                          <td className="px-4 py-2">Clasificación</td>
                          <td className="px-4 py-2">{selectedDevice.greyNoiseData.classification}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Nombre</td>
                          <td className="px-4 py-2">{selectedDevice.greyNoiseData.name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Última Vez Visto</td>
                          <td className="px-4 py-2">{selectedDevice.greyNoiseData.lastSeen || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Ruido</td>
                          <td className="px-4 py-2">{selectedDevice.greyNoiseData.noise ? 'Sí' : 'No'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">RIOT</td>
                          <td className="px-4 py-2">{selectedDevice.greyNoiseData.riot ? 'Sí' : 'No'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => generatePDF(selectedDevice)}
                  className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  <FileText className="w-5 h-5" />
                  Exportar a PDF
                </motion.button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </motion.div>
    </TokenGuard>
  );
}