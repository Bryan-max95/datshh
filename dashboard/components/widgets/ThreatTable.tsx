/* src/app/dashboard/components/widgets/ThreatTable.tsx */
'use client';

import { motion } from 'framer-motion';
import { ThreatTableProps } from '../../../types';

export default function ThreatTable({ threats }: ThreatTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Threats</h2>
      {threats.length === 0 ? (
        <p className="text-gray-400">No threats found.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Risk</th>
                <th>Source</th>
                <th>Destination</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {threats.map((threat) => (
                <tr key={threat.id}>
                  <td>{threat.type}</td>
                  <td>
                    <span
                      className={
                        threat.risk === 'Crítico'
                          ? 'text-red-500'
                          : threat.risk === 'Alto'
                          ? 'text-orange-500'
                          : 'text-yellow-500'
                      }
                    >
                      {threat.risk}
                    </span>
                  </td>
                  <td>{threat.source}</td>
                  <td>{threat.destination}</td>
                  <td>{new Date(threat.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}