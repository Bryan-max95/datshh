'use client';

import { createContext, useContext, useState, ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { SessionProvider, SessionProviderProps } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Theme Context
interface ThemeContextType {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export default function DashboardLayout({ children, session }: { children: ReactNode; session: SessionProviderProps['session'] }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <SessionProvider session={session}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <div className={theme === 'dark' ? 'bg-[#1F1F1F] text-white' : 'bg-gray-100 text-black'}>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 lg:ml-64">
              <Topbar />
              <main className="p-4 sm:p-6">{children}</main>
            </div>
          </div>
          <ToastContainer
            position="top-right"
            autoClose={3000}
            hideProgressBar={false}
            newestOnTop
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={theme}
          />
        </div>
      </ThemeContext.Provider>
    </SessionProvider>
  );
}