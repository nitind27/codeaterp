'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { Pager, usePageSlice } from '../../components/TableKit';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const TYPES = [
  { id: 'certificate', label: 'Certificate / letter' },
  { id: 'equipment', label: 'Equipment' },
  { id: 'id_card', label: 'ID card' },
  { id: 'wfh', label: 'Work from anywhere' },
  { id: 'document', label: 'Document' },
  { id: 'other', label: 'Other' },
];

const badge = {
  pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  rejected: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default function RequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [form, setForm] = useState({ type: 'certificate', subject: '', details: '' });

  const isAdmin = user?.role === 'admin' || user?.role === 'hr';

  const load = async () => {
    const token = localStorage.getItem('token');
    const res = await fetch('/api/requests', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (data.success) setRows(data.requests || []);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (!token || !raw) { router.push('/login'); return; }
    setUser(JSON.parse(raw));
    load().catch(() => toast.error('Could not load requests')).finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const hit = !q || `${row.subject} ${row.employeeName} ${row.employeeCode} ${row.details || ''}`.toLowerCase().includes(q);
    return hit && (!status || row.status === status) && (!type || row.type === type);
  }), [rows, search, status, type]);

  const pager = usePageSlice(filtered, 8, `${search}|${status}|${type}|${filtered.length}`);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Could not send request'); return; }
      toast.success(data.message);
      setForm({ type: 'certificate', subject: '', details: '' });
      await load();
    } catch {
      toast.error('Could not send request');
    } finally {
      setSaving(false);
    }
  };

  const decide = async (row, next) => {
    const adminNote = window.prompt('Note', row.adminNote || '') ?? '';
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/requests/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next, adminNote }),
    });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || 'Update failed'); return; }
    toast.success(next === 'approved' ? 'Request approved' : 'Request updated');
    await load();
  };

  if (loading || !user) return <LogoLoader />;

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-[#7fd4e4]/20 bg-gradient-to-br from-[#0c1218] via-[#101820] to-[#0e1c2c] p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fd4e4]/80">Requests</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{isAdmin ? 'Team requests' : 'Ask admin'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Certificates, equipment, ID cards, or anything else. Every request lands in the admin panel.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[#7fd4e4]/15 bg-[#0c1218] p-5 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Type</label>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
              {TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Subject</label>
            <input required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="input-field" placeholder="Internship certificate" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Details</label>
            <textarea value={form.details} onChange={(e) => setForm({ ...form, details: e.target.value })} className="input-field" rows={3} placeholder="What you need and by when" />
          </div>
          <div>
            <button disabled={saving} className="rounded-xl bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-6 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Sending…' : 'Send request'}
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[#7fd4e4]/15 bg-[#0c1218]">
          <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field" placeholder="Search subject or employee" />
            <select value={type} onChange={(e) => setType(e.target.value)} className="input-field">
              <option value="">All types</option>
              {TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
            </select>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              <option value="">All status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  {isAdmin && <th className="px-4 py-3">Employee</th>}
                  <th className="px-4 py-3">Request</th>
                  <th className="px-4 py-3">Status</th>
                  {isAdmin && <th className="px-4 py-3">Action</th>}
                </tr>
              </thead>
              <tbody>
                {pager.rows.length === 0 ? (
                  <tr><td colSpan={isAdmin ? 4 : 2} className="px-4 py-10 text-center text-slate-400">No requests yet.</td></tr>
                ) : pager.rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5 align-top">
                    {isAdmin && (
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{row.employeeName}</p>
                        <p className="text-xs text-slate-400">{row.employeeCode}</p>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{row.subject}</p>
                      <p className="text-xs capitalize text-violet-300">{row.type.replace('_', ' ')}</p>
                      {row.details && <p className="mt-1 text-xs text-slate-400">{row.details}</p>}
                      {row.adminNote && <p className="mt-1 text-xs text-amber-200">Admin: {row.adminNote}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${badge[row.status]}`}>{row.status}</span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3">
                        {row.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button onClick={() => decide(row, 'approved')} className="rounded-lg bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-300">Approve</button>
                            <button onClick={() => decide(row, 'rejected')} className="rounded-lg bg-rose-500/20 px-3 py-1.5 text-xs font-semibold text-rose-300">Reject</button>
                          </div>
                        ) : <span className="text-xs text-slate-500">Closed</span>}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pager {...pager} />
        </div>
      </div>
    </Layout>
  );
}
