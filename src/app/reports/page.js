'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ReportsPage() {
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

  const reports = [
    { name: 'Attendance Report', description: 'View attendance records and statistics', icon: '⏰', color: 'from-blue-500 to-blue-600' },
    { name: 'Leave Report', description: 'Generate leave applications and balance reports', icon: '📅', color: 'from-green-500 to-green-600' },
    { name: 'Employee Report', description: 'Export employee list and details', icon: '👥', color: 'from-purple-500 to-purple-600' },
    { name: 'Project Report', description: 'View project progress and statistics', icon: '📁', color: 'from-orange-500 to-orange-600' },
    { name: 'Task Report', description: 'Track task completion and performance', icon: '✅', color: 'from-teal-500 to-teal-600' },
    { name: 'Complaint Report', description: 'View complaints and resolution status', icon: '📝', color: 'from-red-500 to-red-600' }
  ];

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-codeat-silver mb-2">Reports</h1>
          <p className="text-codeat-gray">Generate and export various reports</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report, index) => (
            <div
              key={index}
              className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-6 hover:border-codeat-accent/50 transition cursor-pointer group"
            >
              <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${report.color} flex items-center justify-center text-3xl mb-4 group-hover:scale-110 transition-transform`}>
                {report.icon}
              </div>
              <h3 className="text-codeat-silver font-bold text-lg mb-2">{report.name}</h3>
              <p className="text-codeat-gray text-sm mb-4">{report.description}</p>
              <button className="w-full px-4 py-2 bg-codeat-accent text-white rounded-lg hover:bg-codeat-accent/80 transition font-medium text-sm">
                Generate Report
              </button>
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

