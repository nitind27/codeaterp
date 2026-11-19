'use client';

import { useEffect, useState } from 'react';
import Layout from '../../../components/Layout';
import LogoLoader from '../../../components/LogoLoader';
import PersonProfile from '../../../components/PersonProfile';
import { useParams, useRouter } from 'next/navigation';

export default function EmployeeProfilePage() {
  const router = useRouter();
  const params = useParams();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (!token || !raw) { router.push('/login'); return; }
    const parsed = JSON.parse(raw);
    if (parsed.role !== 'admin' && parsed.role !== 'hr' && parsed.role !== 'project_manager') {
      router.push('/profile');
      return;
    }
    setUser(parsed);
  }, [router]);

  if (!user) return <LogoLoader />;

  return (
    <Layout user={user}>
      <PersonProfile employeeId={params.id} viewer={user} />
    </Layout>
  );
}
