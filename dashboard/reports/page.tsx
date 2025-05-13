'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Plus, Loader2 } from 'lucide-react';
import { toast } from 'react-toastify';
import ReportWidget from '../components/widgets/ReportWidget';
import { fetchReports, generateReport } from '../lib/api';
import { Report } from '../../types';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import sanitizeHtml from 'sanitize-html';

const ReportInputSchema = z.object({
  title: z.string().min(1, { message: 'reports.titleRequired' }),
  description: z.string().min(1, { message: 'reports.descriptionRequired' }),
  type: z.enum(['security', 'performance', 'compliance'], {
    errorMap: () => ({ message: 'reports.typeRequired' }),
  }),
});

export default function ReportsPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [filteredReports, setFilteredReports] = useState<Report[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [generateStatus, setGenerateStatus] = useState<'idle' | 'generating' | 'success' | 'error'>('idle');
  const [newReport, setNewReport] = useState({
    title: '',
    description: '',
    type: 'security' as 'security' | 'performance' | 'compliance',
  });
  const reportsPerPage = 10;
  const cache: Record<string, string> = {};

  const loadReports = useCallback(async () => {
    try {
      const cacheKey = `reports:user`; // Cambiar a userId si usas session
      if (cache[cacheKey]) {
        const cachedData = JSON.parse(cache[cacheKey]);
        setReports(cachedData);
        setFilteredReports(cachedData);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      const data = await fetchReports();
      setReports(data);
      setFilteredReports(data);
      cache[cacheKey] = JSON.stringify(data);
      setTimeout(() => delete cache[cacheKey], 3600 * 1000); // Expira en 1 hora
      setError('');
    } catch (err) {
      setError(t('reports.error'));
      toast.error(t('reports.error'));
      console.error('Error fetching reports:', err);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const filteredSortedReports = useMemo(() => {
    let updatedReports = [...reports];

    if (searchTerm) {
      const sanitizedSearch = sanitizeHtml(searchTerm);
      updatedReports = updatedReports.filter(
        (report) =>
          report.title.toLowerCase().includes(sanitizedSearch.toLowerCase()) ||
          report.description?.toLowerCase().includes(sanitizedSearch.toLowerCase())
      );
    }

    updatedReports.sort((a, b) => {
      if (sortBy === 'title') {
        return sortOrder === 'asc'
          ? a.title.localeCompare(b.title)
          : b.title.localeCompare(a.title);
      } else {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      }
    });

    return updatedReports;
  }, [searchTerm, sortBy, sortOrder, reports]);

  const handleGenerateReport = async () => {
    try {
      setGenerateStatus('generating');
      const sanitizedReport = {
        title: sanitizeHtml(newReport.title),
        description: sanitizeHtml(newReport.description),
        type: newReport.type,
      };
      ReportInputSchema.parse(sanitizedReport);
      const generatedReport = await generateReport(sanitizedReport);
      setReports((prev) => [generatedReport, ...prev]);
      setNewReport({ title: '', description: '', type: 'security' });
      setGenerateStatus('success');
      toast.success(t('reports.generatedSuccess'));
      setError('');
    } catch (error) {
      const errorMessage =
        error instanceof z.ZodError
          ? error.errors.map((e) => t(e.message)).join(', ')
          : t('reports.generateError');
      setError(errorMessage);
      toast.error(errorMessage);
      setGenerateStatus('error');
      console.error('Error generating report:', error);
    } finally {
      setTimeout(() => setGenerateStatus('idle'), 3000);
    }
  };

  const handleExportReports = (format: 'json' | 'csv') => {
    try {
      if (format === 'json') {
        const json = JSON.stringify(filteredSortedReports, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reports.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const escapeCsv = (str: string) => `"${str.replace(/"/g, '""')}"`;
        const headers = [
          t('reports.title'),
          t('reports.description'),
          t('reports.date'),
          t('reports.type'),
        ];
        const csvRows = filteredSortedReports.map((report) =>
          [
            escapeCsv(report.title),
            escapeCsv(report.description || ''),
            escapeCsv(new Date(report.date).toLocaleDateString()),
            escapeCsv(t(`reports.types.${report.type}`)),
          ].join(',')
        );
        const csv = [headers.join(','), ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reports.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
      toast.success(t('reports.exportSuccess'));
    } catch (err) {
      setError(t('reports.exportError'));
      toast.error(t('reports.exportError'));
      console.error('Error exporting reports:', err);
    }
  };

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredSortedReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredSortedReports.length / reportsPerPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#121212] p-6">
        <Loader2 className="animate-spin h-8 w-8 text-[#8B0000]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6 bg-[#121212] min-h-screen"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#8B0000]">{t('reports.title')}</h1>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleExportReports('json')}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
            aria-label={t('reports.exportJson')}
          >
            <Download className="w-5 h-5" />
            {t('reports.exportJson')}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleExportReports('csv')}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
            aria-label={t('reports.exportCsv')}
          >
            <Download className="w-5 h-5" />
            {t('reports.exportCsv')}
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">{error}</div>
      )}

      <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          {t('reports.generateNewReport')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-300 mb-1">
              {t('reports.title')}
            </label>
            <input
              type="text"
              id="title"
              value={newReport.title}
              onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              placeholder={t('reports.titlePlaceholder')}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              {t('reports.description')}
            </label>
            <input
              type="text"
              id="description"
              value={newReport.description}
              onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              placeholder={t('reports.descriptionPlaceholder')}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-300 mb-1">
              {t('reports.type')}
            </label>
            <select
              id="type"
              value={newReport.type}
              onChange={(e) =>
                setNewReport({
                  ...newReport,
                  type: e.target.value as 'security' | 'performance' | 'compliance',
                })
              }
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              aria-required="true"
            >
              <option value="security">{t('reports.types.security')}</option>
              <option value="performance">{t('reports.types.performance')}</option>
              <option value="compliance">{t('reports.types.compliance')}</option>
            </select>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateReport}
          disabled={generateStatus === 'generating'}
          className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
          aria-label={t('reports.generateReport')}
        >
          {generateStatus === 'generating' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          {t('reports.generateReport')}
        </motion.button>
      </div>

      <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">
          {t('reports.filterAndSort')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={t('reports.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              aria-label={t('reports.searchPlaceholder')}
            />
          </div>
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-300 mb-1">
              {t('reports.sortBy')}
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'date')}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              aria-label={t('reports.sortBy')}
            >
              <option value="title">{t('reports.title')}</option>
              <option value="date">{t('reports.date')}</option>
            </select>
          </div>
          <div>
            <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-300 mb-1">
              {t('reports.order')}
            </label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              aria-label={t('reports.order')}
            >
              <option value="asc">{t('reports.orderAsc')}</option>
              <option value="desc">{t('reports.orderDesc')}</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4">{t('reports.list')}</h2>
        {filteredSortedReports.length === 0 ? (
          <p className="text-gray-500">{t('reports.noData')}</p>
        ) : (
          <>
            <ReportWidget reports={currentReports} />
            <div className="mt-4 flex justify-between items-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
                aria-label={t('reports.previous')}
              >
                {t('reports.previous')}
              </motion.button>
              <span className="text-sm text-gray-300">
                {t('reports.page', { current: currentPage, total: totalPages })}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
                aria-label={t('reports.next')}
              >
                {t('reports.next')}
              </motion.button>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
}