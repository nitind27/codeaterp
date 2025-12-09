'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import LogoLoader from '../components/LogoLoader';

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

  return <LogoLoader />;
}
