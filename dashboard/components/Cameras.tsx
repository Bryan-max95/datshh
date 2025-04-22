/* src/app/dashboard/components/Cameras.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CSVLink } from 'react-csv';
import { Plus, Trash2, Search, Download, RefreshCw } from 'lucide-react';
import { fetchCameras, addCamera, deleteCamera, scanCameras, fetchShodanData, fetchGreyNoiseData, fetchVulnersData } from '../lib/api';
import { Camera } from '../../types';

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [newCamera, setNewCamera] = useState({ ipAddress: '', name: '', manufacturer: '', model: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const camerasPerPage = 10;

  useEffect(() => {
    loadCameras();
  }, []);

  const loadCameras = async () => {
    try {
      const data = await fetchCameras();
      const enrichedCameras = await Promise.all(
        data.map(async (camera: Camera) => {
          const shodanData = await fetchShodanData(camera.ipAddress);
          const greyNoiseData = await fetchGreyNoiseData(camera.ipAddress);
          const vulnerabilities = shodanData?.product
            ? await fetchVulnersData(`${shodanData.product} ${shodanData.version || ''}`)
            : [];
          return { ...camera, shodanData, greyNoiseData, vulnerabilities };
        })
      );
      setCameras(enrichedCameras);
      setError('');
    } catch (error) {
      setError('Error al cargar cámaras');
      console.error(error);
    }
  };

  const handleAddCamera = async () => {
    try {
      await addCamera(newCamera);
      setNewCamera({ ipAddress: '', name: '', manufacturer: '', model: '' });
      await loadCameras();
      setError('');
    } catch (error) {
      setError('Error al agregar cámara');
      console.error(error);
    }
  };

  const handleDeleteCamera = async (_id: string) => {
    try {
      await deleteCamera(_id);
      await loadCameras();
      setError('');
    } catch (error) {
      setError('Error al eliminar cámara');
      console.error(error);
    }
  };

  const handleScanCameras = async () => {
    setIsScanning(true);
    try {
      const scannedCameras = await scanCameras();
      await Promise.all(
        scannedCameras.map(async (camera: Camera) => {
          await addCamera(camera);
        })
      );
      await loadCameras();
      setError('');
    } catch (error) {
      setError('Error al escanear cámaras');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const filteredCameras = cameras.filter(
    (camera) =>
      camera.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      camera.ipAddress.includes(searchTerm) ||
      camera.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const indexOfLastCamera = currentPage * camerasPerPage;
  const indexOfFirstCamera = indexOfLastCamera - camerasPerPage;
  const currentCameras = filteredCameras.slice(indexOfFirstCamera, indexOfLastCamera);
  const totalPages = Math.ceil(filteredCameras.length / camerasPerPage);

  const csvData = cameras.map((camera) => ({
    IP: camera.ipAddress,
    Nombre: camera.name,
    Fabricante: camera.manufacturer || 'N/A',
    Modelo: camera.model || 'N/A',
    Puertos: camera.ports?.join(', ') || 'N/A',
    Vulnerabilidades: camera.vulnerabilities?.map((v) => v.cveId).join(', ') || 'N/A',
    Último_Escaneo: camera.lastScanned || 'N/A',
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#8B0000]">Cámaras IP</h1>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleScanCameras}
            disabled={isScanning}
            className={`bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 ${
              isScanning ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            Escanear Cámaras
          </motion.button>
          <CSVLink
            data={csvData}
            filename="camaras.csv"
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </CSVLink>
        </div>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Agregar Cámara</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Nombre"
            value={newCamera.name}
            onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="IP"
            value={newCamera.ipAddress}
            onChange={(e) => setNewCamera({ ...newCamera, ipAddress: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Fabricante"
            value={newCamera.manufacturer}
            onChange={(e) => setNewCamera({ ...newCamera, manufacturer: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Modelo"
            value={newCamera.model}
            onChange={(e) => setNewCamera({ ...newCamera, model: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleAddCamera}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Agregar
          </motion.button>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar cámaras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded pl-10 py-2"
          />
        </div>
      </div>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50 table-container">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Lista de Cámaras</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Nombre</th>
              <th>IP</th>
              <th>Fabricante</th>
              <th>Modelo</th>
              <th>Puertos</th>
              <th>Vulnerabilidades</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentCameras.map((camera) => (
              <tr key={camera._id}>
                <td>{camera.name}</td>
                <td>{camera.ipAddress}</td>
                <td>{camera.manufacturer || 'N/A'}</td>
                <td>{camera.model || 'N/A'}</td>
                <td>{camera.ports?.join(', ') || 'N/A'}</td>
                <td>
                  {camera.vulnerabilities?.length ? (
                    <span className="text-red-500">{camera.vulnerabilities.length} detectadas</span>
                  ) : (
                    <span className="text-green-500">Ninguna</span>
                  )}
                </td>
                <td>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    onClick={() => handleDeleteCamera(camera._id)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="pagination">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
          >
            Anterior
          </button>
          <span>
            Página {currentPage} de {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
          >
            Siguiente
          </button>
        </div>
      </div>
    </motion.div>
  );
}