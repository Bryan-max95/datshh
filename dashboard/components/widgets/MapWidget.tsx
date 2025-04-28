/* src/app/dashboard/components/widgets/MapWidget.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { fetchDevices } from '../../lib/api';
import { Device } from '../../../types';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/marker-icon-2x.png',
  iconUrl: '/leaflet/marker-icon.png',
  shadowUrl: '/leaflet/marker-shadow.png',
});

interface Location {
  lat: number;
  lng: number;
  ip: string;
  name?: string;
}

export default function MapWidget() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadLocations() {
      try {
        setLoading(true);
        const devices = await fetchDevices();
        const locations = await Promise.all(
          devices.map(async (device: Device) => {
            const response = await fetch(
              `https://api.ipstack.com/${device.ipAddress}?access_key=${process.env.NEXT_PUBLIC_IPSTACK_KEY}`
            ).then((res) => res.json());
            return {
              lat: response.latitude || Math.random() * 180 - 90,
              lng: response.longitude || Math.random() * 360 - 180,
              ip: device.ipAddress,
              name: device.name,
            };
          })
        );
        setLocations(locations);
        setError('');
      } catch (err) {
        setError('Failed to load location data');
        console.error('Error fetching locations:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLocations();
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Device Locations</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-400">Loading map...</p>
      ) : locations.length === 0 ? (
        <p className="text-gray-400">No location data available.</p>
      ) : (
        <div className="h-64">
          <MapContainer
            center={[0, 0]}
            zoom={2}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            {locations.map((location, index) => (
              <Marker key={index} position={[location.lat, location.lng]}>
                <Popup>
                  <div>
                    <strong>{location.name || 'Unknown Device'}</strong>
                    <br />
                    IP: {location.ip}
                    <br />
                    Lat: {location.lat.toFixed(2)}, Lng: {location.lng.toFixed(2)}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      )}
    </motion.div>
  );
}