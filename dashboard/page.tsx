/* src/app/dashboard/overview/page.tsx */
'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import KPIWidget from './components/widgets/KPIWidget';
import MapWidget from './components/widgets/MapWidget';
import ThreatChart from './components/widgets/ThreatChart';
import VulnerabilityTable from './components/widgets/VulnerabilityTable';
import ShodanWidget from './components/widgets/ShodanWidget';
import GreyNoiseWidget from './components/widgets/GreyNoiseWidget';
import InvestigateWidget from './components/widgets/InvestigateWidget';
import CamerasWidget from './components/widgets/CamerasWidget';
import { fetchSummary } from './lib/api';
import { SummaryData } from './../types';

export default function Overview() {
  const [summaryData, setSummaryData] = useState<SummaryData | null>(null);
  const [timeRange, setTimeRange] = useState('30d');

  useEffect(() => {
    const loadData = async () => {
      try {
        const summary = await fetchSummary({ timeRange });
        setSummaryData(summary);
      } catch (error) {
        console.error('Error al cargar datos:', error);
      }
    };
    loadData();
  }, [timeRange]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 p-6"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPIWidget data={summaryData} onTimeRangeChange={setTimeRange} />
        <CamerasWidget />
        <ShodanWidget ip="" />
        <GreyNoiseWidget ip="" />
        <InvestigateWidget />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MapWidget locations={[]} />
        <ThreatChart timeRange={timeRange} />
      </div>
      <VulnerabilityTable vulnerabilities={[]} />
    </motion.div>
  );
}