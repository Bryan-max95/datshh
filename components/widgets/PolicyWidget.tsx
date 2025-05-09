/* src/app/dashboard/components/widgets/PolicyWidget.tsx */
'use client';

import { motion } from 'framer-motion';
import { PolicyWidgetProps } from '../../../types';

export default function PolicyWidget({ policies }: PolicyWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Policies</h2>
      {policies.length === 0 ? (
        <p className="text-gray-400">No policies found.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy._id}>
                  <td>{policy.name}</td>
                  <td>
                    <span
                      className={
                        policy.status === 'Activa' ? 'text-green-500' : 'text-red-500'
                      }
                    >
                      {policy.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}