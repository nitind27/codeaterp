'use client';

import { useEffect, useState } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import PersonProfile from '../../components/PersonProfile';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (!token || !raw) { router.push('/login'); return; }
    setUser(JSON.parse(raw));
  }, [router]);

  if (!user) return <LogoLoader />;

  return (
    <Layout user={user}>
      {user.employee?.id ? (
        <PersonProfile employeeId={user.employee.id} viewer={user} />
      ) : (
        <div className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-10 text-center text-[#9aa3ab]">
          Your login is not linked to an employee profile yet.
        </div>
      )}
    </Layout>
  );
}
