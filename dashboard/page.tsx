/* src/app/dashboard/page.tsx */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      router.push('/dashboard/overview');
    } else if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center min-h-screen text-gray-400"
    >
      <Loader2 className="w-8 h-8 animate-spin mr-2" />
      <span>Redirecting...</span>
    </motion.div>
  );
}