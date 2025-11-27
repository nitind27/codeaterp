'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function HolidaysPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startDate: '',
    endDate: '',
    description: '',
    isOptional: false
  });

  const isManager = user && (user.role === 'admin' || user.role === 'hr');

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadHolidays();
  }, []);

  const loadHolidays = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/holidays', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setHolidays(data.holidays || []);
      } else {
        toast.error(data.error || 'Failed to load holidays');
      }
    } catch (error) {
      console.error('Load holidays error', error);
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in required fields');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    try {
      setSubmitting(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Holiday added');
        setShowForm(false);
        setFormData({
          title: '',
          startDate: '',
          endDate: '',
          description: '',
          isOptional: false
        });
        await loadHolidays();
      } else {
        toast.error(data.error || 'Failed to add holiday');
      }
    } catch (error) {
      toast.error('Failed to add holiday');
    } finally {
      setSubmitting(false);
    }
  };

  const upcomingHolidays = useMemo(() => {
    const now = new Date();
    return holidays.filter((holiday) => new Date(holiday.endDate) >= now);
  }, [holidays]);

  const pastHolidays = useMemo(() => {
    const now = new Date();
    return holidays.filter((holiday) => new Date(holiday.endDate) < now);
  }, [holidays]);

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading holidays...</div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.4em] text-codeat-gray/70">Culture</p>
            <h1 className="text-3xl font-bold text-codeat-silver">Holiday Planner</h1>
            <p className="text-codeat-gray mt-1">Plan your time off around official company holidays.</p>
          </div>
          {isManager && (
            <button
              onClick={() => setShowForm(true)}
              className="w-full sm:w-auto rounded-2xl border border-codeat-accent/40 bg-gradient-to-r from-codeat-accent to-codeat-teal px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-codeat-teal/30 hover:scale-[1.02] active:scale-95"
            >
              + Add Holiday
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-3xl border border-white/5 bg-codeat-mid/60 p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold text-codeat-silver">Upcoming Holidays</h2>
              <span className="rounded-full border border-codeat-accent/30 px-3 py-1 text-xs uppercase tracking-[0.3em] text-codeat-accent">
                {upcomingHolidays.length} events
              </span>
            </div>
            {upcomingHolidays.length === 0 ? (
              <div className="mt-10 text-center text-codeat-gray">
                <p>No upcoming holidays recorded</p>
                <p className="text-xs mt-1">Stay tuned for announcements</p>
              </div>
            ) : (
              <div className="mt-6 space-y-4">
                {upcomingHolidays.map((holiday) => (
                  <div
                    key={holiday.id}
                    className="rounded-2xl border border-white/5 bg-white/5 p-4 shadow-inner shadow-black/20"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-codeat-gray text-xs uppercase tracking-[0.3em]">Holiday</p>
                        <h3 className="text-xl font-semibold text-codeat-silver">{holiday.title}</h3>
                        <p className="text-codeat-gray text-sm">{holiday.description || 'No description'}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-codeat-accent font-semibold text-lg">
                          {holiday.totalDays} {holiday.totalDays === 1 ? 'Day' : 'Days'}
                        </p>
                        <p className="text-codeat-gray text-sm">
                          {new Date(holiday.startDate).toLocaleDateString()} -{' '}
                          {new Date(holiday.endDate).toLocaleDateString()}
                        </p>
                        {holiday.isOptional && (
                          <span className="text-xs text-yellow-400 font-semibold">Optional</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/5 bg-slate-950/60 p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-codeat-silver">Holiday Highlights</h3>
            <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray mt-1">Company wide</p>
            <div className="mt-4 space-y-4">
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-codeat-gray text-sm">Total Holidays Recorded</p>
                <p className="text-3xl font-bold text-codeat-silver">{holidays.length}</p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-codeat-gray text-sm">Optional Breaks</p>
                <p className="text-3xl font-bold text-codeat-accent">
                  {holidays.filter((h) => h.isOptional).length}
                </p>
              </div>
              <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                <p className="text-codeat-gray text-sm">Next Holiday</p>
                {upcomingHolidays[0] ? (
                  <>
                    <p className="text-lg font-semibold text-codeat-silver">{upcomingHolidays[0].title}</p>
                    <p className="text-xs text-codeat-gray">
                      {new Date(upcomingHolidays[0].startDate).toLocaleDateString()}
                    </p>
                  </>
                ) : (
                  <p className="text-lg text-codeat-gray">TBD</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/5 bg-codeat-mid/70 p-6 shadow-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-codeat-silver">Holiday Archive</h2>
            <span className="text-xs text-codeat-gray uppercase tracking-[0.35em]">All Records</span>
          </div>
          {holidays.length === 0 ? (
            <div className="mt-12 text-center text-codeat-gray">
              No holidays have been recorded yet.
            </div>
          ) : (
            <div className="mt-8 space-y-6">
              {[...upcomingHolidays, ...pastHolidays].map((holiday) => (
                <div
                  key={`archive-${holiday.id}`}
                  className="grid gap-4 rounded-2xl border border-white/5 bg-white/5 p-4 sm:grid-cols-5"
                >
                  <div className="sm:col-span-2">
                    <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray">Holiday</p>
                    <p className="text-lg font-semibold text-codeat-silver">{holiday.title}</p>
                    <p className="text-sm text-codeat-gray">{holiday.description || 'No details provided'}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray">Duration</p>
                    <p className="text-codeat-accent font-semibold">{holiday.totalDays} days</p>
                    {holiday.isOptional && (
                      <span className="text-xs text-yellow-400 font-semibold">Optional</span>
                    )}
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray">Dates</p>
                    <p className="text-sm text-codeat-silver">
                      {new Date(holiday.startDate).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-codeat-silver">
                      {new Date(holiday.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray">Created By</p>
                    <p className="text-sm text-codeat-silver">
                      {holiday.createdByEmail || 'System'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl rounded-3xl border border-white/10 bg-slate-950/90 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-codeat-gray">New Entry</p>
                <h3 className="text-xl font-semibold text-codeat-silver">Add Company Holiday</h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-2xl border border-white/10 p-2 text-codeat-gray hover:text-codeat-silver"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
              <div>
                <label className="text-sm font-semibold text-codeat-silver">Title *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input-field mt-2"
                  placeholder="e.g. Diwali Break"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-codeat-silver">Start Date *</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="input-field mt-2"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-codeat-silver">End Date *</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="input-field mt-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-codeat-silver">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field mt-2"
                  rows={4}
                  placeholder="Share context, rituals, suggestions..."
                />
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <input
                  id="optional-holiday"
                  type="checkbox"
                  checked={formData.isOptional}
                  onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
                <label htmlFor="optional-holiday" className="text-sm text-codeat-silver">
                  Optional holiday (employees can choose if they want to avail it)
                </label>
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
                  {submitting ? 'Saving...' : 'Save Holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}


