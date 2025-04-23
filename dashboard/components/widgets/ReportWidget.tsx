/* src/app/dashboard/components/widgets/ReportWidget.tsx */
'use client';

import { motion } from 'framer-motion';
import { ReportWidgetProps } from '../../../types';

export default function ReportWidget({ reports }: ReportWidgetProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Reports</h2>
      {reports.length === 0 ? (
        <p className="text-gray-400">No reports found.</p>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Device ID</th>
                <th>Timestamp</th>
                <th>Total CVEs</th>
                <th>Critical CVEs</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report._id}>
                  <td>{report.equipo_id}</td>
                  <td>{new Date(report.timestamp).toLocaleDateString()}</td>
                  <td>{report.total_cves}</td>
                  <td className="text-red-500">{report.critical_cves}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}