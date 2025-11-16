'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, []);

  return (
    <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
      <div className="text-codeat-accent text-xl">Loading...</div>
    </div>
  );
}
