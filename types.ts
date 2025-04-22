/* src/app/types.ts */
export interface Device {
  _id: string;
  name: string;
  ipAddress: string;
  deviceType: string;
  group: string;
  status?: string;
  os?: string;
  cpuUsage?: number;
  memoryUsage?: number;
  browsers?: { name: string; version: string }[];
  software?: { name: string; version: string }[];
  cves?: { cveId: string; severity: string; description: string }[];
  shodanData?: { ports: number[]; cpes: string[]; vulns: string[]; tags: string[]; hostnames?: string[]; os?: string; org?: string; product?: string; version?: string };
  greyNoiseData?: {
    noise: boolean;
    riot: boolean;
    classification: string;
    name: string;
    lastSeen: string;
  };
}

export interface VulnerabilityData {
  ip: string;
  ports: number[];
  vulns: string[];
  hostnames: string[];
  os?: string;
  org?: string;
  cpes?: string[];
  tags?: string[];
  product?: string;
  version?: string;
}

export interface Vulnerability {
  _id: string;
  cve_id: string;
  software_id: string;
  severity: string;
  description: string;
  status: string;
}

export interface Camera {
  _id: string;
  ipAddress: string;
  name: string;
  manufacturer?: string;
  model?: string;
  ports?: number[];
  firmware?: string;
  vulnerabilities?: { cveId: string; severity: string; description: string; link?: string }[];
  shodanData?: { ports: number[]; cpes: string[]; vulns: string[]; tags: string[] };
  greyNoiseData?: {
    noise: boolean;
    riot: boolean;
    classification: string;
    name: string;
    lastSeen: string;
  };
  lastScanned?: string;
}

export interface Report {
  _id: string;
  equipo_id: string;
  timestamp: string;
  total_cves: number;
  critical_cves: number;
}

export interface Threat {
  id: number;
  type: string;
  risk: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
  source: string;
  destination: string;
  timestamp: string;
}

export interface Incident {
  _id: string;
  title: string;
  description: string;
  severity: 'Crítico' | 'Alto' | 'Medio' | 'Bajo';
  status: 'Abierto' | 'En Progreso' | 'Cerrado';
  createdAt: string;
}

export interface Ticket {
  _id: string;
  title: string;
  description: string;
  priority: 'Alta' | 'Media' | 'Baja';
  status: 'Abierto' | 'En Progreso' | 'Cerrado';
  createdAt: string;
}

export interface Compliance {
  _id: string;
  standard: string;
  status: 'Cumple' | 'No Cumple' | 'Parcial';
  lastChecked: string;
}

export interface Policy {
  _id: string;
  name: string;
  description: string;
  status: 'Activa' | 'Inactiva';
}

export interface SummaryData {
  monitoredDevices: number;
  monitoredCameras: number;
  totalCves: number;
  criticalCves: number;
}

export interface KPIWidgetProps {
  data: SummaryData | null;
  onTimeRangeChange: (timeRange: string) => void;
}

export interface ThreatChartProps {
  timeRange: string;
}

export interface ShodanWidgetProps {
  ip: string;
}

export interface GreyNoiseWidgetProps {
  ip: string;
}

export interface MapWidgetProps {
  locations: { lat: number; lon: number; name: string }[];
}

export interface VulnerabilityTableProps {
  vulnerabilities: Vulnerability[];
}

export interface DeploymentWidgetProps {
  devices: Device[];
  onDelete: (id: string) => void;
}

export interface CamerasWidgetProps {
  cameras: Camera[];
}

export interface ComplianceWidgetProps {
  complianceData: Compliance[];
}

export interface PolicyWidgetProps {
  policies: Policy[];
}

export interface ReportWidgetProps {
  reports: Report[];
}

export interface IncidentTableProps {
  incidents: Incident[];
}

export interface ThreatTableProps {
  threats: Threat[];
}

export interface TicketFormProps {
  onSubmit: (ticket: Omit<Ticket, '_id' | 'createdAt'>) => void;
}

export interface TokenInputProps {
  onTokenChange: (token: string) => void;
}