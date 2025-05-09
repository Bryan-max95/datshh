'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Wifi } from 'lucide-react';

interface ScanResult {
  id: number;
  ip: string;
  hostname: string;
  ping: string;
  ports: string;
  status: 'Vivo' | 'Muerto';
}

export default function Dashboard() {
  const router = useRouter();
  const [results, setResults] = useState<ScanResult[]>([]);
  const [scanning, setScanning] = useState(true);

  // Simula escaneo de IPs
  useEffect(() => {
    let scanId = 0;
    const ipBase = '192.168.1.';
    let currentIp = 1;

    const interval = setInterval(() => {
      if (currentIp > 254) {
        setScanning(false);
        clearInterval(interval);
        return;
      }

      const ip = `${ipBase}${currentIp}`;
      const isAlive = Math.random() > 0.3; // 70% de probabilidad de estar vivo
      const hostname = isAlive ? `host-${currentIp}.local` : '-';
      const ping = isAlive ? `${Math.floor(Math.random() * 100 + 10)} ms` : '-';
      const ports = isAlive ? ['80', '443', '22'].slice(0, Math.floor(Math.random() * 3) + 1).join(', ') || '-' : '-';

      const newResult: ScanResult = {
        id: scanId++,
        ip,
        hostname,
        ping,
        ports,
        status: isAlive ? 'Vivo' : 'Muerto',
      };

      setResults((prev) => [...prev, newResult].slice(-15)); // Muestra últimos 15 resultados
      currentIp++;
    }, 300); // Nueva IP cada 300ms para un escaneo rápido y realista

    return () => clearInterval(interval);
  }, []);

  // Redirección después de 5 segundos
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/dashboard');
    }, 5000);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: 'easeInOut' }}
      className="p-6 space-y-6 flex flex-col justify-center items-center min-h-screen"
    >
      {/* Ícono de WiFi con animación de escaneo */}
      <motion.div
        animate={{ rotate: [0,] }}
        transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
      >
        <Wifi className="w-12 h-12 text-[#8B0000]" />
      </motion.div>

      {/* Título */}
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="text-3xl font-bold text-gray-800"
      >
        Angry IP Scanner: Escaneo en Vivo
      </motion.h1>

      {/* Tabla de resultados al estilo Angry IP Scanner */}
      <div className="w-full max-w-4xl bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
        <table className="w-full text-sm text-gray-600 font-mono">
          <thead>
            <tr className="text-left text-gray-700 border-b border-gray-200">
              <th className="py-2 px-4">IP</th>
              <th className="py-2 px-4">Nombre del Host</th>
              <th className="py-2 px-4">Ping</th>
              <th className="py-2 px-4">Puertos</th>
              <th className="py-2 px-4">Estado</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <motion.tr
                key={result.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`border-b border-gray-200 hover:bg-gray-100 ${
                  result.status === 'Vivo' ? 'text-gray-600' : 'text-gray-400'
                }`}
              >
                <td className="py-2 px-4">{result.ip}</td>
                <td className="py-2 px-4">{result.hostname}</td>
                <td className="py-2 px-4">{result.ping}</td>
                <td className="py-2 px-4">{result.ports}</td>
                <td className={`py-2 px-4 ${result.status === 'Vivo' ? 'text-[#8B0000]' : 'text-gray-400'}`}>
                  {result.status}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Texto de estado con parpadeo */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: scanning ? [0.5, 1, 0.5] : 1 }}
        transition={{ repeat: scanning ? Infinity : 0, duration: 1, delay: 0.5 }}
        className="mt-4 text-sm text-gray-500"
      >
        {scanning ? 'Escaneando red...' : 'Escaneo finalizado. Redirigiéndote...'}
      </motion.p>
    </motion.div>
  );
}