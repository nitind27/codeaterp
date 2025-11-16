'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
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
          headers: { Authorization: `Bearer ${token}` }
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
          <h1 className="text-3xl font-bold text-codeat-silver mb-2">My Profile</h1>
          <p className="text-codeat-gray">View and manage your profile information</p>
        </div>

        <div className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-6">
          <div className="flex items-center space-x-6 mb-6">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-codeat-accent to-codeat-teal flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {(employee?.fullName || user?.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-codeat-silver mb-1">
                {employee?.fullName || user?.email}
              </h2>
              <p className="text-codeat-gray">{employee?.designation || user?.role}</p>
              <p className="text-codeat-gray text-sm">{employee?.department || ''}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">Employee ID</label>
              <div className="px-4 py-2 bg-codeat-dark rounded-lg text-codeat-silver font-mono">
                {employee?.employeeId || '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">Email</label>
              <div className="px-4 py-2 bg-codeat-dark rounded-lg text-codeat-silver">
                {user?.email}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">Phone</label>
              <div className="px-4 py-2 bg-codeat-dark rounded-lg text-codeat-silver">
                {employee?.phone || '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">Department</label>
              <div className="px-4 py-2 bg-codeat-dark rounded-lg text-codeat-silver">
                {employee?.department || '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">Joining Date</label>
              <div className="px-4 py-2 bg-codeat-dark rounded-lg text-codeat-silver">
                {employee?.joiningDate ? new Date(employee.joiningDate).toLocaleDateString() : '-'}
              </div>
            </div>
            <div>
              <label className="block text-codeat-gray text-sm font-medium mb-2">Role</label>
              <div className="px-4 py-2 bg-codeat-dark rounded-lg text-codeat-silver capitalize">
                {user?.role?.replace('_', ' ')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

