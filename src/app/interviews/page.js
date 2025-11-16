'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function InterviewsPage() {
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

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'admin' && parsedUser.role !== 'hr') {
      router.push('/dashboard');
      return;
    }

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
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-codeat-silver mb-2">Interviews</h1>
            <p className="text-codeat-gray">Manage candidate interviews and tracking</p>
          </div>
          <button className="px-6 py-3 bg-codeat-accent text-white rounded-lg hover:bg-codeat-accent/80 transition font-medium shadow-lg shadow-codeat-accent/20">
            + Schedule Interview
          </button>
        </div>

        <div className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-12 text-center">
          <div className="text-6xl mb-4">🎯</div>
          <h3 className="text-codeat-silver font-bold text-xl mb-2">Interview Tracking</h3>
          <p className="text-codeat-gray">Interview management coming soon...</p>
        </div>
      </div>
    </Layout>
  );
}

