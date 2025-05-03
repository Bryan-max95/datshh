/* src/app/dashboard/components/widgets/ComplianceWidget.tsx */
'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Compliance } from '../../../types';
import EmptyState from '../EmptyState';
import { useTranslation } from 'react-i18next';

interface ComplianceWidgetProps {
  complianceData: Compliance[];
}

export default function ComplianceWidget({ complianceData }: ComplianceWidgetProps) {
  const { t } = useTranslation();

  useEffect(() => {
    // Inicializar i18next si es necesario
  }, []);

  if (!complianceData || complianceData.length === 0) {
    return <EmptyState message={t('compliance.noData')} />;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="bg-[#2D2D2D] p-4 sm:p-6 rounded-lg border border-[#8B0000]/50"
    >
      <h2 className="text-lg font-semibold text-gray-400 mb-4">{t('compliance.title')}</h2>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th data-label={t('compliance.standard')}>{t('compliance.standard')}</th>
              <th data-label={t('compliance.status')}>{t('compliance.status')}</th>
              <th data-label={t('compliance.lastChecked')}>{t('compliance.lastChecked')}</th>
            </tr>
          </thead>
          <tbody>
            {complianceData.map((item) => (
              <tr key={item._id}>
                <td data-label={t('compliance.standard')}>{item.standard}</td>
                <td data-label={t('compliance.status')}>
                  <span
                    className={`px-2 py-1 rounded ${
                      item.status === 'Cumple'
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-red-500/20 text-red-400'
                    }`}
                  >
                    {t(`compliance.${item.status.toLowerCase()}`)}
                  </span>
                </td>
                <td data-label={t('compliance.lastChecked')}>
                  {new Date(item.lastChecked).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}