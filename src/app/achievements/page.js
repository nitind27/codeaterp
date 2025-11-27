'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function AchievementsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [formData, setFormData] = useState({
    employeeId: '',
    title: '',
    description: '',
    awardedOn: '',
    badgeColor: '#22d3ee',
    points: 10
  });

  const isManager = user && (user.role === 'admin' || user.role === 'hr');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    loadAchievements();

    if (parsedUser.role === 'admin' || parsedUser.role === 'hr') {
      loadEmployees();
    } else {
      setLoading(false);
    }
  }, []);

  const loadAchievements = async (employeeFilter = '') => {
    try {
      const token = localStorage.getItem('token');
      const query = employeeFilter ? `?employee_id=${employeeFilter}` : '';
      const response = await fetch(`/api/achievements${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setAchievements(data.achievements || []);
      } else {
        toast.error(data.error || 'Failed to load achievements');
      }
    } catch (error) {
      console.error('Load achievements error', error);
      toast.error('Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      }
    } catch (error) {
      console.error('Load employees error', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title || !formData.awardedOn) {
      toast.error('Please fill in title and date');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/achievements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Achievement added');
        setShowForm(false);
        setFormData({
          employeeId: '',
          title: '',
          description: '',
          awardedOn: '',
          badgeColor: '#22d3ee',
          points: 10
        });
        await loadAchievements(filterEmployeeId);
      } else {
        toast.error(data.error || 'Failed to add achievement');
      }
    } catch (error) {
      toast.error('Failed to add achievement');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredAchievements = useMemo(() => {
    if (!filterEmployeeId) return achievements;
    return achievements.filter((item) => String(item.employeeId) === String(filterEmployeeId));
  }, [achievements, filterEmployeeId]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading achievements...</div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-codeat-gray/70">People</p>
            <h1 className="text-3xl font-bold text-codeat-silver">Achievements & Kudos</h1>
            <p className="text-codeat-gray mt-1">Celebrate contributions and highlight wins across the org.</p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto rounded-2xl border border-codeat-accent/40 bg-gradient-to-r from-codeat-accent to-codeat-teal px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-codeat-teal/30 hover:scale-[1.02] active:scale-95"
            >
              + Add Achievement
            </button>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-12">
          <div className="lg:col-span-3 rounded-3xl border border-white/5 bg-slate-950/70 p-5 shadow-xl">
            <h3 className="text-lg font-semibold text-codeat-silver">Filters</h3>
            <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray mt-1">Focus</p>
            <select
              value={filterEmployeeId}
              onChange={(e) => {
                setFilterEmployeeId(e.target.value);
                loadAchievements(e.target.value);
              }}
              className="input-field mt-4"
            >
              <option value="">All employees</option>
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.fullName} ({employee.employeeId})
                </option>
              ))}
            </select>
            <div className="mt-6 space-y-3 text-sm text-codeat-gray">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                <p>Total achievements</p>
                <p className="text-2xl font-semibold text-codeat-silver">{achievements.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-3">
                <p>Team members recognized</p>
                <p className="text-2xl font-semibold text-codeat-accent">
                  {new Set(achievements.map((item) => item.employeeId).filter(Boolean)).size}
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-9 rounded-3xl border border-white/5 bg-codeat-mid/70 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-codeat-silver">Recognition Feed</h2>
              <span className="text-xs uppercase tracking-[0.35em] text-codeat-gray">
                {filteredAchievements.length} stories
              </span>
            </div>
            {filteredAchievements.length === 0 ? (
              <div className="mt-12 text-center text-codeat-gray">
                No achievements recorded yet.
              </div>
            ) : (
              <div className="mt-8 space-y-5">
                {filteredAchievements.map((achievement) => (
                  <div
                    key={achievement.id}
                    className="rounded-2xl border border-white/5 bg-white/5 p-5 shadow-inner shadow-black/20"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className="h-12 w-12 rounded-2xl border border-white/20"
                          style={{ backgroundColor: achievement.badgeColor || '#22d3ee' }}
                        />
                        <div>
                          <p className="text-sm uppercase tracking-[0.35em] text-codeat-gray">Awarded to</p>
                          <p className="text-lg font-semibold text-codeat-silver">
                            {achievement.employeeName || 'Team'}
                          </p>
                          <p className="text-xs text-codeat-gray">
                            {new Date(achievement.awardedOn).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-codeat-accent text-3xl font-bold">{achievement.points || 0}</p>
                        <p className="text-xs text-codeat-gray uppercase tracking-[0.35em]">Points</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-xl font-semibold text-codeat-silver">{achievement.title}</h3>
                      <p className="text-sm text-codeat-gray">{achievement.description || 'No description provided.'}</p>
                    </div>
                    <div className="mt-4 flex items-center justify-between text-xs text-codeat-gray">
                      <span>Posted by {achievement.createdByEmail || 'System'}</span>
                      {achievement.employeeId ? (
                        <span>ID #{achievement.employeeId}</span>
                      ) : (
                        <span>Company-wide recognition</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray">NEW RECOGNITION</p>
                <h3 className="text-xl font-semibold text-codeat-silver">Add Achievement</h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-2xl border border-white/10 p-2 text-codeat-gray hover:text-codeat-silver"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-codeat-silver">Employee</label>
                  <select
                    value={formData.employeeId}
                    onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                    className="input-field mt-2"
                  >
                    <option value="">Company wide</option>
                    {employees.map((employee) => (
                      <option key={employee.id} value={employee.id}>
                        {employee.fullName} ({employee.employeeId})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-semibold text-codeat-silver">Awarded On *</label>
                  <input
                    type="date"
                    value={formData.awardedOn}
                    onChange={(e) => setFormData({ ...formData, awardedOn: e.target.value })}
                    className="input-field mt-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-codeat-silver">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field mt-2"
                  placeholder="e.g. Culture Champion"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-codeat-silver">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field mt-2"
                  rows={4}
                  placeholder="Tell everyone why they deserve it..."
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-codeat-silver">Badge Color</label>
                  <input
                    type="color"
                    value={formData.badgeColor}
                    onChange={(e) => setFormData({ ...formData, badgeColor: e.target.value })}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-transparent p-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-codeat-silver">Points</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: Number(e.target.value) })}
                    className="input-field mt-2"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-2xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-codeat-gray hover:text-codeat-silver"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-2xl bg-gradient-to-r from-codeat-accent to-codeat-teal px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-lg shadow-codeat-teal/30 hover:scale-[1.01]"
                >
                  {submitting ? 'Saving...' : 'Publish Achievement'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}


