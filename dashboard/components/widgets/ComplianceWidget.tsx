/* src/app/dashboard/components/widgets/ComplianceWidget.tsx */
'use client';

import { motion } from 'framer-motion';
import { ComplianceWidgetProps, Compliance } from '../../../types';

export default function ComplianceWidget({ complianceData }: ComplianceWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Compliance Status</h2>
      {complianceData.length === 0 ? (
        <p className="text-gray-400">No compliance data available.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Standard</th>
                <th>Status</th>
                <th>Last Checked</th>
              </tr>
            </thead>
            <tbody>
              {complianceData.map((item: Compliance) => (
                <tr key={item._id}>
                  <td>{item.standard}</td>
                  <td>
                    <span
                      className={
                        item.status === 'Cumple'
                          ? 'text-green-500'
                          : item.status === 'No Cumple'
                          ? 'text-red-500'
                          : 'text-yellow-500'
                      }
                    >
                      {item.status}
                    </span>
                  </td>
                  <td>{new Date(item.lastChecked).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}