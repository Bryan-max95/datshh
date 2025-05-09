'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { CSVLink } from 'react-csv';
import { Plus, Trash2, Search, Download, RefreshCw, Edit, FileText, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { fetchCameras, addCamera, deleteCamera, updateCamera, scanCameras, fetchShodanData, fetchGreyNoiseData, fetchVulnersData } from '../lib/api';
import { Camera, ShodanData, GreyNoiseData } from '../../types';
import { z } from 'zod';
import { toast } from 'react-toastify';
import { debounce } from 'lodash';
import { Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/Dialog';

const CameraInputSchema = z.object({
  ipAddress: z.string().ip('Invalid IP address'),
  name: z.string().min(1, 'Name is required'),
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
  const camerasPerPage = 10;
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);

  // Cache for API data
  const cache = new Map<string, { shodan: ShodanData | null; greynoise: GreyNoiseData | null; vulners: { cveId: string; severity: string; description: string; link?: string }[] }>();

  const manufacturers = Array.from(new Set(cameras.map((c) => c.manufacturer || '').filter((m) => m)));
  const models = Array.from(new Set(cameras.map((c) => c.model || '').filter((m) => m)));

  const loadCameras = useCallback(
    async (page: number, search: string, manufacturer: string, model: string) => {
      setIsLoading(true);
      try {
        const response: FetchCamerasResponse = await fetchCameras({
          page,
          limit: camerasPerPage,
          search,
          ...(manufacturer ? { manufacturer } : {}),
          ...(model ? { model } : {}),
        });

        const enrichedCameras = await Promise.all(
          response.cameras.map(async (camera: Camera) => {
            if (cache.has(camera.ipAddress)) {
              const cached = cache.get(camera.ipAddress)!;
              return {
                ...camera,
                shodanData: cached.shodan ?? undefined,
                greyNoiseData: cached.greynoise ?? undefined,
                vulnerabilities: cached.vulners,
              } as Camera;
            }

            const [shodanData, greyNoiseData]: [ShodanData | null, GreyNoiseData | null] = await Promise.all([
              fetchShodanData(camera.ipAddress).catch(() => null),
              fetchGreyNoiseData(camera.ipAddress).catch(() => null),
            ]);

            const vulnerabilities = shodanData?.product
              ? await fetchVulnersData(`${shodanData.product} ${shodanData.version || ''}`).catch(() => [])
              : [];

            const analysis = { shodan: shodanData, greynoise: greyNoiseData, vulners: vulnerabilities };
            cache.set(camera.ipAddress, analysis);

            return {
              ...camera,
              shodanData: shodanData ?? undefined,
              greyNoiseData: greyNoiseData ?? undefined,
              vulnerabilities,
            } as Camera;
          })
        );

        setCameras(enrichedCameras);
        setTotalPages(response.totalPages);
        setError('');
        toast.success(`Loaded ${enrichedCameras.length} cameras`);
      } catch (error) {
        setError('Failed to load cameras');
        toast.error('Failed to load cameras');
        console.error(error);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setCurrentPage(1);
      loadCameras(1, value, filterManufacturer, filterModel);
    }, 500),
    [loadCameras, filterManufacturer, filterModel]
  );

  useEffect(() => {
    loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
  }, [currentPage, loadCameras, filterManufacturer, filterModel]);

  useEffect(() => {
    debouncedSearch(searchTerm);
    return () => debouncedSearch.cancel();
  }, [searchTerm, debouncedSearch]);

  const handleAddCamera = async () => {
    try {
      CameraInputSchema.parse(newCamera);
      await addCamera({
        ...newCamera,
        lastScanned: new Date().toISOString(),
        ports: [],
      });
      setNewCamera({ ipAddress: '', name: '', manufacturer: '', model: '' });
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.success('Camera added successfully');
      setError('');
    } catch (error: any) {
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

  const handleEditCamera = async () => {
    if (!editingCamera) return;
    try {
      CameraInputSchema.parse(editingCamera);
      await updateCamera(editingCamera._id, editingCamera);
      setEditingCamera(null);
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.success('Camera updated successfully');
      setError('');
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
        toast.error(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('Failed to update camera');
        toast.error('Failed to update camera');
        console.error(error);
      }
    }
  };

  const handleDeleteCamera = async (_id: string) => {
    try {
      await deleteCamera(_id);
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
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
    toast.info('Scanning network for cameras...', { autoClose: false, closeButton: false });
    try {
      const scannedCameras = await scanCameras();
      if (scannedCameras.length > 0) {
        await Promise.all(
          scannedCameras.map(async (camera: Camera) => {
            await addCamera({
              ...camera,
              ports: camera.ports || [], // Asegúrate de que 'ports' nunca sea undefined
            });
          })
        );
      }
      await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
      toast.dismiss();
      toast.success(`Found and added ${scannedCameras.length} cameras`);
      setError('');
    } catch (error) {
      toast.dismiss();
      setError('Failed to scan cameras');
      toast.error('Failed to scan cameras');
      console.error(error);
    } finally {
      setIsScanning(false);
    }
  };

  const handleRefreshCameras = async () => {
    toast.info('Refreshing camera data...');
    await loadCameras(currentPage, searchTerm, filterManufacturer, filterModel);
  };

  const generatePDF = (camera: Camera) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text(`Camera Report: ${camera.name} (${camera.ipAddress})`, 20, 20);
    doc.setFontSize(12);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, 20, 30);

    if (camera.shodanData) {
      doc.setFontSize(14);
      doc.text('Shodan Data', 20, 40);
      autoTable(doc, {
        startY: 45,
        head: [['Field', 'Value']],
        body: [
          ['IP', camera.shodanData.ip],
          ['OS', camera.shodanData.os || 'N/A'],
          ['Organization', camera.shodanData.org || 'N/A'],
          ['Ports', camera.shodanData.ports.join(', ') || 'None'],
          ['Vulnerabilities', camera.shodanData.vulns.join(', ') || 'None'],
          ['Product', camera.shodanData.product || 'N/A'],
          ['Version', camera.shodanData.version || 'N/A'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (camera.vulnerabilities?.length) {
      const finalY = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(14);
      doc.text('Vulnerabilities (Vulners)', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['CVE ID', 'Severity', 'Description']],
        body: camera.vulnerabilities.map((v) => [v.cveId, v.severity, v.description.substring(0, 100) + '...']),
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    if (camera.greyNoiseData) {
      const finalY = (doc as any).lastAutoTable.finalY || 60;
      doc.setFontSize(14);
      doc.text('GreyNoise Data', 20, finalY + 10);
      autoTable(doc, {
        startY: finalY + 15,
        head: [['Field', 'Value']],
        body: [
          ['Classification', camera.greyNoiseData.classification],
          ['Name', camera.greyNoiseData.name || 'N/A'],
          ['Last Seen', camera.greyNoiseData.lastSeen || 'N/A'],
          ['Noise', camera.greyNoiseData.noise ? 'Yes' : 'No'],
          ['RIOT', camera.greyNoiseData.riot ? 'Yes' : 'No'],
        ],
        styles: { fontSize: 10 },
        headStyles: { fillColor: [139, 0, 0] },
      });
    }

    doc.save(`Camera_Report_${camera.ipAddress}.pdf`);
  };

  const csvData = cameras.map((camera) => ({
    IP: camera.ipAddress,
    Name: camera.name,
    Manufacturer: camera.manufacturer || 'N/A',
    Model: camera.model || 'N/A',
    Ports: camera.ports?.join(', ') || 'N/A',
    Vulnerabilities: camera.vulnerabilities?.map((v) => v.cveId).join(', ') || 'N/A',
    Last_Scanned: camera.lastScanned || 'N/A',
    Risk_Level: camera.vulnerabilities?.length ? 'High' : 'Low',
  }));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center">
        <h1 className="text-3xl font-bold text-[#8B0000] mb-4 sm:mb-0">IP Cameras Management</h1>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleRefreshCameras}
            disabled={isLoading}
            className="bg-gray-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleScanCameras}
            disabled={isScanning}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            Scan Cameras
          </motion.button>
          <CSVLink
            data={csvData}
            filename={`cameras-export-${new Date().toISOString().split('T')[0]}.csv`}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Export CSV
          </CSVLink>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">{editingCamera ? 'Edit Camera' : 'Add New Camera'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
          <input
            type="text"
            placeholder="IP Address"
            value={editingCamera ? editingCamera.ipAddress : newCamera.ipAddress}
            onChange={(e) =>
              editingCamera
                ? setEditingCamera({ ...editingCamera, ipAddress: e.target.value })
                : setNewCamera({ ...newCamera, ipAddress: e.target.value })
            }
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Name"
            value={editingCamera ? editingCamera.name : newCamera.name}
            onChange={(e) =>
              editingCamera
                ? setEditingCamera({ ...editingCamera, name: e.target.value })
                : setNewCamera({ ...newCamera, name: e.target.value })
            }
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Manufacturer"
            value={editingCamera ? editingCamera.manufacturer || '' : newCamera.manufacturer}
            onChange={(e) =>
              editingCamera
                ? setEditingCamera({ ...editingCamera, manufacturer: e.target.value })
                : setNewCamera({ ...newCamera, manufacturer: e.target.value })
            }
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={isLoading}
          />
          <input
            type="text"
            placeholder="Model"
            value={editingCamera ? editingCamera.model || '' : newCamera.model}
            onChange={(e) =>
              editingCamera
                ? setEditingCamera({ ...editingCamera, model: e.target.value })
                : setNewCamera({ ...newCamera, model: e.target.value })
            }
            className="bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={isLoading}
          />
          {editingCamera ? (
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleEditCamera}
                disabled={isLoading}
                className="bg-green-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
              >
                <Edit className="w-5 h-5" />
                Update
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setEditingCamera(null)}
                disabled={isLoading}
                className="bg-gray-600 text-white px-4 py-2 rounded flex items-center justify-center gap-2 flex-1 disabled:opacity-50"
              >
                Cancel
              </motion.button>
            </div>
          ) : (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleAddCamera}
              disabled={isLoading}
              className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Plus className="w-5 h-5" />
              Add Camera
            </motion.button>
          )}
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
            className="w-full bg-white border border-gray-300 text-gray-900 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            disabled={isLoading}
          />
        </div>
        <select
          value={filterManufacturer}
          onChange={(e) => {
            setFilterManufacturer(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          disabled={isLoading}
        >
          <option value="">All Manufacturers</option>
          {manufacturers.map((mfg) => (
            <option key={mfg} value={mfg}>
              {mfg}
            </option>
          ))}
        </select>
        <select
          value={filterModel}
          onChange={(e) => {
            setFilterModel(e.target.value);
            setCurrentPage(1);
          }}
          className="bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
          disabled={isLoading}
        >
          <option value="">All Models</option>
          {models.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Camera List</h2>
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-8 w-8 animate-spin text-[#8B0000]" />
          </div>
        ) : cameras.length === 0 ? (
          <p className="text-gray-500">No cameras found. Add a camera or scan your network.</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manufacturer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Model</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vulnerabilities</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Scanned</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cameras.map((camera) => (
                    <tr key={camera._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{camera.name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <a
                          href={`http://${camera.ipAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                        >
                          {camera.ipAddress}
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camera.manufacturer || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{camera.model || 'Unknown'}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {camera.vulnerabilities?.length || 0} vuln{camera.vulnerabilities?.length === 1 ? '' : 's'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {camera.lastScanned ? new Date(camera.lastScanned).toLocaleString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex gap-2">
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => setEditingCamera(camera)}
                            className="text-blue-600 hover:text-blue-800"
                            disabled={isLoading}
                          >
                            <Edit className="w-5 h-5" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            onClick={() => handleDeleteCamera(camera._id)}
                            className="text-[#8B0000] hover:text-[#A50000]"
                            disabled={isLoading}
                          >
                            <Trash2 className="w-5 h-5" />
                          </motion.button>
                          <Dialog>
                            <DialogTrigger asChild>
                              <motion.button
                                whileHover={{ scale: 1.1 }}
                                onClick={() => setSelectedCamera(camera)}
                                className="text-[#8B0000] hover:text-[#A50000]"
                                disabled={isLoading}
                              >
                                <FileText className="w-5 h-5" />
                              </motion.button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl">
                              <DialogHeader>
                                <DialogTitle>Camera Report: {camera.name} ({camera.ipAddress})</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-6">
                                {camera.shodanData && (
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-800">Shodan Data</h3>
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                          <td className="px-4 py-2">IP</td>
                                          <td className="px-4 py-2">{camera.shodanData.ip}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">OS</td>
                                          <td className="px-4 py-2">{camera.shodanData.os || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Organization</td>
                                          <td className="px-4 py-2">{camera.shodanData.org || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Ports</td>
                                          <td className="px-4 py-2">{camera.shodanData.ports.join(', ') || 'None'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Vulnerabilities</td>
                                          <td className="px-4 py-2">{camera.shodanData.vulns.join(', ') || 'None'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Product</td>
                                          <td className="px-4 py-2">{camera.shodanData.product || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Version</td>
                                          <td className="px-4 py-2">{camera.shodanData.version || 'N/A'}</td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}

 
                                
                                {camera.greyNoiseData && (
                                  <div>
                                    <h3 className="text-lg font-semibold text-gray-800">GreyNoise Data</h3>
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Field</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Value</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        <tr>
                                          <td className="px-4 py-2">Classification</td>
                                          <td className="px-4 py-2">{camera.greyNoiseData.classification}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Name</td>
                                          <td className="px-4 py-2">{camera.greyNoiseData.name || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Last Seen</td>
                                          <td className="px-4 py-2">{camera.greyNoiseData.lastSeen || 'N/A'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">Noise</td>
                                          <td className="px-4 py-2">{camera.greyNoiseData.noise ? 'Yes' : 'No'}</td>
                                        </tr>
                                        <tr>
                                          <td className="px-4 py-2">RIOT</td>
                                          <td className="px-4 py-2">{camera.greyNoiseData.riot ? 'Yes' : 'No'}</td>
                                        </tr>
                                        <tr>
                                          <td className='px-4 py-2' >IP</td>
                                          <td className='px-4 py-2'>{camera.greyNoiseData.noise?" YES": "  NO "} </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                                <motion.button
                                  whileHover={{ scale: 1.05 }}
                                  whileTap={{ scale: 0.95 }}
                                  onClick={() => generatePDF(camera)}
                                  className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
                                >
                                  <FileText className="w-5 h-5" />
                                  Export to PDF
                                </motion.button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="mt-4 flex justify-between items-center">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1 || isLoading}
                  className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Previous
                </motion.button>
                <span className="text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages || isLoading}
                  className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
                >
                  Next
                </motion.button>
              </div>
            )}
          </>
        )}
      </div>
    </motion.div>
  );
}