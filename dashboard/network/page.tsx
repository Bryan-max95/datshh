/* src/app/dashboard/network/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Plus, Trash2, Search } from 'lucide-react';
import { fetchDevices, addDevice, deleteDevice, fetchShodanData } from '../lib/api';
import { Device, ShodanData } from '../../types';
import { useSession } from 'next-auth/react';
import { z } from 'zod';

const DeviceInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  ipAddress: z.string().ip('Invalid IP address'),
  deviceType: z.string().min(1, 'Device type is required'),
  group: z.string().min(1, 'Group is required'),
});

export default function Network() {
  const { data: session, status } = useSession();
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
    if (status === 'authenticated') {
      loadDevices();
    }
  }, [status]);

  const loadDevices = async () => {
    try {
      const data = await fetchDevices();
      setDevices(data);
      if (data.length > 0) {
        setSelectedIP(data[0].ipAddress);
      }
      setError('');
    } catch (err) {
      setError('Failed to load devices');
      console.error('Error fetching devices:', err);
    }
  };

  const handleAddDevice = async () => {
    if (status !== 'authenticated') {
      setError('Please log in to add devices');
      return;
    }
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
        setError('Failed to add device');
        console.error('Error adding device:', error);
      }
    }
  };

  const handleDeleteDevice = async (_id: string) => {
    if (status !== 'authenticated') {
      setError('Please log in to delete devices');
      return;
    }
    try {
      await deleteDevice(_id);
      await loadDevices();
      setError('');
    } catch (error) {
      setError('Failed to delete device');
      console.error('Error deleting device:', error);
    }
  };

  const handleAnalyzeIP = async () => {
    if (!selectedIP) {
      setError('Please select an IP to analyze');
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
        setError('No Shodan data available for this IP');
      }
    } catch (error) {
      setError('Failed to fetch Shodan data');
      console.error('Error fetching Shodan data:', error);
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

  if (status === 'loading') {
    return <div className="text-gray-400 p-6">Loading...</div>;
  }

  if (status !== 'authenticated') {
    return <div className="text-red-500 p-6">Please log in to continue.</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">Network Management</h1>
      {error && <p className="text-red-500">{error}</p>}
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Add Device</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
          <input
            type="text"
            placeholder="Name"
            value={newDevice.name}
            onChange={(e) => setNewDevice({ ...newDevice, name: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="IP Address"
            value={newDevice.ipAddress}
            onChange={(e) => setNewDevice({ ...newDevice, ipAddress: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Device Type"
            value={newDevice.deviceType}
            onChange={(e) => setNewDevice({ ...newDevice, deviceType: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <input
            type="text"
            placeholder="Group"
            value={newDevice.group}
            onChange={(e) => setNewDevice({ ...newDevice, group: e.target.value })}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2"
          />
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleAddDevice}
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
            placeholder="Search devices..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded pl-10 py-2"
          />
        </div>
      </div>
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Device List</h2>
        {devices.length === 0 ? (
          <p className="text-gray-400">No devices found.</p>
        ) : (
          <>
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>IP Address</th>
                  <th>Type</th>
                  <th>Group</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentDevices.map((device) => (
                  <tr key={device._id}>
                    <td>{device.name}</td>
                    <td>{device.ipAddress}</td>
                    <td>{device.deviceType}</td>
                    <td>{device.group}</td>
                    <td>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        onClick={() => handleDeleteDevice(device._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="w-5 h-5" />
                      </motion.button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
      <div className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Analyze Device</h2>
        <div className="flex gap-4 mb-4">
          <select
            value={selectedIP}
            onChange={(e) => setSelectedIP(e.target.value)}
            className="bg-[#1F1F1F] text-white border border-[#8B0000]/50 rounded px-3 py-2 flex-1"
          >
            <option value="">Select IP</option>
            {devices.map((device) => (
              <option key={device._id} value={device.ipAddress}>
                {device.name} ({device.ipAddress})
              </option>
            ))}
          </select>
          <motion.button
            whileHover={{ scale: 1.05 }}
            onClick={handleAnalyzeIP}
            className="bg-[#8B0000] text-white px-4 py-2 rounded"
          >
            Analyze
          </motion.button>
        </div>
        {vulnerabilityData ? (
          <div className="space-y-4">
            <h3 className="text-gray-400">Shodan Analysis for {selectedIP}</h3>
            <p><strong>Ports:</strong> {vulnerabilityData.ports.join(', ') || 'None'}</p>
            <p><strong>CPEs:</strong> {vulnerabilityData.cpes.join(', ') || 'None'}</p>
            <p><strong>Vulnerabilities:</strong> {vulnerabilityData.vulns.join(', ') || 'None'}</p>
            <p><strong>Tags:</strong> {vulnerabilityData.tags.join(', ') || 'None'}</p>
            <p><strong>Product:</strong> {vulnerabilityData.product || 'Unknown'}</p>
            <p><strong>Version:</strong> {vulnerabilityData.version || 'Unknown'}</p>
            <p><strong>Hostnames:</strong> {vulnerabilityData.hostnames?.join(', ') || 'None'}</p>
            <p><strong>OS:</strong> {vulnerabilityData.os || 'Unknown'}</p>
            <p><strong>Organization:</strong> {vulnerabilityData.org || 'Unknown'}</p>
          </div>
        ) : (
          <p className="text-gray-400">Select an IP and analyze to view results.</p>
        )}
      </div>
    </motion.div>
  );
}