'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Download, Plus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import ReportWidget from '../components/widgets/ReportWidget';
import { fetchReports, generateReport } from '../lib/api';
import { Report } from '../../types';
import { z } from 'zod';

const ReportInputSchema = z.object({
  title: z.string().min(1, 'El título es requerido'),
  description: z.string().min(1, 'La descripción es requerida'),
  type: z.enum(['security', 'performance', 'compliance'], {
    errorMap: () => ({ message: 'El tipo de reporte es requerido' }),
  }),
});

export default function ReportsPage() {
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

  useEffect(() => {
    async function loadReports() {
      try {
        setIsLoading(true);
        const data = await fetchReports();
        setReports(data);
        setFilteredReports(data);
        setError('');
      } catch (err) {
        setError('No se pudieron cargar los reportes');
        console.error('Error al obtener reportes:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadReports();
  }, []);

  // Filtrado y ordenamiento
  useEffect(() => {
    let updatedReports = [...reports];

    // Filtrar por búsqueda
    if (searchTerm) {
      updatedReports = updatedReports.filter(
        (report) =>
          report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          report.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Ordenar
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

    setFilteredReports(updatedReports);
    setCurrentPage(1); // Resetear página al filtrar/ordenar
  }, [searchTerm, sortBy, sortOrder, reports]);

  const handleGenerateReport = async () => {
    try {
      setGenerateStatus('generating');
      ReportInputSchema.parse(newReport);
      const generatedReport = await generateReport(newReport);
      setReports((prev) => [generatedReport, ...prev]);
      setNewReport({ title: '', description: '', type: 'security' });
      setGenerateStatus('success');
      setTimeout(() => setGenerateStatus('idle'), 3000);
      setError('');
    } catch (error) {
      if (error instanceof z.ZodError) {
        setError(error.errors.map((e) => e.message).join(', '));
      } else {
        setError('No se pudo generar el reporte');
        console.error('Error al generar reporte:', error);
      }
      setGenerateStatus('error');
      setTimeout(() => setGenerateStatus('idle'), 3000);
    }
  };

  const handleExportReports = (format: 'json' | 'csv') => {
    try {
      if (format === 'json') {
        const json = JSON.stringify(filteredReports, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reports.json';
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const headers = ['Título,Descripción,Fecha,Tipo'];
        const csvRows = filteredReports.map((report) =>
          `"${report.title}","${report.description || ''}","${new Date(
            report.date
          ).toLocaleDateString()}","${report.type}"`
        );
        const csv = [headers, ...csvRows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'reports.csv';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError('No se pudo exportar los reportes');
      console.error('Error al exportar:', err);
    }
  };

  const indexOfLastReport = currentPage * reportsPerPage;
  const indexOfFirstReport = indexOfLastReport - reportsPerPage;
  const currentReports = filteredReports.slice(indexOfFirstReport, indexOfLastReport);
  const totalPages = Math.ceil(filteredReports.length / reportsPerPage);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-6">
        <Loader2 className="animate-spin h-8 w-8 text-[#8B0000]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6"
    >
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-[#8B0000]">Gestión de Reportes</h1>
        <div className="flex gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleExportReports('json')}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exportar JSON
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleExportReports('csv')}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2"
          >
            <Download className="w-5 h-5" />
            Exportar CSV
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-400 text-red-700 p-4 rounded">
          {error}
        </div>
      )}

      {/* Formulario para Generar Reporte */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Generar Nuevo Reporte</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Título
            </label>
            <input
              type="text"
              id="title"
              value={newReport.title}
              onChange={(e) => setNewReport({ ...newReport, title: e.target.value })}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
              placeholder="Título del reporte"
            />
          </div>
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <input
              type="text"
              id="description"
              value={newReport.description}
              onChange={(e) => setNewReport({ ...newReport, description: e.target.value })}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
              placeholder="Descripción del reporte"
            />
          </div>
          <div>
            <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              id="type"
              value={newReport.type}
              onChange={(e) =>
                setNewReport({ ...newReport, type: e.target.value as 'security' | 'performance' | 'compliance' })
              }
              className="w-full bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            >
              <option value="security">Seguridad</option>
              <option value="performance">Rendimiento</option>
              <option value="compliance">Cumplimiento</option>
            </select>
          </div>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleGenerateReport}
          disabled={generateStatus === 'generating'}
          className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-70"
        >
          {generateStatus === 'generating' ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Plus className="h-5 w-5" />
          )}
          Generar Reporte
        </motion.button>
      </div>

      {/* Filtros y Ordenamiento */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Filtrar y Ordenar Reportes</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar reportes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-gray-300 text-gray-900 rounded pl-10 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            />
          </div>
          <div>
            <label htmlFor="sortBy" className="block text-sm font-medium text-gray-700 mb-1">
              Ordenar por
            </label>
            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'title' | 'date')}
              className="w-full bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            >
              <option value="title">Título</option>
              <option value="date">Fecha</option>
            </select>
          </div>
          <div>
            <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
              Orden
            </label>
            <select
              id="sortOrder"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
              className="w-full bg-white border border-gray-300 text-gray-700 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-[#8B0000]"
            >
              <option value="asc">Ascendente</option>
              <option value="desc">Descendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Reportes */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Lista de Reportes</h2>
        {filteredReports.length === 0 ? (
          <p className="text-gray-500">No se encontraron reportes.</p>
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
              >
                Anterior
              </motion.button>
              <span className="text-sm text-gray-700">
                Página {currentPage} de {totalPages}
              </span>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="bg-[#8B0000] text-white px-4 py-2 rounded disabled:opacity-50"
              >
                Siguiente
              </motion.button>
            </div>
          </>
        )}
      </div>

      {/* Feedback de Generación */}
      {generateStatus === 'success' && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 right-4 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded shadow-lg flex items-center gap-2"
        >
          <CheckCircle className="h-5 w-5" />
          Reporte generado exitosamente
        </motion.div>
      )}
      {generateStatus === 'error' && (
        <motion.div
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 50, opacity: 0 }}
          className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded shadow-lg flex items-center gap-2"
        >
          <AlertCircle className="h-5 w-5" />
          Error al generar el reporte
        </motion.div>
      )}
    </motion.div>
  );
}