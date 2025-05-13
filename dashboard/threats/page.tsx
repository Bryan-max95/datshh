'use client';

import React from 'react';
import { Threat } from '../../types';

type ThreatTableProps = {
  threats?: Threat[];
};

const fallbackThreats: Threat[] = [
  {
    id: '1',
    name: 'Suspicious PowerShell Activity',
    severity: 'High',
    source: 'Microsoft Defender',
    detectedAt: new Date().toISOString(),
    description: 'PowerShell script attempting to bypass security controls.',
  },
  {
    id: '2',
    name: 'Malware Dropper Detected',
    severity: 'Critical',
    source: 'VirusTotal',
    detectedAt: new Date().toISOString(),
    description: 'Executable attempting to download additional malware payloads.',
  },
  {
    id: '3',
    name: 'RDP Brute Force Attempt',
    severity: 'Medium',
    source: 'Firewall Logs',
    detectedAt: new Date().toISOString(),
    description: 'Multiple failed login attempts via RDP detected from IP 194.23.10.14.',
  },
];

const ThreatTable = ({ threats = [] }: ThreatTableProps) => {
  const displayThreats = threats.length > 0 ? threats : fallbackThreats;

  return (
    <div className="overflow-x-auto bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
      <table className="min-w-full text-sm text-gray-300">
        <thead>
          <tr className="text-left border-b border-[#8B0000]/30 text-gray-400">
            <th className="py-3 px-4">Name</th>
            <th className="py-3 px-4">Severity</th>
            <th className="py-3 px-4">Source</th>
            <th className="py-3 px-4">Detected At</th>
            <th className="py-3 px-4">Description</th>
          </tr>
        </thead>
        <tbody>
          {displayThreats.map((threat) => (
            <tr
              key={threat.id}
              className="border-b border-[#8B0000]/10 hover:bg-[#2A2A2A] transition-colors"
            >
              <td className="py-3 px-4 font-medium text-white">{threat.name}</td>
              <td className="py-3 px-4">
                <span
                  className={`px-2 py-1 rounded text-xs font-bold ${
                    threat.severity === 'Critical'
                      ? 'bg-red-700 text-white'
                      : threat.severity === 'High'
                      ? 'bg-orange-600 text-white'
                      : 'bg-yellow-500 text-black'
                  }`}
                >
                  {threat.severity}
                </span>
              </td>
              <td className="py-3 px-4">{threat.source}</td>
              <td className="py-3 px-4">{new Date(threat.detectedAt).toLocaleString()}</td>
              <td className="py-3 px-4 text-gray-400">{threat.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ThreatTable;