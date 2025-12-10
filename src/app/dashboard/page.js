'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Helper function to handle session expiry
const handleSessionExpiry = (data, router) => {
  if (data.sessionExpired) {
    localStorage.removeItem('token');
    localStorage.removeItem('sessionToken');
    localStorage.removeItem('user');
    toast.error('Session expired! You have been logged in from another device.');
    router.push('/login?sessionExpired=true');
    return true;
  }
  return false;
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [anniversaries, setAnniversaries] = useState({
    birthdays: [],
    workAnniversaries: [],
    companyAnniversary: null
  });

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

        // Check for session expiry in any response
        if (handleSessionExpiry(employees, router) || handleSessionExpiry(attendance, router) || 
            handleSessionExpiry(leaves, router) || handleSessionExpiry(projects, router)) {
          return;
        }

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

        // Check for session expiry
        if (handleSessionExpiry(projects, router) || handleSessionExpiry(tasks, router)) {
          return;
        }

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

        // Check for session expiry
        if (handleSessionExpiry(attendance, router) || handleSessionExpiry(leaves, router) || 
            handleSessionExpiry(tasks, router)) {
          return;
        }

        setStats({
          attendanceThisMonth: attendance.attendance?.length || 0,
          pendingLeaves: leaves.leaves?.filter(l => l.status === 'pending').length || 0,
          myTasks: tasks.tasks?.length || 0,
          completedTasks: tasks.tasks?.filter(t => t.status === 'done').length || 0
        });
      }

      // Load anniversaries for all users
      try {
        const anniversariesRes = await fetch('/api/anniversaries', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const anniversariesData = await anniversariesRes.json();
        
        // Check for session expiry
        if (handleSessionExpiry(anniversariesData, router)) {
          return;
        }
        
        if (anniversariesData.success) {
          setAnniversaries({
            birthdays: anniversariesData.birthdays || [],
            workAnniversaries: anniversariesData.workAnniversaries || [],
            companyAnniversary: anniversariesData.companyAnniversary || null
          });
        }
      } catch (error) {
        console.error('Error loading anniversaries:', error);
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  const StatCard = ({ title, value, icon, gradient }) => (
    <div className="bg-[#0A2A2D] rounded-2xl p-6 lg:p-8 border border-[#12474c]/30 shadow-lg hover:shadow-xl transition-all duration-300 card-hover group hover:border-[#1A656D]/40">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl ${gradient || 'bg-gradient-to-br from-[#1A656D] to-[#31747c]'} flex items-center justify-center text-2xl shadow-lg shadow-[#1A656D]/30 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[#8db2b6] text-sm font-medium mb-2 uppercase tracking-wide">{title}</p>
        <p className="text-4xl lg:text-5xl font-bold text-[#F6FBFB] mb-1">{value}</p>
        <div className="h-1 w-12 bg-gradient-to-r from-[#1A656D] to-[#31747c] rounded-full mt-3"></div>
      </div>
    </div>
  );

  const AnniversaryCard = ({ type, name, department, designation, daysUntil, age, yearsOfService, date }) => {
    const isToday = daysUntil === 0;
    const isTomorrow = daysUntil === 1;
    const isDayAfter = daysUntil === 2;
    
    let timeText = '';
    if (isToday) timeText = 'Today';
    else if (isTomorrow) timeText = 'Tomorrow';
    else if (isDayAfter) timeText = 'Day After';
    else timeText = `In ${daysUntil} days`;

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    if (type === 'birthday') {
      return (
        <div className="bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-2xl p-5 border border-pink-500/30 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg">
                🎂
              </div>
              <div>
                <h3 className="text-[#F6FBFB] font-semibold text-lg">{name}</h3>
                <p className="text-[#8db2b6] text-sm">{department || 'General'}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isToday ? 'bg-pink-500 text-white' : 'bg-pink-500/30 text-pink-300'
            }`}>
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8db2b6] text-xs uppercase tracking-wide mb-1">Birthday</p>
              <p className="text-[#F6FBFB] font-medium">{formatDate(date)}</p>
              {age && <p className="text-[#8db2b6] text-sm mt-1">Turning {age} years old</p>}
            </div>
            <div className="text-3xl opacity-50">🎉</div>
          </div>
        </div>
      );
    } else if (type === 'work_anniversary') {
      return (
        <div className="bg-gradient-to-br from-[#1A656D]/30 to-[#31747c]/30 rounded-2xl p-5 border border-[#1A656D]/40 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1A656D] to-[#31747c] flex items-center justify-center text-2xl shadow-lg shadow-[#1A656D]/40">
                🎊
              </div>
              <div>
                <h3 className="text-[#F6FBFB] font-semibold text-lg">{name}</h3>
                <p className="text-[#8db2b6] text-sm">{designation || department || 'Employee'}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isToday ? 'bg-[#1A656D] text-white' : 'bg-[#1A656D]/30 text-[#5f9399]'
            }`}>
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8db2b6] text-xs uppercase tracking-wide mb-1">Work Anniversary</p>
              <p className="text-[#F6FBFB] font-medium">{formatDate(date)}</p>
              {yearsOfService !== null && (
                <p className="text-[#8db2b6] text-sm mt-1">{yearsOfService} {yearsOfService === 1 ? 'year' : 'years'} of service</p>
              )}
            </div>
            <div className="text-3xl opacity-50">🏆</div>
          </div>
        </div>
      );
    } else if (type === 'company_anniversary') {
      return (
        <div className="bg-gradient-to-br from-purple-500/20 to-indigo-500/20 rounded-2xl p-5 border border-purple-500/30 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-2xl shadow-lg">
                🏢
              </div>
              <div>
                <h3 className="text-[#F6FBFB] font-semibold text-lg">Company Anniversary</h3>
                <p className="text-[#8db2b6] text-sm">Celebrating together</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isToday ? 'bg-purple-500 text-white' : 'bg-purple-500/30 text-purple-300'
            }`}>
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#8db2b6] text-xs uppercase tracking-wide mb-1">Anniversary Date</p>
              <p className="text-[#F6FBFB] font-medium">{formatDate(date)}</p>
              {yearsOfService !== null && (
                <p className="text-[#8db2b6] text-sm mt-1">{yearsOfService} {yearsOfService === 1 ? 'year' : 'years'} milestone</p>
              )}
            </div>
            <div className="text-3xl opacity-50">🎈</div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-[#0A2A2D] to-[#0d3337] rounded-2xl p-6 lg:p-8 border border-[#12474c]/30 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-[#F6FBFB] mb-2">
                Welcome back, {user.employee?.firstName || 'User'}! 👋
              </h1>
              <p className="text-[#8db2b6] text-lg">Here's what's happening with your account today.</p>
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
              <StatCard title="Active Projects" value={stats.activeProjects || 0} icon="📁" gradient="bg-gradient-to-br from-[#1A656D] to-[#31747c]" />
            </>
          ) : user.role === 'project_manager' ? (
            <>
              <StatCard title="Active Projects" value={stats.activeProjects || 0} icon="📁" gradient="bg-gradient-to-br from-[#1A656D] to-[#31747c]" />
              <StatCard title="Total Tasks" value={stats.totalTasks || 0} icon="✅" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
              <StatCard title="Pending Tasks" value={stats.pendingTasks || 0} icon="⏳" gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" />
              <StatCard title="Completed" value={stats.completedTasks || 0} icon="🎉" gradient="bg-gradient-to-br from-green-500 to-green-600" />
            </>
          ) : (
            <>
              <StatCard title="Attendance" value={stats.attendanceThisMonth || 0} icon="⏰" gradient="bg-gradient-to-br from-blue-500 to-blue-600" />
              <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon="📅" gradient="bg-gradient-to-br from-yellow-500 to-yellow-600" />
              <StatCard title="My Tasks" value={stats.myTasks || 0} icon="✅" gradient="bg-gradient-to-br from-[#1A656D] to-[#31747c]" />
              <StatCard title="Completed" value={stats.completedTasks || 0} icon="🎉" gradient="bg-gradient-to-br from-green-500 to-green-600" />
            </>
          )}
        </div>

        {/* Upcoming Celebrations */}
        {(anniversaries.birthdays.length > 0 || anniversaries.workAnniversaries.length > 0 || anniversaries.companyAnniversary) && (
          <div className="bg-[#0A2A2D] rounded-2xl p-6 lg:p-8 border border-[#12474c]/30 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#F6FBFB] mb-1">Upcoming Celebrations</h2>
                <p className="text-[#8db2b6] text-sm">Birthdays, anniversaries & milestones in the next 3 days</p>
              </div>
              <div className="text-4xl opacity-30">🎉</div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Company Anniversary */}
              {anniversaries.companyAnniversary && (
                <AnniversaryCard
                  type="company_anniversary"
                  name="Company Anniversary"
                  date={anniversaries.companyAnniversary.date}
                  daysUntil={anniversaries.companyAnniversary.daysUntil}
                  yearsOfService={anniversaries.companyAnniversary.years}
                />
              )}
              {/* Birthdays */}
              {anniversaries.birthdays.map((birthday) => (
                <AnniversaryCard
                  key={`birthday-${birthday.id}`}
                  type="birthday"
                  name={birthday.name}
                  department={birthday.department}
                  designation={birthday.designation}
                  date={birthday.date}
                  daysUntil={birthday.daysUntil}
                  age={birthday.age}
                />
              ))}
              {/* Work Anniversaries */}
              {anniversaries.workAnniversaries.map((anniversary) => (
                <AnniversaryCard
                  key={`anniversary-${anniversary.id}`}
                  type="work_anniversary"
                  name={anniversary.name}
                  department={anniversary.department}
                  designation={anniversary.designation}
                  date={anniversary.date}
                  daysUntil={anniversary.daysUntil}
                  yearsOfService={anniversary.yearsOfService}
                />
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-[#0A2A2D] rounded-2xl p-6 lg:p-8 border border-[#12474c]/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#F6FBFB]">Quick Actions</h2>
            <div className="h-1 flex-1 mx-4 bg-[#12474c]/30 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {user.role === 'employee' || user.role === 'intern' ? (
              <>
                <a href="/attendance" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⏰</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Clock In/Out</div>
                </a>
                <a href="/leave" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📅</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Apply Leave</div>
                </a>
                <a href="/tasks" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">✅</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">My Tasks</div>
                </a>
                <a href="/profile" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👤</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Profile</div>
                </a>
              </>
            ) : (
              <>
                <a href="/employees" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Employees</div>
                </a>
                <a href="/projects" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Projects</div>
                </a>
                <a href="/reports" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📈</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Reports</div>
                </a>
                <a href="/settings" className="group p-6 bg-gradient-to-br from-[#1A656D] to-[#175b62] rounded-xl text-center hover:from-[#1A656D]/90 hover:to-[#175b62]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#31747c]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚙️</div>
                  <div className="text-[#F6FBFB] font-semibold text-sm">Settings</div>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
