'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    setLoading(false);
  }, []);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-codeat-silver mb-2">Settings</h1>
          <p className="text-codeat-gray">Manage system settings and preferences</p>
        </div>

        <div className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-6">
          <h2 className="text-codeat-silver font-bold text-lg mb-4">System Settings</h2>
          <p className="text-codeat-gray">Settings configuration coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}

