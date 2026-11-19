'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { Pager, usePageSlice } from '../../components/TableKit';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const fieldClass =
  'mt-2 w-full rounded-xl border border-[#7fd4e4]/25 bg-[#070b10] px-3.5 py-2.5 text-sm text-[#f4f7f8] outline-none transition placeholder:text-[#8d949b] focus:border-[#7fd4e4] focus:ring-2 focus:ring-[#7fd4e4]/20';

const fmt = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const dayBits = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '—', month: '' };
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('en-IN', { month: 'short' }).toUpperCase(),
  };
};

export default function HolidaysPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [kind, setKind] = useState('all');
  const [when, setWhen] = useState('all');
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

  const archive = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = new Date();
    return holidays.filter((holiday) => {
      const hit = !q || `${holiday.title} ${holiday.description || ''}`.toLowerCase().includes(q);
      const kindOk = kind === 'all' || (kind === 'optional' ? holiday.isOptional : !holiday.isOptional);
      const past = new Date(holiday.endDate) < now;
      const whenOk = when === 'all' || (when === 'past' ? past : !past);
      return hit && kindOk && whenOk;
    });
  }, [holidays, search, kind, when]);

  const holidayPager = usePageSlice(archive, 6, `${search}|${kind}|${when}|${archive.length}`);
  const optionalCount = holidays.filter((holiday) => holiday.isOptional).length;
  const nextHoliday = upcomingHolidays[0];

  if (loading || !user) {
    return <LogoLoader />;
  }

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <section className="relative overflow-hidden rounded-3xl border border-[#7fd4e4]/25 bg-[#05080c] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
          <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#4eb8cc]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-10 h-48 w-48 rounded-full bg-[#16324f]/80 blur-3xl" />
          <div className="relative flex flex-col gap-6 p-5 sm:p-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <img src="/codeat-logo.png" alt="Codeat Infotech" className="h-14 w-auto sm:h-[72px]" />
              <div className="hidden h-14 w-px bg-gradient-to-b from-transparent via-[#7fd4e4]/50 to-transparent sm:block" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#7fd4e4]">Company calendar</p>
                <h1 className="mt-1 bg-gradient-to-r from-[#d7dee6] via-[#f7f8f8] to-[#8ea0b3] bg-clip-text text-3xl font-bold text-transparent sm:text-4xl">
                  Holiday Planner
                </h1>
                <p className="mt-1 max-w-xl text-sm text-[#9aa3ab]">
                  Official breaks and optional days for the Codeat team.
                </p>
              </div>
            </div>
            {isManager && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-xl bg-gradient-to-r from-[#1c3d66] via-[#2a6f8a] to-[#7fd4e4] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#4eb8cc]/25 transition hover:brightness-110 sm:w-auto"
              >
                + Add Holiday
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: 'Recorded', value: holidays.length, hint: 'All company holidays' },
            { label: 'Optional', value: optionalCount, hint: 'Employees may choose' },
            { label: 'Next up', value: nextHoliday ? dayBits(nextHoliday.startDate).day : '—', hint: nextHoliday ? nextHoliday.title : 'Nothing scheduled' },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-[#7fd4e4]/15 bg-gradient-to-br from-[#0c1218] to-[#101820] p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#7fd4e4]">{stat.label}</p>
              <p className="mt-2 text-3xl font-bold text-[#f4f7f8]">{stat.value}</p>
              <p className="mt-1 truncate text-sm text-[#8d949b]">{stat.hint}</p>
            </div>
          ))}
        </section>

        <section className="rounded-3xl border border-[#7fd4e4]/15 bg-[#070b10] p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-semibold text-[#f4f7f8]">Upcoming</h2>
            <span className="rounded-full border border-[#7fd4e4]/30 bg-[#7fd4e4]/10 px-3 py-1 text-xs font-semibold text-[#7fd4e4]">
              {upcomingHolidays.length}
            </span>
          </div>
          {upcomingHolidays.length === 0 ? (
            <div className="mt-8 rounded-2xl border border-dashed border-[#7fd4e4]/25 px-4 py-10 text-center">
              <p className="text-[#f4f7f8]">No upcoming holidays recorded</p>
              <p className="mt-1 text-sm text-[#8d949b]">New dates will appear here once they are added.</p>
            </div>
          ) : (
            <div className="mt-5 grid grid-cols-1 gap-3 lg:grid-cols-2">
              {upcomingHolidays.map((holiday) => {
                const bits = dayBits(holiday.startDate);
                return (
                  <article key={holiday.id} className="flex gap-4 rounded-2xl border border-white/5 bg-[#0c1218] p-4">
                    <div className="flex h-16 w-16 flex-shrink-0 flex-col items-center justify-center rounded-2xl border border-[#7fd4e4]/30 bg-gradient-to-b from-[#16324f] to-[#0b1016]">
                      <span className="text-lg font-bold leading-none text-[#f4f7f8]">{bits.day}</span>
                      <span className="mt-1 text-[10px] font-semibold tracking-[0.18em] text-[#7fd4e4]">{bits.month}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-semibold text-[#f4f7f8]">{holiday.title}</h3>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${holiday.isOptional ? 'bg-[#c5c9ce]/15 text-[#d7dee6]' : 'bg-[#7fd4e4]/15 text-[#7fd4e4]'}`}>
                          {holiday.isOptional ? 'Optional' : 'Official'}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-[#8d949b]">{holiday.description || 'Company holiday'}</p>
                      <p className="mt-2 text-xs text-[#c5c9ce]">
                        {fmt(holiday.startDate)} – {fmt(holiday.endDate)} · {holiday.totalDays} {Number(holiday.totalDays) === 1 ? 'day' : 'days'}
                      </p>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#7fd4e4]/15 bg-[#070b10]">
          <div className="flex flex-col gap-4 border-b border-[#7fd4e4]/10 p-5 sm:flex-row sm:items-end sm:justify-between sm:p-6">
            <div>
              <h2 className="text-xl font-semibold text-[#f4f7f8]">Archive</h2>
              <p className="text-sm text-[#8d949b]">{holidayPager.total} matching records</p>
            </div>
            <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-3">
              <input value={search} onChange={(e) => setSearch(e.target.value)} className={fieldClass + ' mt-0 sm:w-52'} placeholder="Search holiday" />
              <select value={kind} onChange={(e) => setKind(e.target.value)} className={fieldClass + ' mt-0'}>
                <option value="all">All types</option>
                <option value="official">Official</option>
                <option value="optional">Optional</option>
              </select>
              <select value={when} onChange={(e) => setWhen(e.target.value)} className={fieldClass + ' mt-0'}>
                <option value="all">Upcoming and past</option>
                <option value="upcoming">Upcoming</option>
                <option value="past">Past</option>
              </select>
            </div>
          </div>

          {archive.length === 0 ? (
            <div className="px-6 py-14 text-center text-[#8d949b]">No holidays match these filters.</div>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.18em] text-[#7fd4e4]">
                      <th className="px-6 py-3 font-semibold">Holiday</th>
                      <th className="px-4 py-3 font-semibold">Dates</th>
                      <th className="px-4 py-3 font-semibold">Days</th>
                      <th className="px-4 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold">Added by</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holidayPager.rows.map((holiday) => (
                      <tr key={`archive-${holiday.id}`} className="border-t border-white/5">
                        <td className="px-6 py-4">
                          <p className="font-semibold text-[#f4f7f8]">{holiday.title}</p>
                          <p className="mt-0.5 max-w-xs truncate text-xs text-[#8d949b]">{holiday.description || 'No details'}</p>
                        </td>
                        <td className="px-4 py-4 text-[#d7dee6]">{fmt(holiday.startDate)} – {fmt(holiday.endDate)}</td>
                        <td className="px-4 py-4 font-semibold text-[#f4f7f8]">{holiday.totalDays}</td>
                        <td className="px-4 py-4">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${holiday.isOptional ? 'bg-[#c5c9ce]/15 text-[#d7dee6]' : 'bg-[#7fd4e4]/15 text-[#7fd4e4]'}`}>
                            {holiday.isOptional ? 'Optional' : 'Official'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[#9aa3ab]">{holiday.createdByEmail || 'System'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="space-y-3 p-4 md:hidden">
                {holidayPager.rows.map((holiday) => (
                  <article key={`m-${holiday.id}`} className="rounded-2xl border border-white/5 bg-[#0c1218] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-semibold text-[#f4f7f8]">{holiday.title}</h3>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${holiday.isOptional ? 'bg-[#c5c9ce]/15 text-[#d7dee6]' : 'bg-[#7fd4e4]/15 text-[#7fd4e4]'}`}>
                        {holiday.isOptional ? 'Optional' : 'Official'}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-[#8d949b]">{holiday.description || 'No details'}</p>
                    <p className="mt-2 text-xs text-[#d7dee6]">{fmt(holiday.startDate)} – {fmt(holiday.endDate)} · {holiday.totalDays} days</p>
                  </article>
                ))}
              </div>
              <Pager {...holidayPager} />
            </>
          )}
        </section>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-[#7fd4e4]/25 bg-[#070b10] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#7fd4e4]/15 px-6 py-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fd4e4]">New entry</p>
                <h3 className="text-xl font-semibold text-[#f4f7f8]">Add company holiday</h3>
              </div>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[#7fd4e4]/20 px-3 py-1.5 text-sm text-[#c5c9ce] hover:text-white"
              >
                Close
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 px-6 py-6">
              <div>
                <label className="text-sm font-semibold text-[#d7dee6]">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className={fieldClass}
                  placeholder="Diwali break"
                  required
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-semibold text-[#d7dee6]">Start date</label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={fieldClass}
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-[#d7dee6]">End date</label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={fieldClass}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold text-[#d7dee6]">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className={fieldClass}
                  rows={4}
                  placeholder="What the team should know"
                />
              </div>
              <label className="flex items-start gap-3 rounded-2xl border border-[#7fd4e4]/20 bg-[#0c1218] px-4 py-3">
                <input
                  type="checkbox"
                  checked={formData.isOptional}
                  onChange={(e) => setFormData({ ...formData, isOptional: e.target.checked })}
                  className="mt-1 h-4 w-4 accent-[#7fd4e4]"
                />
                <span className="text-sm text-[#d7dee6]">Optional holiday. People can choose whether to take it.</span>
              </label>
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-xl border border-[#7fd4e4]/20 px-5 py-2.5 text-sm font-semibold text-[#c5c9ce]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {submitting ? 'Saving...' : 'Save holiday'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
}
