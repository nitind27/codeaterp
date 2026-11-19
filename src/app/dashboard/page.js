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
  const [reminders, setReminders] = useState([]);
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

        const openTasks = tasks.tasks?.filter(t => t.status !== 'done' && t.status !== 'cancelled') || [];
        const todayKey = new Date().toISOString().split('T')[0];
        const todayRow = (attendance.attendance || []).find((row) => String(row.date).slice(0, 10) === todayKey);
        let nextHoliday = null;
        try {
          const holidayRes = await fetch('/api/holidays', { headers: { Authorization: `Bearer ${token}` } });
          const holidayData = await holidayRes.json();
          nextHoliday = (holidayData.holidays || [])
            .filter((holiday) => new Date(holiday.endDate) >= new Date())
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate))[0];
        } catch {}

        setStats({
          attendanceThisMonth: attendance.attendance?.length || 0,
          pendingLeaves: leaves.leaves?.filter(l => l.status === 'pending').length || 0,
          myTasks: tasks.tasks?.length || 0,
          completedTasks: tasks.tasks?.filter(t => t.status === 'done').length || 0
        });
        setReminders([
          !todayRow?.clockIn ? { text: 'Clock in is still pending for today', href: '/attendance', tone: 'from-[#1c3d66]/50 to-[#2a6f8a]/15 border-[#7fd4e4]/30' } : null,
          todayRow?.clockIn && !todayRow?.clockOut ? { text: 'You are clocked in. Clock out before you leave.', href: '/attendance', tone: 'from-[#16324f]/70 to-[#4eb8cc]/15 border-[#7fd4e4]/30' } : null,
          leaves.leaves?.some(l => l.status === 'pending') ? { text: 'A leave request is waiting for admin', href: '/leave', tone: 'from-[#1c3d66]/40 to-[#7fd4e4]/10 border-[#4eb8cc]/30' } : null,
          openTasks.length ? { text: `${openTasks.length} open task${openTasks.length > 1 ? 's' : ''} on your desk`, href: '/tasks', tone: 'from-[#0e1c2c] to-[#1c3d66]/40 border-[#7fd4e4]/25' } : null,
          nextHoliday ? { text: `Next holiday: ${nextHoliday.title}`, href: '/holidays', tone: 'from-[#101820] to-[#2a6f8a]/25 border-[#7fd4e4]/25' } : null,
        ].filter(Boolean));
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
    <div className="bg-[#0c1218] rounded-2xl p-6 lg:p-8 border border-[#7fd4e4]/15 shadow-lg hover:shadow-xl transition-all duration-300 card-hover group hover:border-[#7fd4e4]/35">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-14 h-14 rounded-xl ${gradient || 'bg-gradient-to-br from-[#1c3d66] to-[#7fd4e4]'} flex items-center justify-center text-2xl shadow-lg shadow-[#4eb8cc]/25 group-hover:scale-110 transition-transform duration-300`}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-[#9aa3ab] text-sm font-medium mb-2 uppercase tracking-wide">{title}</p>
        <p className="text-4xl lg:text-5xl font-bold text-[#f4f7f8] mb-1">{value}</p>
        <div className="h-1 w-12 bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] rounded-full mt-3"></div>
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
        <div className="bg-gradient-to-br from-[#0c1218] to-[#101820] rounded-2xl p-5 border border-[#7fd4e4]/20 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1c3d66] to-[#7fd4e4] flex items-center justify-center text-2xl shadow-lg">
                🎂
              </div>
              <div>
                <h3 className="text-[#f4f7f8] font-semibold text-lg">{name}</h3>
                <p className="text-[#9aa3ab] text-sm">{department || 'General'}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isToday ? 'bg-[#2a6f8a] text-white' : 'bg-[#7fd4e4]/15 text-[#7fd4e4]'
            }`}>
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#9aa3ab] text-xs uppercase tracking-wide mb-1">Birthday</p>
              <p className="text-[#f4f7f8] font-medium">{formatDate(date)}</p>
              {age && <p className="text-[#9aa3ab] text-sm mt-1">Turning {age} years old</p>}
            </div>
            <div className="text-3xl opacity-50">🎉</div>
          </div>
        </div>
      );
    } else if (type === 'work_anniversary') {
      return (
        <div className="bg-gradient-to-br from-[#2a6f8a]/30 to-[#4eb8cc]/30 rounded-2xl p-5 border border-[#2a6f8a]/40 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2a6f8a] to-[#4eb8cc] flex items-center justify-center text-2xl shadow-lg shadow-[#2a6f8a]/40">
                🎊
              </div>
              <div>
                <h3 className="text-[#f4f7f8] font-semibold text-lg">{name}</h3>
                <p className="text-[#9aa3ab] text-sm">{designation || department || 'Employee'}</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isToday ? 'bg-[#2a6f8a] text-white' : 'bg-[#2a6f8a]/30 text-[#8d949b]'
            }`}>
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#9aa3ab] text-xs uppercase tracking-wide mb-1">Work Anniversary</p>
              <p className="text-[#f4f7f8] font-medium">{formatDate(date)}</p>
              {yearsOfService !== null && (
                <p className="text-[#9aa3ab] text-sm mt-1">{yearsOfService} {yearsOfService === 1 ? 'year' : 'years'} of service</p>
              )}
            </div>
            <div className="text-3xl opacity-50">🏆</div>
          </div>
        </div>
      );
    } else if (type === 'company_anniversary') {
      return (
        <div className="bg-gradient-to-br from-[#0c1218] to-[#101820] rounded-2xl p-5 border border-[#7fd4e4]/20 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#16324f] to-[#4eb8cc] flex items-center justify-center text-2xl shadow-lg">
                🏢
              </div>
              <div>
                <h3 className="text-[#f4f7f8] font-semibold text-lg">Company Anniversary</h3>
                <p className="text-[#9aa3ab] text-sm">Celebrating together</p>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
              isToday ? 'bg-[#2a6f8a] text-white' : 'bg-[#7fd4e4]/15 text-[#7fd4e4]'
            }`}>
              {timeText}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#9aa3ab] text-xs uppercase tracking-wide mb-1">Anniversary Date</p>
              <p className="text-[#f4f7f8] font-medium">{formatDate(date)}</p>
              {yearsOfService !== null && (
                <p className="text-[#9aa3ab] text-sm mt-1">{yearsOfService} {yearsOfService === 1 ? 'year' : 'years'} milestone</p>
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
        <div className="rounded-3xl p-6 lg:p-8 border shadow-xl bg-gradient-to-br from-[#0c1218] via-[#101820] to-[#0e1c2c] border-[#7fd4e4]/20">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.28em] text-white/40 mb-2">{user.role === 'intern' ? 'Intern portal' : user.role === 'employee' ? 'Employee portal' : 'Workspace'}</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-[#f4f7f8] mb-2">
                Welcome back, {user.employee?.firstName || 'User'}
              </h1>
              <p className="text-[#c5cdd4] text-lg">Attendance, tasks, requests, and your groups are one tap away.</p>
            </div>
          </div>
        </div>

        {(user.role === 'employee' || user.role === 'intern') && reminders.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {reminders.map((item) => (
              <a key={item.text} href={item.href} className={`rounded-2xl border bg-gradient-to-r ${item.tone} p-4 text-sm font-medium text-white hover:opacity-90`}>
                {item.text}
              </a>
            ))}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {user.role === 'admin' || user.role === 'hr' ? (
            <>
              <StatCard title="Total Employees" value={stats.totalEmployees || 0} icon="👥" gradient="bg-gradient-to-br from-[#1c3d66] to-[#4eb8cc]" />
              <StatCard title="Present Today" value={stats.presentToday || 0} icon="✅" gradient="bg-gradient-to-br from-[#16324f] to-[#7fd4e4]" />
              <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon="📅" gradient="bg-gradient-to-br from-[#1c3d66] to-[#2a6f8a]" />
              <StatCard title="Active Projects" value={stats.activeProjects || 0} icon="📁" gradient="bg-gradient-to-br from-[#0e1c2c] to-[#4eb8cc]" />
            </>
          ) : user.role === 'project_manager' ? (
            <>
              <StatCard title="Active Projects" value={stats.activeProjects || 0} icon="📁" gradient="bg-gradient-to-br from-[#1c3d66] to-[#4eb8cc]" />
              <StatCard title="Total Tasks" value={stats.totalTasks || 0} icon="✅" gradient="bg-gradient-to-br from-[#16324f] to-[#7fd4e4]" />
              <StatCard title="Pending Tasks" value={stats.pendingTasks || 0} icon="⏳" gradient="bg-gradient-to-br from-[#1c3d66] to-[#2a6f8a]" />
              <StatCard title="Completed" value={stats.completedTasks || 0} icon="🎉" gradient="bg-gradient-to-br from-[#0e1c2c] to-[#4eb8cc]" />
            </>
          ) : (
            <>
              <StatCard title="Attendance" value={stats.attendanceThisMonth || 0} icon="⏰" gradient="bg-gradient-to-br from-[#1c3d66] to-[#4eb8cc]" />
              <StatCard title="Pending Leaves" value={stats.pendingLeaves || 0} icon="📅" gradient="bg-gradient-to-br from-[#16324f] to-[#7fd4e4]" />
              <StatCard title="My Tasks" value={stats.myTasks || 0} icon="✅" gradient="bg-gradient-to-br from-[#1c3d66] to-[#2a6f8a]" />
              <StatCard title="Completed" value={stats.completedTasks || 0} icon="🎉" gradient="bg-gradient-to-br from-[#0e1c2c] to-[#4eb8cc]" />
            </>
          )}
        </div>

        {/* Upcoming Celebrations */}
        {(anniversaries.birthdays.length > 0 || anniversaries.workAnniversaries.length > 0 || anniversaries.companyAnniversary) && (
          <div className="bg-[#0c1218] rounded-2xl p-6 lg:p-8 border border-[#16324f]/30 shadow-xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-[#f4f7f8] mb-1">Upcoming Celebrations</h2>
                <p className="text-[#9aa3ab] text-sm">Birthdays, anniversaries & milestones in the next 3 days</p>
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
        <div className="bg-[#0c1218] rounded-2xl p-6 lg:p-8 border border-[#16324f]/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-[#f4f7f8]">Quick Actions</h2>
            <div className="h-1 flex-1 mx-4 bg-[#16324f]/30 rounded-full"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {user.role === 'employee' || user.role === 'intern' ? (
              <>
                {[
                  ['/attendance', 'Clock In/Out', 'from-[#1c3d66] to-[#2a6f8a]'],
                  ['/leave', 'Apply Leave', 'from-[#16324f] to-[#4eb8cc]'],
                  ['/tasks', 'My Tasks', 'from-[#1c3d66] to-[#7fd4e4]'],
                  ['/submissions', 'Submit Work', 'from-[#0e1c2c] to-[#4eb8cc]'],
                  ['/requests', 'Ask Admin', 'from-[#16324f] to-[#7fd4e4]'],
                  ['/discussions', 'My Groups', 'from-[#1c3d66] to-[#4eb8cc]'],
                  ['/holidays', 'Holidays', 'from-[#102030] to-[#2a6f8a]'],
                  ['/profile', 'Profile', 'from-[#1c3d66] to-[#7fd4e4]'],
                ].map(([href, label, gradient]) => (
                  <a key={href} href={href} className={`group p-5 bg-gradient-to-br ${gradient} rounded-2xl text-center shadow-lg hover:scale-[1.03] active:scale-95 border border-white/10`}>
                    <div className="text-white font-semibold text-sm">{label}</div>
                  </a>
                ))}
              </>
            ) : (
              <>
                <a href="/employees" className="group p-6 bg-gradient-to-br from-[#2a6f8a] to-[#1c3d66] rounded-xl text-center hover:from-[#2a6f8a]/90 hover:to-[#1c3d66]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#4eb8cc]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">👥</div>
                  <div className="text-[#f4f7f8] font-semibold text-sm">Employees</div>
                </a>
                <a href="/projects" className="group p-6 bg-gradient-to-br from-[#2a6f8a] to-[#1c3d66] rounded-xl text-center hover:from-[#2a6f8a]/90 hover:to-[#1c3d66]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#4eb8cc]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📁</div>
                  <div className="text-[#f4f7f8] font-semibold text-sm">Projects</div>
                </a>
                <a href="/reports" className="group p-6 bg-gradient-to-br from-[#2a6f8a] to-[#1c3d66] rounded-xl text-center hover:from-[#2a6f8a]/90 hover:to-[#1c3d66]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#4eb8cc]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">📈</div>
                  <div className="text-[#f4f7f8] font-semibold text-sm">Reports</div>
                </a>
                <a href="/settings" className="group p-6 bg-gradient-to-br from-[#2a6f8a] to-[#1c3d66] rounded-xl text-center hover:from-[#2a6f8a]/90 hover:to-[#1c3d66]/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 border border-[#4eb8cc]/30">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform">⚙️</div>
                  <div className="text-[#f4f7f8] font-semibold text-sm">Settings</div>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
