/* src/app/dashboard/components/Cameras.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { CSVLink } from 'react-csv';
import { Plus, Trash2, Search, Download, RefreshCw } from 'lucide-react';
import { fetchCameras, addCamera, deleteCamera, scanCameras, fetchShodanData, fetchGreyNoiseData, fetchVulnersData } from '../lib/api';
import { Camera } from '../../types';
import { useSession } from 'next-auth/react';
import { z } from 'zod';

const CameraInputSchema = z.object({
  ipAddress: z.string().ip('Invalid IP address'),
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
});

export default function Cameras() {
  const { data: session, status } = useSession();
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [newCamera, setNewCamera] = useState({ ipAddress: '', name: '', manufacturer: '', model: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const camerasPerPage = 10;

  useEffect(() => {
    if (status === 'authenticated') {
      loadCameras();
    }
  }, [status]);

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
      setError('Failed to load cameras');
      console.error(error);
    }
  };

  const handleAddCamera = async () => {
    if (status !== 'authenticated') {
      setError('Please log in to add cameras');
      return;
    }
    try {
      CameraInputSchema.parse(newCamera);
      await addCamera({ ...newCamera, lastScanned: new Date().toISOString() });
      setNewCamera({ ipAddress: '', name: '', manufacturer: '', model: '' });
      await loadCameras();
      setError('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Failed to add camera');
        console.error(error);
      }
    }
  };

  const handleDeleteCamera = async (_id: string) => {
    if (status !== 'authenticated') {
      setError('Please log in to delete cameras');
      return;
    }
    try {
      await deleteCamera(_id);
      await loadCameras();
      setError('');
    } catch (error) {
      setError('Failed to delete camera');
      console.error(error);
    }
  };

  const handleScanCameras = async () => {
    if (status !== 'authenticated') {
      setError('Please log in to scan cameras');
      return;
    }
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
      setError('Failed to scan cameras');
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
    Name: camera.name,
    Manufacturer: camera.manufacturer || 'N/A',
    Model: camera.model || 'N/A',
    Ports: camera.ports?.join(', ') || 'N/A',
    Vulnerabilities: camera.vulnerabilities?.map((v) => v.cveId).join(', ') || 'N/A',
    Last_Scanned: camera.lastScanned || 'N/A',
  }));

  if (status === 'loading') return <div className="text-gray-400 p-6">Loading...</div>;
  if (status !== 'authenticated') return <div className="text-red-500 p-6">Please log in to continue.</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#8B0000]">IP Cameras</h1>
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
            Scan Cameras
          </motion.button>
          <CSVLink
            data={csvData}
            filename="cameras.csv"
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </CSVLink>
        </div>
      </div>
      {error && <p className="text-red-500">{error}</p>}
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Add Camera</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="IP Address"
            value={newCamera.ipAddress}
            onChange={(e) => setNewCamera({ ...newCamera, ipAddress: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Name"
            value={newCamera.name}
            onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Manufacturer"
            value={newCamera.manufacturer}
            onChange={(e) => setNewCamera({ ...newCamera, manufacturer: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Model"
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
            Add
          </motion.button>
        </div>
      </div>
      <div className="flex gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search cameras..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded pl-10 py-2"
          />
        </div>
      </div>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Camera List</h2>
        {cameras.length === 0 ? (
          <p className="text-gray-400">No cameras found.</p>
        ) : (
          <>
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>IP Address</th>
                    <th>Manufacturer</th>
                    <th>Model</th>
                    <th>Ports</th>
                    <th>Vulnerabilities</th>
                    <th>Actions</th>
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
                      <td>{camera.vulnerabilities?.map((v) => v.cveId).join(', ') || 'None'}</td>
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
            </div>
            <div className="pagination mt-4 flex justify-between items-center">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}