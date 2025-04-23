/* src/app/dashboard/page.tsx */
'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useSession } from 'next-auth/react';

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

  return <div className="text-gray-400 p-6">Redirecting...</div>;
}