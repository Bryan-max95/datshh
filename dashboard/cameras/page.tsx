'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { CSVLink } from 'react-csv';
import {
  Plus,
  Trash2,
  Search,
  Download,
  RefreshCw,
  Edit,
  FileText,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { fetchCameras, addCamera, deleteCamera, updateCamera, scanCameras, fetchShodanData, fetchGreyNoiseData, fetchVulnersData } from '../lib/api';
import { Camera, ShodanData, GreyNoiseData } from '../../types';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';
import TokenGuard from '../components/TokenGuard';
import CameraTable from '../components/CameraTable';
import sanitizeHtml from 'sanitize-html';

const CameraInputSchema = z.object({
  ipAddress: z.string().ip('Dirección IP inválida'),
  name: z.string().min(1, 'El nombre es requerido'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
});

interface FetchCamerasParams {
  page: number;
  limit: number;
  search?: string;
  manufacturer?: string;
  model?: string;
}

interface FetchCamerasResponse {
  cameras: Camera[];
  totalPages: number;
}

interface CachedData {
  shodan: ShodanData | null;
  greynoise: GreyNoiseData | null;
  vulners: { cveId: string; severity: string; description: string; link?: string }[];
  timestamp: number;
}

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [newCamera, setNewCamera] = useState({ ipAddress: '', name: '', manufacturer: '', model: '' });
  const [editingCamera, setEditingCamera] = useState<Camera | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterManufacturer, setFilterManufacturer] = useState('');
  const [filterModel, setFilterModel] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [progress, setProgress] = useState(0);

  const camerasPerPage = 10;
  const cacheTTL = 24 * 60 * 60 * 1000; // 24 horas

  // Caché persistente usando localStorage
  const getCachedData = (ip: string): CachedData | null => {
    const cached = localStorage.getItem(`camera_cache_${ip}`);
    if (!cached) return null;
    const data: CachedData = JSON.parse(cached);
    if (Date.now() - data.timestamp > cacheTTL) {
      localStorage.removeItem(`camera_cache_${ip}`);
      return null;
    }
    return data;
  };

  const setCachedData = (ip: string, data: CachedData) => {
    localStorage.setItem(`camera_cache_${ip}`, JSON.stringify({ ...data, timestamp: Date.now() }));
  };

  // Calcular fabricantes y modelos con useMemo
  const cameraManufacturers = useMemo(
    () => Array.from(new Set(cameras.map((c) => c.manufacturer || '').filter((m) => m))),
    [cameras]
  );
  const cameraModels = useMemo(
    () => Array.from(new Set(cameras.map((c) => c.model || '').filter((m) => m))),
    [cameras]
  );

  /**
   * Carga las cámaras desde la API y enriquece con datos de Shodan, GreyNoise y Vulners
   * @param page Página actual
   * @param search Término de búsqueda
   * @param manufacturer Filtro por fabricante
   * @param model Filtro por modelo
   */
  const loadCameras = async (page: number, search: string, manufacturer: string, model: string) => {
    setIsLoading(true);
    setProgress(0);
    try {
      const response: FetchCamerasResponse = await fetchCameras({
        page,
        limit: camerasPerPage,
        search: sanitizeHtml(search),
        ...(manufacturer ? { manufacturer: sanitizeHtml(manufacturer) } : {}),
        ...(model ? { model: sanitizeHtml(model) } : {}),
      });

      const totalCameras = response.cameras.length;
      let processed = 0;

      const enrichedCameras = await Promise.all(
        response.cameras.map(async (camera: Camera) => {
          const cachedData = getCachedData(camera.ipAddress);
          if (cachedData) {
            processed++;
            setProgress((processed / totalCameras) * 100);
            return {
              ...camera,
              shodanData: cachedData.shodan ?? undefined,
              greyNoiseData: cachedData.greynoise ?? undefined,
              vulnerabilities: cachedData.vulners,
            };
          }

          const [shodanData, greyNoiseData]: [ShodanData | null, GreyNoiseData | null] = await Promise.all([
            fetchShodanData(camera.ipAddress).catch(() => null),
            fetchGreyNoiseData(camera.ipAddress).catch(() => null),
          ]);

          const vulnerabilities = shodanData?.product
            ? await fetchVulnersData(`${shodanData.product} ${shodanData.version || ''}`).catch(() => [])
            : [];

          const analysis: CachedData = { shodan: shodanData, greynoise: greyNoiseData, vulners: vulnerabilities, timestamp: Date.now() };
          setCachedData(camera.ipAddress, analysis);

          processed++;
          setProgress((processed / totalCameras) * 100);

          return {
            ...camera,
            shodanData: shodanData ?? undefined,
            greyNoiseData: greyNoiseData ?? undefined,
            vulnerabilities,
          };
        })
      );

      setCameras(enrichedCameras);
      setTotalPages(response.totalPages);
      setError('');
      toast.success(`Cargadas ${enrichedCameras.length} cámaras`);
    } catch (error) {
      setError('Error al cargar cámaras');
      toast.error('Error al cargar cámaras');
      console.error(error);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  useEffect(() => {
    loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
  }, [currentPage, searchTerm, filterManufacturer, filterModel]);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value);
      setCurrentPage(1);
    }, 500),
    []
  );

  /**
   * Añade una nueva cámara validando los datos
   */
  const handleAddCamera = async () => {
    try {
      const sanitizedCamera = {
        ipAddress: sanitizeHtml(newCamera.ipAddress),
        name: sanitizeHtml(newCamera.name),
        manufacturer: sanitizeHtml(newCamera.manufacturer),
        model: sanitizeHtml(newCamera.model),
      };
      CameraInputSchema.parse(sanitizedCamera);
      await addCamera({
        ...sanitizedCamera,
        lastScanned: new Date().toISOString(),
        ports: [],
        userId: '', // Se asignará en el servidor
        createdAt: new Date().toISOString(),
      });
      setNewCamera({ ipAddress: '', name: '', manufacturer: '', model: '' });
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.success('Cámara añadida exitosamente');
      setError('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Error al añadir cámara');
        toast.error('Error al añadir cámara');
        console.error(error);
      }
    }
  };

  /**
   * Actualiza una cámara existente
   */
  const handleEditCamera = async () => {
    if (!editingCamera) return;
    try {
      const sanitizedCamera = {
        ipAddress: sanitizeHtml(editingCamera.ipAddress),
        name: sanitizeHtml(editingCamera.name),
        manufacturer: sanitizeHtml(editingCamera.manufacturer || ''),
        model: sanitizeHtml(editingCamera.model || ''),
      };
      CameraInputSchema.parse(sanitizedCamera);
      await updateCamera({ ...editingCamera, ...sanitizedCamera });
      setEditingCamera(null);
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.success('Cámara actualizada exitosamente');
      setError('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Error al actualizar cámara');
        toast.error('Error al actualizar cámara');
        console.error(error);
      }
    }
  };

  /**
   * Elimina una cámara
   * @param _id ID de la cámara
   */
  const handleDeleteCamera = async (_id: string) => {
    try {
      await deleteCamera(_id);
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.success('Cámara eliminada exitosamente');
      setError('');
    } catch (error) {
      setError('Error al eliminar cámara');
      toast.error('Error al eliminar cámara');
      console.error(error);
    }
  };

  /**
   * Escanea la red para detectar nuevas cámaras
   */
  const handleScanCameras = async () => {
    setIsScanning(true);
    toast.info('Escaneando cámaras...', { autoClose: false, closeButton: false });
    try {
      const scannedCameras = await scanCameras();
      const CameraScanSchema = z.object({
        ipAddress: z.string().ip(),
        name: z.string().min(1),
        manufacturer: z.string().optional(),
        model: z.string().optional(),
        ports: z.array(z.number()).optional(),
      });
      const validatedCameras = scannedCameras.map((camera: Camera) =>
        CameraScanSchema.parse({
          ...camera,
          ports: camera.ports || [],
        })
      );
      if (validatedCameras.length > 0) {
        await Promise.all(
          validatedCameras.map(async (camera) => {
            await addCamera({
              ...camera,
              ports: camera.ports || [],
              lastScanned: new Date().toISOString(),
              userId: '', // Se asignará en el servidor
              createdAt: new Date().toISOString(),
            });
          })
        );
      }
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.dismiss();
      toast.success(`Encontradas y añadidas ${validatedCameras.length} cámaras`);
      setError('');
    } catch (error) {
      toast.dismiss();
      setError('Error al escanear cámaras');
      toast.error('Error al escanear cámaras');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  /**
   * Genera un reporte PDF para una cámara
   * @param camera Datos de la cámara
   */
  const generatePDF = (camera: Camera) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Reporte de Cámara: ${camera.name} (${camera.ipAddress})`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 20, 30);

    autoTable(doc, {
      startY: 40,
      head: [['Campo', 'Valor']],
      body: [
        ['Nombre', camera.name],
        ['IP', camera.ipAddress],
        ['Fabricante', camera.manufacturer || 'N/A'],
        ['Modelo', camera.model || 'N/A'],
        ['Puertos', camera.ports?.join(', ') || 'N/A'],
        ['Último Escaneo', camera.lastScanned ? new Date(camera.lastScanned).toLocaleString() : 'N/A'],
        ['Creado', camera.createdAt ? new Date(camera.createdAt).toLocaleString() : 'N/A'],
      ],
      styles: { fontSize: 10 },
      headStyles: { fillColor: [139, 0, 0] },
    });

    if (camera.shodanData) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('Datos de Shodan', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Campo', 'Valor']],
        body: [
          ['IP', camera.shodanData.ip],
          ['SO', camera.shodanData.os || 'N/A'],
          ['Organización', camera.shodanData.org || 'N/A'],
          ['Puertos', camera.shodanData.ports.join(', ') || 'N/A'],
          ['Vulnerabilidades', camera.shodanData.vulns.join(', ') || 'N/A'],
          ['Producto', camera.shodanData.product || 'N/A'],
          ['Versión', camera.shodanData.version || 'N/A'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (camera.vulnerabilities?.length) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('Vulnerabilidades (Vulners)', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['CVE ID', 'Severidad', 'Descripción']],
        body: camera.vulnerabilities.map((v) => [v.cveId, v.severity, v.description.substring(0, 100) + '...']),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (camera.greyNoiseData) {
      const finalY = (doc as any).lastAutoTable.finalY;
      doc.setFontSize(14);
      doc.text('Datos de GreyNoise', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Campo', 'Valor']],
        body: [
          ['Clasificación', camera.greyNoiseData.classification],
          ['Nombre', camera.greyNoiseData.name || 'N/A'],
          ['Última Vez Visto', camera.greyNoiseData.lastSeen || 'N/A'],
          ['Ruido', camera.greyNoiseData.noise ? 'Sí' : 'No'],
          ['RIOT', camera.greyNoiseData.riot ? 'Sí' : 'No'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    doc.save(`Reporte_Camara_${camera.ipAddress}.pdf`);
  };

  const csvData = cameras.map((camera) => ({
    IP: camera.ipAddress,
    Nombre: camera.name,
    Fabricante: camera.manufacturer || 'N/A',
    Modelo: camera.model || 'N/A',
    Puertos: camera.ports?.join(', ') || 'N/A',
    Vulnerabilidades: camera.vulnerabilities?.map((v) => v.cveId).join(', ') || 'N/A',
    Ultimo_Escaneo: camera.lastScanned ? new Date(camera.lastScanned).toLocaleString() : 'N/A',
    Creado: camera.createdAt ? new Date(camera.createdAt).toLocaleString() : 'N/A',
  }));

  return (
    <TokenGuard>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6 bg-[#121212] min-h-screen">
        <div className="flex flex-col sm:flex-row justify-between items-center">
          <h1 className="text-3xl font-bold text-[#8B0000] mb-4 sm:mb-0">Gestión de Cámaras</h1>
          <div className="flex gap-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleScanCameras}
              disabled={isScanning}
              className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              Escanear Cámaras
            </motion.button>
            <CSVLink
              data={csvData}
              filename={`camaras-${new Date().toISOString().split('T')[0]}.csv`}
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
          <h2 className="text-lg font-semibold text-gray-300 mb-4">{editingCamera ? 'Editar Cámara' : 'Añadir Cámara'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
            <input
              type="text"
              placeholder="Dirección IP"
              value={editingCamera ? editingCamera.ipAddress : newCamera.ipAddress}
              onChange={(e) =>
                editingCamera
                  ? setEditingCamera({ ...editingCamera, ipAddress: e.target.value })
                  : setNewCamera({ ...newCamera, ipAddress: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Nombre"
              value={editingCamera ? editingCamera.name : newCamera.name}
              onChange={(e) =>
                editingCamera
                  ? setEditingCamera({ ...editingCamera, name: e.target.value })
                  : setNewCamera({ ...newCamera, name: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Fabricante"
              value={editingCamera ? editingCamera.manufacturer || '' : newCamera.manufacturer}
              onChange={(e) =>
                editingCamera
                  ? setEditingCamera({ ...editingCamera, manufacturer: e.target.value })
                  : setNewCamera({ ...newCamera, manufacturer: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            <input
              type="text"
              placeholder="Modelo"
              value={editingCamera ? editingCamera.model || '' : newCamera.model}
              onChange={(e) =>
                editingCamera
                  ? setEditingCamera({ ...editingCamera, model: e.target.value })
                  : setNewCamera({ ...newCamera, model: e.target.value })
              }
              className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
            {editingCamera ? (
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleEditCamera}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded flex items-center gap-2 flex-1"
                >
                  <Edit className="w-5 h-5" />
                  Actualizar
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setEditingCamera(null)}
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
                onClick={handleAddCamera}
                disabled={isLoading}
                className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Añadir Cámara
              </motion.button>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar cámaras..."
              onChange={(e) => debouncedSearch(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
            />
          </div>
          <select
            value={filterManufacturer}
            onChange={(e) => {
              setFilterManufacturer(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
            disabled={isLoading}
          >
            <option value="">Todos los Fabricantes</option>
            {cameraManufacturers.map((manufacturer) => (
              <option key={manufacturer} value={manufacturer}>
                {manufacturer}
              </option>
            ))}
          </select>
          <select
            value={filterModel}
            onChange={(e) => {
              setFilterModel(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
            disabled={isLoading}
          >
            <option value="">Todos los Modelos</option>
            {cameraModels.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
          <h2 className="text-lg font-semibold text-gray-300 mb-4">Lista de Cámaras</h2>
          {isLoading ? (
            <div className="flex flex-col items-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-[#8B0000]" />
              <div className="mt-2 w-full bg-gray-700 rounded-full h-2.5">
                <div
                  className="bg-[#8B0000] h-2.5 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-gray-400 mt-2">Cargando cámaras... {Math.round(progress)}%</p>
            </div>
          ) : cameras.length === 0 ? (
            <p className="text-gray-500">No se encontraron cámaras. Añade una o escanea la red.</p>
          ) : (
            <>
              <CameraTable
                cameras={cameras}
                onEdit={setEditingCamera}
                onDelete={handleDeleteCamera}
                onViewDetails={setSelectedCamera}
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
                    <ChevronLeft className="w-5 h-5" />
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
                    <ChevronRight className="w-5 h-5" />
                  </motion.button>
                </div>
              )}
            </>
          )}
        </div>

        {selectedCamera && (
          <Dialog open={!!selectedCamera} onOpenChange={() => setSelectedCamera(null)}>
            <DialogContent className="max-w-3xl bg-[#1C1C1C] text-gray-300 border-[#8B0000]/30">
              <DialogHeader>
                <DialogTitle>
                  Reporte de Cámara: {selectedCamera.name} ({selectedCamera.ipAddress})
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
                      <td className="px-4 py-2">{selectedCamera.name}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">IP</td>
                      <td className="px-4 py-2">{selectedCamera.ipAddress}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Fabricante</td>
                      <td className="px-4 py-2">{selectedCamera.manufacturer || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Modelo</td>
                      <td className="px-4 py-2">{selectedCamera.model || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Puertos</td>
                      <td className="px-4 py-2">{selectedCamera.ports?.join(', ') || 'N/A'}</td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Último Escaneo</td>
                      <td className="px-4 py-2">
                        {selectedCamera.lastScanned ? new Date(selectedCamera.lastScanned).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2">Creado</td>
                      <td className="px-4 py-2">
                        {selectedCamera.createdAt ? new Date(selectedCamera.createdAt).toLocaleString() : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>

                {selectedCamera.shodanData && (
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
                          <td className="px-4 py-2">{selectedCamera.shodanData.ip}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">SO</td>
                          <td className="px-4 py-2">{selectedCamera.shodanData.os || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Organización</td>
                          <td className="px-4 py-2">{selectedCamera.shodanData.org || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Puertos</td>
                          <td className="px-4 py-2">{selectedCamera.shodanData.ports.join(', ') || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Vulnerabilidades</td>
                          <td className="px-4 py-2">{selectedCamera.shodanData.vulns.join(', ') || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Producto</td>
                          <td className="px-4 py-2">{selectedCamera.shodanData.product || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Versión</td>
                          <td className="px-4 py-2">{selectedCamera.shodanData.version || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                {selectedCamera.vulnerabilities?.length ? (
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
                        {selectedCamera.vulnerabilities.map((vuln) => (
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

                {selectedCamera.greyNoiseData && (
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
                          <td className="px-4 py-2">{selectedCamera.greyNoiseData.classification}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Nombre</td>
                          <td className="px-4 py-2">{selectedCamera.greyNoiseData.name || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Última Vez Visto</td>
                          <td className="px-4 py-2">{selectedCamera.greyNoiseData.lastSeen || 'N/A'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">Ruido</td>
                          <td className="px-4 py-2">{selectedCamera.greyNoiseData.noise ? 'Sí' : 'No'}</td>
                        </tr>
                        <tr>
                          <td className="px-4 py-2">RIOT</td>
                          <td className="px-4 py-2">{selectedCamera.greyNoiseData.riot ? 'Sí' : 'No'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => generatePDF(selectedCamera)}
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