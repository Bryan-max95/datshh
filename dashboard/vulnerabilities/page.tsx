'use client';

import React from 'react';

interface VulnerabilityTableProps {
  timeRange: string;
}

const mockData = [
  {
    id: 'CVE-2024-12345',
    severity: 'Critical',
    description: 'Remote code execution in Apache HTTP Server.',
    affectedSystem: 'Server-001',
    date: '2025-04-10',
  },
  {
    id: 'CVE-2025-00001',
    severity: 'High',
    description: 'Privilege escalation vulnerability in OpenSSH.',
    affectedSystem: 'Laptop-23',
    date: '2025-04-15',
  },
  {
    id: 'CVE-2025-01010',
    severity: 'Medium',
    description: 'Information disclosure in Microsoft Edge.',
    affectedSystem: 'Workstation-8',
    date: '2025-04-18',
  },
];

const severityColors: Record<string, string> = {
  Critical: 'text-red-500',
  High: 'text-orange-400',
  Medium: 'text-yellow-400',
  Low: 'text-green-400',
};

export default function VulnerabilityTable({ timeRange }: VulnerabilityTableProps) {
  return (
    <div className="overflow-x-auto bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30">
      <table className="min-w-full text-sm text-gray-300">
        <thead className="bg-[#2D2D2D] text-gray-400">
          <tr>
            <th className="px-4 py-2 text-left">CVE ID</th>
            <th className="px-4 py-2 text-left">Severity</th>
            <th className="px-4 py-2 text-left">Description</th>
            <th className="px-4 py-2 text-left">System</th>
            <th className="px-4 py-2 text-left">Date</th>
          </tr>
        </thead>
        <tbody>
          {mockData.map((vuln) => (
            <tr key={vuln.id} className="border-b border-gray-700 hover:bg-[#2A2A2A] transition">
              <td className="px-4 py-3">{vuln.id}</td>
              <td className={`px-4 py-3 font-semibold ${severityColors[vuln.severity]}`}>
                {vuln.severity}
              </td>
              <td className="px-4 py-3">{vuln.description}</td>
              <td className="px-4 py-3">{vuln.affectedSystem}</td>
              <td className="px-4 py-3">{vuln.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
