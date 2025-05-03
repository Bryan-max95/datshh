/* src/app/dashboard/context/DashboardContext.tsx */
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface DashboardContextType {
  selectedIP: string;
  setSelectedIP: (ip: string) => void;
  timeRange: string;
  setTimeRange: (range: string) => void;
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export const useDashboard = () => {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
};

export default function DashboardProvider({ children }: { children: ReactNode }) {
  const [selectedIP, setSelectedIP] = useState('');
  const [timeRange, setTimeRange] = useState('30');

  return (
    <DashboardContext.Provider value={{ selectedIP, setSelectedIP, timeRange, setTimeRange }}>
      {children}
    </DashboardContext.Provider>
  );
}