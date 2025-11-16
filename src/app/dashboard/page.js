'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user'));

      // Load data based on role
      if (userData.role === 'admin' || userData.role === 'hr') {
        // Load admin/hr stats
        const [employeesRes, attendanceRes, leaveRes, projectsRes] = await Promise.all([
          fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/attendance?start_date=' + new Date(new Date().setDate(1)).toISOString().split('T')[0], 
            { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/leave?status=pending', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const [employees, attendance, leaves, projects] = await Promise.all([
          employeesRes.json(),
          attendanceRes.json(),
          leaveRes.json(),
          projectsRes.json()
        ]);

        setStats({
          totalEmployees: employees.employees?.length || 0,
          presentToday: attendance.attendance?.filter(a => a.status === 'present').length || 0,
          pendingLeaves: leaves.leaves?.length || 0,
          activeProjects: projects.projects?.filter(p => p.status === 'active').length || 0
        });
      } else if (userData.role === 'project_manager') {
        // Load PM stats
        const [projectsRes, tasksRes] = await Promise.all([
          fetch('/api/projects', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const [projects, tasks] = await Promise.all([
          projectsRes.json(),
          tasksRes.json()
        ]);

        setStats({
          activeProjects: projects.projects?.length || 0,
          totalTasks: tasks.tasks?.length || 0,
          pendingTasks: tasks.tasks?.filter(t => t.status === 'todo').length || 0,
          completedTasks: tasks.tasks?.filter(t => t.status === 'done').length || 0
        });
      } else {
        // Load employee/intern stats
        const [attendanceRes, leaveRes, tasksRes] = await Promise.all([
          fetch('/api/attendance', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/leave', { headers: { Authorization: `Bearer ${token}` } }),
          fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const [attendance, leaves, tasks] = await Promise.all([
          attendanceRes.json(),
          leaveRes.json(),
          tasksRes.json()
        ]);

        setStats({
          attendanceThisMonth: attendance.attendance?.length || 0,
          pendingLeaves: leaves.leaves?.filter(l => l.status === 'pending').length || 0,
          myTasks: tasks.tasks?.length || 0,
          completedTasks: tasks.tasks?.filter(t => t.status === 'done').length || 0
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading...</div>
      </div>
    );
  }

  const StatCard = ({ title, value, icon, color = 'codeat-accent', gradient }) => (
    <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-lg hover:shadow-xl transition-all duration-300 card-hover group">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl ${gradient || 'bg-gradient-to-br from-codeat-accent to-codeat-teal'} flex items-center justify-center text-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-codeat-gray text-sm font-medium mb-2 uppercase tracking-wide">{title}</p>
        <p className={`text-4xl lg:text-5xl font-bold text-${color} mb-1`}>{value}</p>
        <div className="h-1 w-12 bg-gradient-to-r from-codeat-accent to-codeat-teal rounded-full mt-3"></div>
      </div>
    </div>
  );

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-codeat-mid to-codeat-mid/80 rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">
                Welcome back, {user.employee?.firstName || 'User'}! 👋
              </h1>
              <p className="text-codeat-gray text-lg">Here's what's happening with your account today.</p>
            </div>
            <div className="text-6xl opacity-20">📊</div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {user.role === 'admin' || user.role === 'hr' ? (
            <>
              <StatCard title="Total Employees" value={stats.totalEmployees || 0} icon="👥" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
              <StatCard title="Present Today" value={stats.presentToday || 0} icon="✅" gradient="bg-gradient-to-br from-green-500 to-green-600" />
              <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon="📅" gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" />
              <StatCard title="Active Projects" value={stats.activeProjects || 0} icon="📁" gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
            </>
          ) : user.role === 'project_manager' ? (
            <>
              <StatCard title="Active Projects" value={stats.activeProjects || 0} icon="📁" gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
              <StatCard title="Total Tasks" value={stats.totalTasks || 0} icon="✅" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
              <StatCard title="Pending Tasks" value={stats.pendingTasks || 0} icon="⏳" gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" />
              <StatCard title="Completed" value={stats.completedTasks || 0} icon="🎉" gradient="bg-gradient-to-br from-green-500 to-green-600" />
            </>
          ) : (
            <>
              <StatCard title="Attendance" value={stats.attendanceThisMonth || 0} icon="⏰" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
              <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon="📅" gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" />
              <StatCard title="My Tasks" value={stats.myTasks || 0} icon="✅" gradient="bg-gradient-to-br from-purple-500 to-purple-600" />
              <StatCard title="Completed" value={stats.completedTasks || 0} icon="🎉" gradient="bg-gradient-to-br from-green-500 to-green-600" />
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-codeat-silver">Quick Actions</h2>
            <div className="h-1 flex-1 mx-4 bg-codeat-muted/30 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {user.role === 'employee' || user.role === 'intern' ? (
              <>
                <a href="/attendance" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⏰</div>
                  <div className="text-codeat-silver font-semibold text-sm">Clock In/Out</div>
                </a>
                <a href="/leave" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📅</div>
                  <div className="text-codeat-silver font-semibold text-sm">Apply Leave</div>
                </a>
                <a href="/tasks" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✅</div>
                  <div className="text-codeat-silver font-semibold text-sm">My Tasks</div>
                </a>
                <a href="/profile" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👤</div>
                  <div className="text-codeat-silver font-semibold text-sm">Profile</div>
                </a>
              </>
            ) : (
              <>
                <a href="/employees" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                  <div className="text-codeat-silver font-semibold text-sm">Employees</div>
                </a>
                <a href="/projects" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
                  <div className="text-codeat-silver font-semibold text-sm">Projects</div>
                </a>
                <a href="/reports" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📈</div>
                  <div className="text-codeat-silver font-semibold text-sm">Reports</div>
                </a>
                <a href="/settings" className="group p-6 bg-gradient-to-br from-codeat-teal to-codeat-teal/80 rounded-xl text-center hover:from-codeat-teal/90 hover:to-codeat-teal/70 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-codeat-muted/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚙️</div>
                  <div className="text-codeat-silver font-semibold text-sm">Settings</div>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

