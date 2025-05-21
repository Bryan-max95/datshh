'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Lock, Mail, Key, Eye, EyeOff } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [showTwoFactor, setShowTwoFactor] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      twoFactorCode: showTwoFactor ? twoFactorCode : undefined,
    });

    setIsLoading(false);

    if (result?.error) {
      if (result.error === 'TwoFactorRequired') {
        setShowTwoFactor(true);
      } else {
        setError(
          result.error === 'CredentialsSignin'
            ? 'Credenciales inválidas'
            : result.error === 'Por favor, verifica tu email antes de iniciar sesión'
            ? 'Por favor, verifica tu correo antes de iniciar sesión'
            : result.error === 'Código 2FA inválido'
            ? 'Código 2FA inválido'
            : 'Error al iniciar sesión. Intenta de nuevo.'
        );
      }
    } else {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    const error = searchParams.get('error');
    if (error) {
      setError(
        error === 'CredentialsSignin'
          ? 'Credenciales inválidas'
          : error === 'TwoFactorRequired'
          ? 'Por favor, ingresa tu código 2FA'
          : error
      );
    }
  }, [searchParams]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="relative z-10 bg-gray-900/80 p-10 rounded-xl border border-gray-700 shadow-2xl max-w-md w-full backdrop-blur-sm"
    >
      <div className="text-center mb-8">
        <div className="flex justify-center mb-4">
          <div className="bg-[#8B0000]/20 p-3 rounded-full border border-[#8B0000]/30">
            <Lock className="w-8 h-8 text-[#8B0000]" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-white">Iniciar Sesión</h2>
        <p className="text-gray-400 mt-2">Ingresa tus credenciales para acceder</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Correo Electrónico</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-transparent text-white placeholder-gray-500"
              placeholder="tu@email.com"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Contraseña</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-transparent text-white placeholder-gray-500"
              placeholder="••••••••"
              required
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
              ) : (
                <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
              )}
            </button>
          </div>
        </div>

        {showTwoFactor && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Código 2FA</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Key className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value)}
                className="w-full pl-10 pr-3 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8B0000] focus:border-transparent text-white placeholder-gray-500"
                placeholder="Código de autenticación"
                required
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 text-[#8B0000] focus:ring-[#8B0000] border-gray-600 rounded"
            />
            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-300">
              Recordar sesión
            </label>
          </div>
          <a href="/forgot-password" className="text-sm text-[#8B0000] hover:underline">
            ¿Olvidaste tu contraseña?
          </a>
        </div>

        {error && (
          <div className="rounded-md bg-red-900/30 p-3 border border-red-800">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <motion.button
          type="submit"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          disabled={isLoading}
          className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-[#8B0000] hover:bg-[#7A0000] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#8B0000] transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isLoading ? (
            <svg
              className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : null}
          {isLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
        </motion.button>
      </form>

      <div className="mt-6 text-center">
        <p className="text-sm text-gray-400">
          ¿No tienes una cuenta?{' '}
          <a href="/register" className="font-medium text-[#8B0000] hover:text-[#7A0000] hover:underline">
            Regístrate ahora
          </a>
        </p>
      </div>
    </motion.div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <video
          id="background-video"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src="/videos/robot.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 to-[#8B0000]/30" />
      </div>

      <Suspense fallback={<div className="text-white"></div>}>
        <LoginContent />
      </Suspense>
    </main>
  );
}