/* src/app/dashboard/lib/i18n.ts */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      compliance: {
        title: 'Compliance Status',
        standard: 'Standard',
        status: 'Status',
        lastChecked: 'Last Checked',
        cumple: 'Compliant',
        noCumple: 'Non-Compliant',
        noData: 'No compliance data available.',
      },
      vulnerabilities: {
        title: 'Vulnerabilities',
        cveId: 'CVE ID',
        severity: 'Severity',
        description: 'Description',
        status: 'Status',
        open: 'Open',
        resolved: 'Resolved',
        noData: 'No vulnerabilities found.',
      },
      incidents: {
        title: 'Incidents',
        titleField: 'Title',
        severity: 'Severity',
        description: 'Description',
        status: 'Status',
        createdAt: 'Created At',
        open: 'Open',
        closed: 'Closed',
        noData: 'No incidents found.',
      },
      pagination: {
        previous: 'Previous',
        next: 'Next',
        page: 'Page {{current}} of {{total}}',
      },
    },
  },
  es: {
    translation: {
      compliance: {
        title: 'Estado de Cumplimiento',
        standard: 'Estándar',
        status: 'Estado',
        lastChecked: 'Última Revisión',
        cumple: 'Cumple',
        noCumple: 'No Cumple',
        noData: 'No hay datos de cumplimiento disponibles.',
      },
      vulnerabilities: {
        title: 'Vulnerabilidades',
        cveId: 'ID de CVE',
        severity: 'Severidad',
        description: 'Descripción',
        status: 'Estado',
        open: 'Abierto',
        resolved: 'Resuelto',
        noData: 'No se encontraron vulnerabilidades.',
      },
      incidents: {
        title: 'Incidentes',
        titleField: 'Título',
        severity: 'Severidad',
        description: 'Descripción',
        status: 'Estado',
        createdAt: 'Creado En',
        open: 'Abierto',
        closed: 'Cerrado',
        noData: 'No se encontraron incidentes.',
      },
      pagination: {
        previous: 'Anterior',
        next: 'Siguiente',
        page: 'Página {{current}} de {{total}}',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en', // Idioma por defecto
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;