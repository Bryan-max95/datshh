/* src/app/dashboard/components/widgets/IncidentTable.tsx */
'use client';

import { motion } from 'framer-motion';
import { IncidentTableProps } from '../../../types';

export default function IncidentTable({ incidents }: IncidentTableProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Incidents</h2>
      {incidents.length === 0 ? (
        <p className="text-gray-400">No incidents found.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Severity</th>
                <th>Status</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident) => (
                <tr key={incident._id}>
                  <td>{incident.title}</td>
                  <td>
                    <span
                      className={
                        incident.severity === 'Crítico'
                          ? 'text-red-500'
                          : incident.severity === 'Alto'
                          ? 'text-orange-500'
                          : 'text-yellow-500'
                      }
                    >
                      {incident.severity}
                    </span>
                  </td>
                  <td>{incident.status}</td>
                  <td>{new Date(incident.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}