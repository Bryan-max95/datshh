/* src/app/dashboard/components/widgets/IncidentTable.tsx */
'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Incident } from '../../../types';
import EmptyState from '../EmptyState';
import { useTranslation } from 'react-i18next';
import { ArrowUpDown } from 'lucide-react';

interface IncidentTableProps {
  incidents: Incident[];
}

export default function IncidentTable({ incidents }: IncidentTableProps) {
  const { t } = useTranslation();
  const [sortConfig, setSortConfig] = useState<{ key: keyof Incident; direction: 'asc' | 'desc' } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const sortedIncidents = useMemo(() => {
    if (!sortConfig) return incidents;
    return [...incidents].sort((a, b) => {
      const aValue = a[sortConfig.key] || '';
      const bValue = b[sortConfig.key] || '';
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [incidents, sortConfig]);

  const paginatedIncidents = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedIncidents.slice(start, start + itemsPerPage);
  }, [sortedIncidents, currentPage]);

  const totalPages = Math.ceil(incidents.length / itemsPerPage);

  const requestSort = (key: keyof Incident) => {
    setSortConfig((prev) => ({
      key,
      direction: prev?.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  if (!incidents || incidents.length === 0) {
    return <EmptyState message={t('incidents.noData')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#2D2D2D] p-4 sm:p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">{t('incidents.title')}</h2>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th data-label={t('incidents.title')}>
                <button
                  onClick={() => requestSort('title')}
                  className="flex items-center gap-1"
                >
                  {t('incidents.title')} <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th data-label={t('incidents.severity')}>
                <button
                  onClick={() => requestSort('severity')}
                  className="flex items-center gap-1"
                >
                  {t('incidents.severity')} <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th data-label={t('incidents.description')}>
                {t('incidents.description')}
              </th>
              <th data-label={t('incidents.status')}>
                <button
                  onClick={() => requestSort('status')}
                  className="flex items-center gap-1"
                >
                  {t('incidents.status')} <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
              <th data-label={t('incidents.createdAt')}>
                <button
                  onClick={() => requestSort('createdAt')}
                  className="flex items-center gap-1"
                >
                  {t('incidents.createdAt')} <ArrowUpDown className="w-4 h-4" />
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {paginatedIncidents.map((incident) => (
              <tr key={incident._id}>
                <td data-label={t('incidents.title')}>{incident.title}</td>
                <td data-label={t('incidents.severity')}>
                  <span
                    className={`px-2 py-1 rounded ${
                      incident.severity === 'High'
                        ? 'bg-red-500/20 text-red-400'
                        : incident.severity === 'Medium'
                        ? 'bg-yellow-500/20 text-yellow-400'
                        : 'bg-green-500/20 text-green-400'
                    }`}
                  >
                    {incident.severity}
                  </span>
                </td>
                <td data-label={t('incidents.description')}>
                  {incident.description}
                </td>
                <td data-label={t('incidents.status')}>
                  {t(`incidents.${incident.status.toLowerCase()}`)}
                </td>
                <td data-label={t('incidents.createdAt')}>
                  {new Date(incident.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="pagination mt-4 flex justify-between items-center">
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {t('pagination.previous')}
          </button>
          <span className="text-gray-400">
            {t('pagination.page', { current: currentPage, total: totalPages })}
          </span>
          <button
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {t('pagination.next')}
          </button>
        </div>
      )}
    </motion.div>
  );
}