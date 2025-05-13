'use client';

import { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import { SessionProvider, SessionProviderProps, getSession } from 'next-auth/react';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import { usePathname } from 'next/navigation';

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
  const pathname = usePathname();

  useEffect(() => {
    async function checkSessionAndToken() {
      const currentSession = await getSession();
      if (!currentSession) {
        redirect('/login');
      }

      // Permitir acceso a /dashboard/profile sin token
      if (pathname !== '/dashboard/profile') {
        // Validar token (prueba, presencial o remoto)
        const { rows } = await sql`
          SELECT t.estado, t.fecha_expiracion
          FROM tokens t
          JOIN users u ON t.user_id = u.id
          WHERE u.id = ${currentSession.user.id} AND t.estado = 'activado' AND t.fecha_expiracion > NOW()
          ORDER BY t.fecha_creacion DESC
          LIMIT 1
        `;
        if (!rows[0]) {
          redirect('/dashboard/profile?message=token_required');
        }
      }
    }
    checkSessionAndToken();
  }, [pathname]);

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <SessionProvider session={session}>
      <ThemeContext.Provider value={{ theme, toggleTheme }}>
        <div className={theme === 'dark' ? 'bg-[#1F1F1F] text-white' : 'bg-gray-100 text-black'}>
          <div className="flex min-h-screen">
            <Sidebar />
            <div className="flex-1 lg:ml-3">
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