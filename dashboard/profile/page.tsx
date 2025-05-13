'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { User, Key, Lock, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { sql } from '@vercel/postgres';
import { z } from 'zod';
import { PayPalButtons } from '@paypal/react-paypal-js';
import sanitizeHtml from 'sanitize-html';
import { useTranslation } from 'react-i18next';

const UpdateProfileSchema = z.object({
  name: z.string().min(1, { message: 'profile.nameRequired' }),
  email: z.string().email({ message: 'profile.invalidEmail' }),
});

const UpdatePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: 'profile.currentPasswordRequired' }),
  newPassword: z.string().min(8, { message: 'profile.newPasswordMinLength' }),
  confirmPassword: z.string().min(8, { message: 'profile.confirmPasswordMinLength' }),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'profile.passwordsDoNotMatch',
  path: ['confirmPassword'],
});

interface Token {
  token: string;
  tipo: 'prueba' | 'presencial' | 'remoto';
  estado: 'pendiente' | 'activado' | 'expirado';
  fecha_creacion: string;
  fecha_activacion: string | null;
  fecha_expiracion: string | null;
}

export default function Profile() {
  const { t } = useTranslation();
  const { data: session, update } = useSession();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [password, setPassword] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [token, setToken] = useState<Token | null>(null);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [paypalOrderId, setPaypalOrderId] = useState<string | null>(null);

  const loadToken = useCallback(async () => {
    if (!session?.user.id) return;
    try {
      const { rows } = await sql`
        SELECT token, tipo, estado, fecha_creacion, fecha_activacion, fecha_expiracion
        FROM tokens
        WHERE user_id = ${session.user.id} AND estado = 'activado' AND fecha_expiracion > NOW()
        ORDER BY fecha_creacion DESC
        LIMIT 1
      `;
      setToken(rows[0] || null);
    } catch (error) {
      console.error('Error loading token:', error);
      toast.error(t('profile.tokenLoadError'));
    }
  }, [session, t]);

  useEffect(() => {
    if (session?.user) {
      setProfile({
        name: sanitizeHtml(session.user.name || ''),
        email: sanitizeHtml(session.user.email || ''),
      });
      loadToken();
    }
  }, [session, loadToken]);

  const handleUpdateProfile = async () => {
    try {
      setIsLoading(true);
      const sanitizedProfile = {
        name: sanitizeHtml(profile.name),
        email: sanitizeHtml(profile.email),
      };
      UpdateProfileSchema.parse(sanitizedProfile);
      const response = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedProfile),
      });
      if (!response.ok) throw new Error('Failed to update profile');
      await update({ ...session, user: { ...session?.user, ...sanitizedProfile } });
      toast.success(t('profile.updateSuccess'));
      setError('');
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError
        ? error.errors.map((e) => t(e.message)).join(', ')
        : t('profile.updateError');
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async () => {
    try {
      setIsLoading(true);
      const sanitizedPassword = {
        currentPassword: sanitizeHtml(password.currentPassword),
        newPassword: sanitizeHtml(password.newPassword),
        confirmPassword: sanitizeHtml(password.confirmPassword),
      };
      UpdatePasswordSchema.parse(sanitizedPassword);
      const response = await fetch('/api/users/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: sanitizedPassword.currentPassword,
          newPassword: sanitizedPassword.newPassword,
        }),
      });
      if (!response.ok) throw new Error('Failed to update password');
      toast.success(t('profile.passwordUpdateSuccess'));
      setPassword({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setError('');
    } catch (error: any) {
      const errorMessage = error instanceof z.ZodError
        ? error.errors.map((e) => t(e.message)).join(', ')
        : t('profile.passwordUpdateError');
      setError(errorMessage);
      toast.error(errorMessage);
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePresencialToken = async () => {
    if (!session?.user.id) return;
    setIsGeneratingToken(true);
    try {
      const tokenValue = crypto.randomUUID();
      const expirationDate = new Date();
      expirationDate.setMonth(expirationDate.getMonth() + 1);
      const { rows } = await sql`
        INSERT INTO tokens (token, email_cliente, tipo, estado, fecha_creacion, fecha_expiracion, user_id)
        VALUES (${tokenValue}, ${sanitizeHtml(session.user.email || '')}, 'presencial', 'pendiente', NOW(), ${expirationDate.toISOString()}, ${session.user.id})
        RETURNING token, tipo, estado, fecha_creacion, fecha_expiracion
      `;
      setToken(rows[0]);
      toast.success(t('profile.presencialTokenSuccess'));
    } catch (error) {
      console.error('Error generating presencial token:', error);
      toast.error(t('profile.presencialTokenError'));
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const createPaypalOrder = async () => {
    try {
      const response = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: '50.00' }),
      });
      const order = await response.json();
      setPaypalOrderId(order.id);
      return order.id;
    } catch (error) {
      console.error('Error creating PayPal order:', error);
      toast.error(t('profile.paypalOrderError'));
      throw error;
    }
  };

  const onApprovePaypal = async (data: { orderID: string }) => {
    try {
      const response = await fetch('/api/paypal/capture-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: data.orderID }),
      });
      const result = await response.json();
      if (result.status === 'COMPLETED' && session?.user.id) {
        const tokenValue = crypto.randomUUID();
        const expirationDate = new Date();
        expirationDate.setMonth(expirationDate.getMonth() + 1);
        const { rows } = await sql`
          INSERT INTO tokens (token, email_cliente, tipo, estado, fecha_creacion, fecha_activacion, fecha_expiracion, user_id)
          VALUES (${tokenValue}, ${sanitizeHtml(session.user.email || '')}, 'remoto', 'activado', NOW(), NOW(), ${expirationDate.toISOString()}, ${session.user.id})
          RETURNING token, tipo, estado, fecha_creacion, fecha_activacion, fecha_expiracion
        `;
        setToken(rows[0]);
        toast.success(t('profile.remotoTokenSuccess'));
      } else {
        throw new Error('Payment not completed');
      }
    } catch (error) {
      console.error('Error capturing PayPal payment:', error);
      toast.error(t('profile.remotoTokenError'));
    } finally {
      setPaypalOrderId(null);
    }
  };

  if (!session) {
    return (
      <div className="flex justify-center items-center h-full bg-[#121212]">
        <Loader2 className="h-8 w-8 animate-spin text-[#8B0000]" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="p-6 space-y-6 bg-[#121212] min-h-screen"
    >
      <h1 className="text-3xl font-bold text-[#8B0000]">{t('profile.title')}</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">{error}</div>
      )}

      <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <User className="w-5 h-5 text-[#8B0000]" />
          {t('profile.updateProfile')}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300">
              {t('profile.name')}
            </label>
            <input
              id="name"
              type="text"
              value={profile.name}
              onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              className="mt-1 w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300">
              {t('profile.email')}
            </label>
            <input
              id="email"
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              className="mt-1 w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
              aria-required="true"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdateProfile}
            disabled={isLoading}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            aria-label={t('profile.updateProfile')}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
            {t('profile.updateProfile')}
          </motion.button>
        </div>
      </div>

      <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#8B0000]" />
          {t('profile.changePassword')}
        </h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300">
              {t('profile.currentPassword')}
            </label>
            <input
              id="currentPassword"
              type="password"
              value={password.currentPassword}
              onChange={(e) => setPassword({ ...password, currentPassword: e.target.value })}
              className="mt-1 w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300">
              {t('profile.newPassword')}
            </label>
            <input
              id="newPassword"
              type="password"
              value={password.newPassword}
              onChange={(e) => setPassword({ ...password, newPassword: e.target.value })}
              className="mt-1 w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
              aria-required="true"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300">
              {t('profile.confirmPassword')}
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={password.confirmPassword}
              onChange={(e) => setPassword({ ...password, confirmPassword: e.target.value })}
              className="mt-1 w-full bg-[#2A2A2A] border border-[#8B0000]/30 text-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8B0000]"
              disabled={isLoading}
              aria-required="true"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleUpdatePassword}
            disabled={isLoading}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            aria-label={t('profile.changePassword')}
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle className="h-5 w-5" />}
            {t('profile.changePassword')}
          </motion.button>
        </div>
      </div>

      <div className="bg-[#1C1C1C] p-6 rounded-lg border border-[#8B0000]/30 shadow-xl">
        <h2 className="text-lg font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <Key className="w-5 h-5 text-[#8B0000]" />
          {t('profile.tokenManagement')}
        </h2>
        {token ? (
          <div className="space-y-4 text-gray-300">
            <p>
              <strong>{t('profile.token')}:</strong> {token.token}
            </p>
            <p>
              <strong>{t('profile.type')}:</strong>{' '}
              {token.tipo === 'prueba'
                ? t('profile.trialToken')
                : token.tipo === 'presencial'
                ? t('profile.presencialToken')
                : t('profile.remotoToken')}
            </p>
            <p>
              <strong>{t('profile.status')}:</strong> {t(`profile.status.${token.estado}`)}
            </p>
            <p>
              <strong>{t('profile.createdAt')}:</strong>{' '}
              {new Date(token.fecha_creacion).toLocaleString()}
            </p>
            {token.fecha_activacion && (
              <p>
                <strong>{t('profile.activatedAt')}:</strong>{' '}
                {new Date(token.fecha_activacion).toLocaleString()}
              </p>
            )}
            {token.fecha_expiracion && (
              <p>
                <strong>{t('profile.expiresAt')}:</strong>{' '}
                {new Date(token.fecha_expiracion).toLocaleString()}
              </p>
            )}
            {token.tipo === 'prueba' && (
              <p className="text-yellow-600">{t('profile.trialWarning')}</p>
            )}
          </div>
        ) : (
          <p className="text-red-500">{t('profile.noActiveToken')}</p>
        )}
        <div className="mt-4 flex flex-col sm:flex-row gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={generatePresencialToken}
            disabled={isGeneratingToken || !!token}
            className="bg-[#8B0000] text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50"
            aria-label={t('profile.generatePresencialToken')}
          >
            {isGeneratingToken ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Key className="h-5 w-5" />
            )}
            {t('profile.generatePresencialToken')}
          </motion.button>
          {!token && (
            <div className="flex-1">
              <h3 className="text-sm font-medium text-gray-300 mb-2">
                {t('profile.purchaseRemotoToken')}
              </h3>
              <PayPalButtons
                createOrder={createPaypalOrder}
                onApprove={onApprovePaypal}
                onError={() => toast.error(t('profile.paypalPaymentError'))}
                disabled={isGeneratingToken || !!paypalOrderId}
                style={{ layout: 'vertical' }}
              />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}