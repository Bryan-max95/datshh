'use client';
import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CSVLink } from 'react-csv';
import { Plus, Trash2, Search, Download, RefreshCw } from 'lucide-react';
import { fetchCameras, addCamera, deleteCamera, scanCameras, fetchShodanData, fetchGreyNoiseData, fetchVulnersData } from '../lib/api';
import { Camera, ShodanData, GreyNoiseData } from '../../types';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { Loader2 } from 'lucide-react';

const CameraInputSchema = z.object({
  ipAddress: z.string().ip('Invalid IP address'),
  name: z.string().min(1, 'Name is required'),
  manufacturer: z.string().optional(),
  model: z.string().optional(),
});

interface FetchCamerasResponse {
  cameras: Camera[];
  totalPages: number;
}

export default function Cameras() {
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [newCamera, setNewCamera] = useState({ ipAddress: '', name: '', manufacturer: '', model: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const camerasPerPage = 10;

  const loadCameras = useCallback(async (page: number, search: string) => {
    try {
      const response = await fetchCameras({ page, limit: camerasPerPage, search });
      
      const data: FetchCamerasResponse = Array.isArray(response)
        ? { cameras: response, totalPages: Math.ceil(response.length / camerasPerPage) }
        : response;

      if (!data.cameras) {
        throw new Error('Invalid response from fetchCameras');
      }

      const enrichedCameras = await Promise.all(
        data.cameras.map(async (camera: Camera) => {
          const shodanData: ShodanData | null = await fetchShodanData(camera.ipAddress).catch(() => null);
          const greyNoiseData: GreyNoiseData | null = await fetchGreyNoiseData(camera.ipAddress).catch(() => null);
          const vulnerabilities = shodanData?.product
            ? await fetchVulnersData(`${shodanData.product} ${shodanData.version || ''}`).catch(() => [])
            : [];
          return {
            ...camera,
            shodanData: shodanData ?? undefined,
            greyNoiseData: greyNoiseData ?? undefined,
            vulnerabilities,
          } as Camera;
        })
      );

      setCameras(enrichedCameras);
      setTotalPages(data.totalPages);
      setError('');
    } catch (error) {
      setError('Failed to load cameras');
      toast.error('Failed to load cameras');
      console.error(error);
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setCurrentPage(1);
      loadCameras(1, value);
    }, 500),
    [loadCameras]
  );

  useEffect(() => {
    loadCameras(currentPage, searchTerm);
  }, [currentPage, loadCameras]);

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const handleAddCamera = async () => {
    try {
      CameraInputSchema.parse(newCamera);
      await addCamera({ ...newCamera, lastScanned: new Date().toISOString() });
      setNewCamera({ ipAddress: '', name: '', manufacturer: '', model: '' });
      await loadCameras(currentPage, searchTerm);
      toast.success('Camera added successfully');
      setError('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Failed to add camera');
        toast.error('Failed to add camera');
        console.error(error);
      }
    }
  };

  const handleDeleteCamera = async (_id: string) => {
    try {
      await deleteCamera(_id);
      await loadCameras(currentPage, searchTerm);
      toast.success('Camera deleted successfully');
      setError('');
    } catch (error) {
      setError('Failed to delete camera');
      toast.error('Failed to delete camera');
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
      await loadCameras(currentPage, searchTerm);
      toast.success('Camera scan completed');
      setError('');
    } catch (error) {
      setError('Failed to scan cameras');
      toast.error('Failed to scan cameras');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const csvData = cameras.map((camera) => ({
    IP: camera.ipAddress,
    Name: camera.name,
    Manufacturer: camera.manufacturer || 'N/A',
    Model: camera.model || 'N/A',
    Ports: camera.ports?.join(', ') || 'N/A',
    Vulnerabilities: camera.vulnerabilities?.map((v: { cveId: any; }) => v.cveId).join(', ') || 'N/A',
    Last_Scanned: camera.lastScanned || 'N/A',
  }));

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-0">IP Cameras</h1>
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
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          <p>{error}</p>
        </div>
      )}

      <div className="bg-gray-50 p-4 sm:p-6 rounded-lg border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Add New Camera</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-4">
          <input
            type="text"
            placeholder="IP Address"
            value={newCamera.ipAddress}
            onChange={(e) => setNewCamera({ ...newCamera, ipAddress: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
          <input
            type="text"
            placeholder="Name"
            value={newCamera.name}
            onChange={(e) => setNewCamera({ ...newCamera, name: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
          <input
            type="text"
            placeholder="Manufacturer"
            value={newCamera.manufacturer}
            onChange={(e) => setNewCamera({ ...newCamera, manufacturer: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
          <input
            type="text"
            placeholder="Model"
            value={newCamera.model}
            onChange={(e) => setNewCamera({ ...newCamera, model: e.target.value })}
            className="bg-white border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleAddCamera}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Camera
          </motion.button>
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-700">Camera List</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search cameras..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-gray-300 text-gray-900 pl-10 pr-4 py-2 rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full"
            />
          </div>
        </div>

        <div className="space-y-4">
          {cameras.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No cameras found. Add a camera or scan your network to get started.
            </div>
          ) : (
            cameras.map((camera) => (
              <div
                key={camera._id}
                className="bg-white hover:bg-gray-50 p-4 rounded-lg border border-gray-200 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-800">{camera.name}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2">
                      <div>
                        <p className="text-xs text-gray-500">IP Address</p>
                        <p className="text-sm font-medium text-gray-700">{camera.ipAddress}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Manufacturer</p>
                        <p className="text-sm font-medium text-gray-700">{camera.manufacturer || 'Unknown'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Model</p>
                        <p className="text-sm font-medium text-gray-700">{camera.model || 'Unknown'}</p>
                      </div>
                    </div>
                    
                    {camera.vulnerabilities?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 mb-1">Vulnerabilities</p>
                        <div className="flex flex-wrap gap-2">
                          {camera.vulnerabilities.map((vuln, index) => (
                            <span 
                              key={index} 
                              className="bg-red-100 text-red-800 text-xs font-medium px-2.5 py-0.5 rounded"
                            >
                              {vuln.cveId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    onClick={() => handleDeleteCamera(camera._id)}
                    className="text-[#8B0000] hover:text-[#6B0000] p-2 rounded-full hover:bg-red-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            ))
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex justify-center mt-6">
            <nav className="inline-flex rounded-md shadow">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-l-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1 border-t border-b border-gray-300 ${
                    currentPage === page 
                      ? 'bg-[#8B0000] text-white border-[#8B0000]' 
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-r-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </nav>
          </div>
        )}
      </div>
    </motion.div>
  );
}