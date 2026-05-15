'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

/* ─── helpers ─────────────────────────────────────────────────────────────── */
const parseTimeToDate = (t) => {
  if (!t) return null;
  const [h = 0, m = 0, s = 0] = t.split(':').map(Number);
  if ([h, m, s].some(isNaN)) return null;
  const d = new Date(); d.setHours(h, m, s, 0); return d;
};

const toAmPm = (t) => {
  if (!t) return '—';
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
};

const diffMs = (a, b) => {
  const s = parseTimeToDate(a), e = parseTimeToDate(b);
  if (!s || !e) return null;
  return e - s;
};

const fmtMs = (ms) => {
  if (ms == null || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, '0');
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const sec = String(s % 60).padStart(2, '0');
  return `${h}:${m}:${sec}`;
};

const fmtDuration = (ms) => {
  if (ms == null || ms < 0) return '—';
  const totalMin = Math.round(ms / 60000);
  if (totalMin < 60) return `${totalMin}m`;
  const h = Math.floor(totalMin / 60), m = totalMin % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
};

const statusStyle = (s) => ({
  present: 'bg-green-500/15 text-green-400 border-green-500/30',
  absent:  'bg-red-500/15 text-red-400 border-red-500/30',
  late:    'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  half_day:'bg-blue-500/15 text-blue-400 border-blue-500/30',
}[s] || 'bg-codeat-muted/20 text-codeat-gray border-codeat-muted/30');

const dotStyle = (s) => ({
  present: 'bg-green-400', absent: 'bg-red-400', late: 'bg-yellow-400', half_day: 'bg-blue-400',
}[s] || 'bg-codeat-gray');

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser]   = useState(null);
  const [loading, setLoading] = useState(true);

  // own attendance
  const [todayAtt, setTodayAtt]   = useState(null);
  const [monthAtt, setMonthAtt]   = useState([]);
  const [clocking, setClocking]   = useState(false);
  const [elapsed, setElapsed]     = useState(null);

  // live clock
  const [now, setNow] = useState(new Date());

  // admin state
  const [adminToday, setAdminToday]   = useState([]);
  const [adminMonth, setAdminMonth]   = useState([]);
  const [employees, setEmployees]     = useState([]);
  const [filterEmp, setFilterEmp]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterStart, setFilterStart] = useState('');
  const [filterEnd, setFilterEnd]     = useState('');
  const [adminLoading, setAdminLoading] = useState(false);

  // edit modal
  const [editRec, setEditRec]   = useState(null);
  const [editForm, setEditForm] = useState({ clockIn: '', clockOut: '', status: 'present', notes: '' });
  const [saving, setSaving]     = useState(false);

  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  /* live clock tick */
  useEffect(() => {
    const iv = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  /* elapsed timer */
  useEffect(() => {
    if (todayAtt?.clockIn && !todayAtt?.clockOut) {
      const tick = () => {
        const start = parseTimeToDate(todayAtt.clockIn);
        if (!start) return;
        setElapsed(fmtMs(new Date() - start));
      };
      tick();
      const iv = setInterval(tick, 1000);
      return () => clearInterval(iv);
    }
    setElapsed(null);
  }, [todayAtt?.clockIn, todayAtt?.clockOut]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    const u = JSON.parse(userData);
    setUser(u);
    loadOwn();
    if (u.role === 'admin' || u.role === 'hr') loadAdminData();
  }, []);

  /* ── load own attendance ── */
  const loadOwn = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];
      const [r1, r2] = await Promise.all([
        fetch(`/api/attendance?start_date=${today}&end_date=${today}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/attendance?start_date=${first}`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [d1, d2] = await Promise.all([r1.json(), r2.json()]);
      setTodayAtt(d1.attendance?.[0] || null);
      setMonthAtt(d2.attendance || []);
    } catch { toast.error('Error loading attendance'); }
    finally { setLoading(false); }
  };

  /* ── load admin data ── */
  const loadAdminData = useCallback(async (emp = '', status = '', start = '', end = '') => {
    setAdminLoading(true);
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const first = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0];

      const qs = (extra = '') => {
        const p = new URLSearchParams();
        if (emp) p.set('employee_id', emp);
        if (status) p.set('status', status);
        if (extra) { const [k, v] = extra.split('='); p.set(k, v); }
        return p.toString() ? '?' + p.toString() : '';
      };

      const startQ = start || first;
      const endQ   = end   || today;

      const [rToday, rMonth, rEmps] = await Promise.all([
        fetch(`/api/attendance?start_date=${today}&end_date=${today}${emp ? `&employee_id=${emp}` : ''}${status ? `&status=${status}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`/api/attendance?start_date=${startQ}&end_date=${endQ}${emp ? `&employee_id=${emp}` : ''}${status ? `&status=${status}` : ''}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const [dToday, dMonth, dEmps] = await Promise.all([rToday.json(), rMonth.json(), rEmps.json()]);
      setAdminToday(dToday.attendance || []);
      setAdminMonth(dMonth.attendance || []);
      if (dEmps.success) setEmployees(dEmps.employees || []);
    } catch { toast.error('Error loading admin data'); }
    finally { setAdminLoading(false); }
  }, []);

  const applyFilters = () => loadAdminData(filterEmp, filterStatus, filterStart, filterEnd);
  const clearFilters = () => {
    setFilterEmp(''); setFilterStatus(''); setFilterStart(''); setFilterEnd('');
    loadAdminData();
  };

  /* ── get current location ── */
  const getLocation = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return; }
    navigator.geolocation.getCurrentPosition(
      p => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      e => reject(new Error(
        e.code === 1 ? 'Location access denied. Please enable location to mark attendance.' :
        e.code === 2 ? 'Location unavailable. Please try again.' :
        'Location request timed out. Please try again.'
      )),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });

  /* ── clock in/out ── */
  const clockIn = async () => {
    setClocking(true);
    try {
      const token = localStorage.getItem('token');
      let location = null;
      try {
        toast.loading('Getting your location…', { id: 'loc' });
        location = await getLocation();
        toast.dismiss('loc');
      } catch (locErr) {
        toast.dismiss('loc');
        toast.error(locErr.message, { duration: 5000 });
        setClocking(false);
        return;
      }
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location })
      });
      const d = await res.json();
      if (d.success) {
        const msg = d.distanceMeters !== undefined
          ? `Clocked in! (${d.distanceMeters}m from office)`
          : 'Clocked in!';
        toast.success(msg);
        await loadOwn();
      } else {
        toast.error(d.error || 'Failed to clock in', { duration: 6000 });
      }
    } catch { toast.error('Error clocking in'); }
    finally { setClocking(false); }
  };

  const clockOut = async () => {
    setClocking(true);
    try {
      const token = localStorage.getItem('token');
      let location = null;
      try {
        toast.loading('Getting your location…', { id: 'loc' });
        location = await getLocation();
        toast.dismiss('loc');
      } catch (locErr) {
        toast.dismiss('loc');
        toast.error(locErr.message, { duration: 5000 });
        setClocking(false);
        return;
      }
      const res = await fetch('/api/attendance', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ location })
      });
      const d = await res.json();
      if (d.success) {
        const msg = d.distanceMeters !== undefined
          ? `Clocked out! (${d.distanceMeters}m from office)`
          : 'Clocked out!';
        toast.success(msg);
        await loadOwn();
      } else {
        toast.error(d.error || 'Failed to clock out', { duration: 6000 });
      }
    } catch { toast.error('Error clocking out'); }
    finally { setClocking(false); }
  };

  /* ── edit ── */
  const openEdit = (rec) => {
    setEditRec(rec);
    setEditForm({ clockIn: rec.clockIn || '', clockOut: rec.clockOut || '', status: rec.status || 'present', notes: rec.notes || '' });
  };

  const saveEdit = async () => {
    if (!editRec || !editForm.clockIn) { toast.error('Clock in time is required'); return; }
    const ms = editForm.clockOut ? diffMs(editForm.clockIn, editForm.clockOut) : null;
    if (ms !== null && ms < 0) { toast.error('Clock out must be after clock in'); return; }
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        clock_in: editForm.clockIn,
        clock_out: editForm.clockOut || null,
        total_hours: ms !== null ? Number((ms / 3600000).toFixed(2)) : null,
        status: editForm.status,
        notes: editForm.notes || null,
      };
      const res = await fetch(`/api/attendance/${editRec.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      const d = await res.json();
      if (d.success) {
        toast.success('Attendance updated!');
        setEditRec(null);
        await loadOwn();
        if (isAdmin) await loadAdminData(filterEmp, filterStatus, filterStart, filterEnd);
      } else toast.error(d.error || 'Failed to update');
    } catch { toast.error('Error updating attendance'); }
    finally { setSaving(false); }
  };

  if (loading || !user) return <LogoLoader />;

  const canClockIn  = !todayAtt || !todayAtt.clockIn;
  const canClockOut = todayAtt?.clockIn && !todayAtt?.clockOut;

  const currentTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
  const currentDate = now.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Layout user={user}>
      <div className="space-y-6">

        {/* ── HEADER ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-codeat-silver">Attendance</h1>
            <p className="text-codeat-gray text-sm mt-0.5">{isAdmin ? 'Manage all employee attendance' : 'Track your daily attendance'}</p>
          </div>
          {/* live clock */}
          <div className="bg-codeat-mid rounded-xl px-5 py-3 border border-codeat-muted/30 text-right">
            <p className="text-codeat-accent font-mono text-2xl font-bold leading-tight">{currentTime}</p>
            <p className="text-codeat-gray text-xs mt-0.5">{currentDate}</p>
          </div>
        </div>

        {/* ── TODAY'S CLOCK IN/OUT (all roles) ── */}
        <div className="bg-codeat-mid rounded-2xl p-6 border border-codeat-muted/30 shadow-xl">
          <h2 className="text-xl font-bold text-codeat-silver mb-4">Today's Attendance</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            {/* Clock In */}
            <div className="bg-codeat-dark/50 rounded-xl p-4 border border-codeat-muted/30">
              <p className="text-codeat-gray text-[10px] uppercase tracking-widest mb-1">Clock In</p>
              <p className={`text-xl font-bold font-mono ${todayAtt?.clockIn ? 'text-green-400' : 'text-codeat-gray/40'}`}>
                {todayAtt?.clockIn ? toAmPm(todayAtt.clockIn) : '—'}
              </p>
            </div>
            {/* Clock Out */}
            <div className="bg-codeat-dark/50 rounded-xl p-4 border border-codeat-muted/30">
              <p className="text-codeat-gray text-[10px] uppercase tracking-widest mb-1">Clock Out</p>
              <p className={`text-xl font-bold font-mono ${todayAtt?.clockOut ? 'text-red-400' : 'text-codeat-gray/40'}`}>
                {todayAtt?.clockOut ? toAmPm(todayAtt.clockOut) : '—'}
              </p>
            </div>
            {/* Timer / Total */}
            <div className="bg-codeat-dark/50 rounded-xl p-4 border border-codeat-muted/30">
              <p className="text-codeat-gray text-[10px] uppercase tracking-widest mb-1">
                {todayAtt?.clockIn && !todayAtt?.clockOut ? 'Live Timer' : 'Total Time'}
              </p>
              <p className="text-xl font-bold font-mono text-codeat-accent">
                {todayAtt?.clockIn && !todayAtt?.clockOut
                  ? (elapsed || '00:00:00')
                  : todayAtt?.clockIn && todayAtt?.clockOut
                  ? fmtDuration(diffMs(todayAtt.clockIn, todayAtt.clockOut))
                  : '—'}
              </p>
            </div>
            {/* Status */}
            <div className="bg-codeat-dark/50 rounded-xl p-4 border border-codeat-muted/30">
              <p className="text-codeat-gray text-[10px] uppercase tracking-widest mb-1">Status</p>
              {todayAtt ? (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle(todayAtt.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${dotStyle(todayAtt.status)}`}/>
                  {todayAtt.status.replace('_', ' ')}
                </span>
              ) : <span className="text-codeat-gray/40 text-sm">No record</span>}
            </div>
          </div>

          {/* Clock In/Out buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {canClockIn && (
              <button onClick={clockIn} disabled={clocking}
                className="flex-1 py-3.5 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-green-500/20">
                {clocking ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Clocking In...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"/></svg>Clock In</>}
              </button>
            )}
            {canClockOut && (
              <button onClick={clockOut} disabled={clocking}
                className="flex-1 py-3.5 bg-gradient-to-r from-red-500 to-rose-500 text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-red-500/20">
                {clocking ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Clocking Out...</> : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>Clock Out</>}
              </button>
            )}
            {todayAtt?.clockIn && todayAtt?.clockOut && (
              <div className="flex-1 py-3.5 bg-codeat-dark/50 border border-green-500/30 text-green-400 rounded-xl font-semibold flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                Attendance Complete
              </div>
            )}
          </div>
        </div>

        {/* ── ADMIN: TODAY'S ALL EMPLOYEES ── */}
        {isAdmin && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-codeat-muted/20">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-xl font-bold text-codeat-silver">Today — All Employees</h2>
                <span className="text-codeat-gray text-sm">{adminToday.length} record{adminToday.length !== 1 ? 's' : ''}</span>
              </div>
              {/* Filters */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="input-field text-sm py-2">
                  <option value="">All Employees</option>
                  {employees.map(e => <option key={e.id} value={e.id}>{e.fullName} ({e.employeeId})</option>)}
                </select>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input-field text-sm py-2">
                  <option value="">All Status</option>
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
                <input type="date" value={filterStart} onChange={e => setFilterStart(e.target.value)} className="input-field text-sm py-2" placeholder="From date"/>
                <input type="date" value={filterEnd} onChange={e => setFilterEnd(e.target.value)} className="input-field text-sm py-2" placeholder="To date"/>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={applyFilters} disabled={adminLoading}
                  className="px-4 py-2 bg-codeat-teal text-white rounded-lg text-sm font-semibold hover:bg-codeat-teal/80 transition disabled:opacity-50 flex items-center gap-1.5">
                  {adminLoading ? <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : null}
                  Apply Filters
                </button>
                <button onClick={clearFilters} className="px-4 py-2 bg-codeat-muted/40 text-codeat-gray rounded-lg text-sm font-semibold hover:bg-codeat-muted/60 transition border border-codeat-muted/30">
                  Clear
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-codeat-muted/20">
                    <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Employee</th>
                    <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Date</th>
                    <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Clock In</th>
                    <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Clock Out</th>
                    <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Duration</th>
                    <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-codeat-gray font-semibold text-xs uppercase tracking-wider">Edit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-codeat-muted/10">
                  {adminToday.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-codeat-gray">No records for today</td></tr>
                  ) : adminToday.map(att => (
                    <tr key={att.id} className="hover:bg-codeat-dark/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-codeat-teal to-codeat-accent flex items-center justify-center text-white font-bold text-xs flex-shrink-0">
                            {att.employeeName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-codeat-silver font-semibold leading-tight">{att.employeeName}</p>
                            <p className="text-codeat-gray text-[11px]">{att.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-codeat-silver">{new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                      <td className="px-4 py-3 font-mono text-green-400 font-semibold">{att.clockIn ? toAmPm(att.clockIn) : <span className="text-codeat-gray/40">—</span>}</td>
                      <td className="px-4 py-3 font-mono text-red-400 font-semibold">{att.clockOut ? toAmPm(att.clockOut) : <span className="text-codeat-gray/40">—</span>}</td>
                      <td className="px-4 py-3 text-codeat-silver font-semibold">{fmtDuration(diffMs(att.clockIn, att.clockOut))}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle(att.status)}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${dotStyle(att.status)}`}/>
                          {att.status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(att)}
                          className="p-1.5 rounded-lg bg-codeat-teal/10 text-codeat-teal hover:bg-codeat-teal/20 transition" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── MONTH HISTORY (admin = all, others = own) ── */}
        <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 shadow-xl overflow-hidden">
          <div className="p-5 border-b border-codeat-muted/20 flex items-center justify-between">
            <h2 className="text-xl font-bold text-codeat-silver">
              {isAdmin ? 'Monthly Records' : "This Month's Attendance"}
            </h2>
            <span className="text-codeat-gray text-sm">{(isAdmin ? adminMonth : monthAtt).length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-codeat-muted/20">
                  {isAdmin && <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Employee</th>}
                  <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Clock In</th>
                  <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Clock Out</th>
                  <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Duration</th>
                  <th className="px-4 py-3 text-left text-codeat-gray font-semibold text-xs uppercase tracking-wider">Status</th>
                  {isAdmin && <th className="px-4 py-3 text-right text-codeat-gray font-semibold text-xs uppercase tracking-wider">Edit</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-codeat-muted/10">
                {(isAdmin ? adminMonth : monthAtt).length === 0 ? (
                  <tr><td colSpan={isAdmin ? 7 : 5} className="px-4 py-10 text-center text-codeat-gray">No records found</td></tr>
                ) : (isAdmin ? adminMonth : monthAtt).map(att => (
                  <tr key={att.id} className="hover:bg-codeat-dark/30 transition-colors">
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-codeat-teal to-codeat-accent flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0">
                            {att.employeeName?.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-codeat-silver font-semibold text-xs leading-tight">{att.employeeName}</p>
                            <p className="text-codeat-gray text-[10px]">{att.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                    )}
                    <td className="px-4 py-3 text-codeat-silver">{new Date(att.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
                    <td className="px-4 py-3 font-mono text-green-400">{att.clockIn ? toAmPm(att.clockIn) : <span className="text-codeat-gray/40">—</span>}</td>
                    <td className="px-4 py-3 font-mono text-red-400">{att.clockOut ? toAmPm(att.clockOut) : <span className="text-codeat-gray/40">—</span>}</td>
                    <td className="px-4 py-3 text-codeat-silver font-semibold">{fmtDuration(diffMs(att.clockIn, att.clockOut))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusStyle(att.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${dotStyle(att.status)}`}/>
                        {att.status?.replace('_', ' ')}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(att)}
                          className="p-1.5 rounded-lg bg-codeat-teal/10 text-codeat-teal hover:bg-codeat-teal/20 transition" title="Edit">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* ── EDIT MODAL (admin only) ── */}
      {editRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-codeat-mid rounded-2xl border border-codeat-muted/40 shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-codeat-muted/20">
              <div>
                <h3 className="text-lg font-bold text-codeat-silver">Edit Attendance</h3>
                <p className="text-codeat-gray text-sm mt-0.5">
                  {editRec.employeeName} · {new Date(editRec.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              <button onClick={() => setEditRec(null)} disabled={saving}
                className="p-1.5 rounded-lg text-codeat-gray hover:text-codeat-silver hover:bg-codeat-muted/40 transition">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-codeat-silver text-xs font-semibold mb-1.5">Clock In <span className="text-red-400">*</span></label>
                  <input type="time" value={editForm.clockIn}
                    onChange={e => setEditForm(p => ({ ...p, clockIn: e.target.value }))}
                    className="input-field py-2 text-sm"/>
                </div>
                <div>
                  <label className="block text-codeat-silver text-xs font-semibold mb-1.5">Clock Out</label>
                  <input type="time" value={editForm.clockOut}
                    onChange={e => setEditForm(p => ({ ...p, clockOut: e.target.value }))}
                    className="input-field py-2 text-sm"/>
                </div>
              </div>

              {/* calculated duration preview */}
              {editForm.clockIn && editForm.clockOut && (
                <div className={`rounded-xl p-3 border text-center ${diffMs(editForm.clockIn, editForm.clockOut) >= 0 ? 'bg-codeat-teal/10 border-codeat-teal/30' : 'bg-red-500/10 border-red-500/30'}`}>
                  <p className="text-codeat-gray text-[10px] uppercase tracking-wider mb-0.5">Duration</p>
                  <p className={`text-xl font-bold font-mono ${diffMs(editForm.clockIn, editForm.clockOut) >= 0 ? 'text-codeat-accent' : 'text-red-400'}`}>
                    {diffMs(editForm.clockIn, editForm.clockOut) >= 0 ? fmtDuration(diffMs(editForm.clockIn, editForm.clockOut)) : 'Invalid range'}
                  </p>
                </div>
              )}

              <div>
                <label className="block text-codeat-silver text-xs font-semibold mb-1.5">Status</label>
                <select value={editForm.status} onChange={e => setEditForm(p => ({ ...p, status: e.target.value }))} className="input-field py-2 text-sm">
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                </select>
              </div>

              <div>
                <label className="block text-codeat-silver text-xs font-semibold mb-1.5">Notes</label>
                <input type="text" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))}
                  className="input-field py-2 text-sm" placeholder="Optional notes..."/>
              </div>

              <div className="flex gap-3 pt-1">
                <button onClick={saveEdit} disabled={saving}
                  className="flex-1 py-2.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl font-semibold hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {saving ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Saving...</> : 'Save Changes'}
                </button>
                <button onClick={() => setEditRec(null)} disabled={saving}
                  className="flex-1 py-2.5 bg-codeat-muted/40 text-codeat-silver rounded-xl font-semibold hover:bg-codeat-muted/60 transition border border-codeat-muted/30 disabled:opacity-50">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
