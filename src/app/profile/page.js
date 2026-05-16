'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [employee, setEmployee] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.employee) {
      setEmployee(parsedUser.employee);
    } else {
      loadEmployee();
    }

    setLoading(false);
  }, []);

  const loadEmployee = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user'));

      if (userData.employee?.id) {
        const response = await fetch(`/api/employees/${userData.employee.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (data.success) {
          setEmployee(data.employee);
        }
      }
    } catch (error) {
      console.error('Error loading employee:', error);
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  return (
    <Layout user={user}>
      <div className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-codeat-silver mb-2">
            My Profile
          </h1>
          <p className="text-codeat-gray text-sm sm:text-base">
            View and manage your profile information
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-6">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-gradient-to-br from-codeat-accent to-codeat-teal flex items-center justify-center text-white text-2xl sm:text-3xl font-bold shadow-lg">
              {(employee?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h2 className="text-xl sm:text-2xl font-bold text-codeat-silver mb-1 truncate">
                {employee?.fullName || user?.email}
              </h2>
              <p className="text-codeat-gray truncate">{employee?.designation || user?.role}</p>
              <p className="text-codeat-gray text-sm truncate">{employee?.department || ''}</p>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Employee ID
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver font-mono text-sm sm:text-base truncate">
                {employee?.employeeId || '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Email
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver text-sm sm:text-base truncate break-all">
                {user?.email}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Phone
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver text-sm sm:text-base truncate">
                {employee?.phone || '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Department
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver text-sm sm:text-base truncate">
                {employee?.department || '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Date of Birth
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver text-sm sm:text-base">
                {employee?.dateOfBirth ? (
                  <>
                    {new Date(employee.dateOfBirth).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    <span className="ml-2 text-codeat-gray text-xs">
                      (Birthday tracking enabled 🎂)
                    </span>
                  </>
                ) : (
                  '-'
                )}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Joining Date
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver text-sm sm:text-base">
                {employee?.joiningDate
                  ? new Date(employee.joiningDate).toLocaleDateString()
                  : '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">
                Role
              </label>
              <div className="px-3 py-2 sm:px-4 sm:py-2 bg-codeat-dark rounded-lg text-codeat-silver capitalize text-sm sm:text-base">
                {user?.role?.replace('_', ' ') || '-'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}