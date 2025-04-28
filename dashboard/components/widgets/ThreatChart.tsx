/* src/app/dashboard/components/widgets/ThreatChart.tsx */
'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { ThreatChartProps, Report } from '../../../types';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function ThreatChart({ timeRange }: ThreatChartProps) {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadReports() {
      try {
        setLoading(true);
        const response = await fetch(`/api/summary?timeRange=${timeRange}`);
        const data = await response.json();
        setReports(data.reports || []);
        setError('');
      } catch (err) {
        setError('Failed to load threat data');
        console.error('Error fetching reports:', err);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, [timeRange]);

  const chartData = {
    labels: ['Critical CVEs', 'Total CVEs'],
    datasets: [
      {
        label: 'Threat Metrics',
        data: [
          reports.reduce((sum, r) => sum + r.critical_cves, 0),
          reports.reduce((sum, r) => sum + r.total_cves, 0),
        ],
        backgroundColor: ['#8B0000', '#FFFFFF'],
        borderColor: ['#8B0000', '#8B0000'],
        borderWidth: 1,
      },
    ],
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#2D2D2D] p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">Threat Chart ({timeRange})</h2>
      {error && <p className="text-red-500 mb-4">{error}</p>}
      {loading ? (
        <p className="text-gray-400">Loading...</p>
      ) : reports.length === 0 ? (
        <p className="text-gray-400">No threat data available for the selected range.</p>
      ) : (
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { display: true, labels: { color: '#FFFFFF' } },
                title: { display: true, text: 'Threat Metrics', color: '#FFFFFF' },
              },
              scales: {
                x: { ticks: { color: '#FFFFFF' } },
                y: { ticks: { color: '#FFFFFF' }, beginAtZero: true },
              },
            }}
          />
        </div>
      )}
    </motion.div>
  );
}