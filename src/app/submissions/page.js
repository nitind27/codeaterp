'use client';

import { useEffect, useMemo, useState } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { Pager, usePageSlice } from '../../components/TableKit';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const STATUS = ['submitted', 'reviewed', 'accepted', 'revision'];

const badge = {
  submitted: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  reviewed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  accepted: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  revision: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
};

export default function SubmissionsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [rows, setRows] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [form, setForm] = useState({ title: '', link: '', notes: '', taskId: '' });

  const isReviewer = ['admin', 'hr', 'project_manager'].includes(user?.role);

  const load = async () => {
    const token = localStorage.getItem('token');
    const [subRes, taskRes] = await Promise.all([
      fetch('/api/submissions', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/tasks', { headers: { Authorization: `Bearer ${token}` } }),
    ]);
    const [subData, taskData] = await Promise.all([subRes.json(), taskRes.json()]);
    if (subData.success) setRows(subData.submissions || []);
    if (taskData.success) setTasks(taskData.tasks || []);
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const raw = localStorage.getItem('user');
    if (!token || !raw) { router.push('/login'); return; }
    setUser(JSON.parse(raw));
    load().catch(() => toast.error('Could not load submissions')).finally(() => setLoading(false));
  }, [router]);

  const filtered = useMemo(() => rows.filter((row) => {
    const q = search.trim().toLowerCase();
    const hit = !q || `${row.title} ${row.employeeName} ${row.employeeCode} ${row.link || ''} ${row.taskTitle || ''}`.toLowerCase().includes(q);
    return hit && (!status || row.status === status);
  }), [rows, search, status]);

  const pager = usePageSlice(filtered, 8, `${search}|${status}|${filtered.length}`);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Submit failed'); return; }
      toast.success(data.message);
      setForm({ title: '', link: '', notes: '', taskId: '' });
      await load();
    } catch {
      toast.error('Submit failed');
    } finally {
      setSaving(false);
    }
  };

  const review = async (row, next) => {
    const adminNote = window.prompt('Note for the employee (optional)', row.adminNote || '') ?? row.adminNote;
    const token = localStorage.getItem('token');
    const res = await fetch(`/api/submissions/${row.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: next, adminNote }),
    });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || 'Update failed'); return; }
    toast.success('Updated');
    await load();
  };

  if (loading || !user) return <LogoLoader />;

  return (
    <Layout user={user}>
      <div className="space-y-6">
        <div className="rounded-3xl border border-[#7fd4e4]/20 bg-gradient-to-br from-[#0c1218] via-[#101820] to-[#0e1c2c] p-6 sm:p-8">
          <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fd4e4]/80">Work desk</p>
          <h1 className="mt-2 text-3xl font-bold text-white">{isReviewer ? 'Submitted work' : 'Submit your work'}</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Share a link, file URL, or notes. Admin and project managers see every submission here.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-[#7fd4e4]/15 bg-[#0c1218] p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Homepage redesign — final link" />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Related task</label>
            <select value={form.taskId} onChange={(e) => setForm({ ...form, taskId: e.target.value })} className="input-field">
              <option value="">No specific task</option>
              {tasks.map((task) => <option key={task.id} value={task.id}>{task.title}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Link</label>
            <input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} className="input-field" placeholder="https://..." />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="input-field" rows={3} placeholder="What you finished, and anything admin should check" />
          </div>
          <div className="sm:col-span-2">
            <button disabled={saving} className="w-full sm:w-auto rounded-xl bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-6 py-3 font-semibold text-white disabled:opacity-60">
              {saving ? 'Sending…' : 'Submit to admin'}
            </button>
          </div>
        </form>

        <div className="overflow-hidden rounded-2xl border border-[#7fd4e4]/15 bg-[#0c1218]">
          <div className="grid gap-3 border-b border-white/10 p-4 sm:grid-cols-3">
            <input value={search} onChange={(e) => setSearch(e.target.value)} className="input-field sm:col-span-2" placeholder="Search name, task, link…" />
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field">
              <option value="">All status</option>
              {STATUS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400">
                  {isReviewer && <th className="px-4 py-3">Employee</th>}
                  <th className="px-4 py-3">Work</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">When</th>
                  {isReviewer && <th className="px-4 py-3">Review</th>}
                </tr>
              </thead>
              <tbody>
                {pager.rows.length === 0 ? (
                  <tr><td colSpan={isReviewer ? 5 : 3} className="px-4 py-10 text-center text-slate-400">No submissions match these filters.</td></tr>
                ) : pager.rows.map((row) => (
                  <tr key={row.id} className="border-t border-white/5">
                    {isReviewer && (
                      <td className="px-4 py-3">
                        <p className="font-semibold text-white">{row.employeeName}</p>
                        <p className="text-xs text-slate-400">{row.employeeCode}</p>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{row.title}</p>
                      {row.taskTitle && <p className="text-xs text-[#7fd4e4]">Task: {row.taskTitle}</p>}
                      {row.link && <a href={row.link} target="_blank" rel="noreferrer" className="text-xs text-cyan-300 underline break-all">{row.link}</a>}
                      {row.notes && <p className="mt-1 text-xs text-slate-400">{row.notes}</p>}
                      {row.adminNote && <p className="mt-1 text-xs text-amber-200">Admin: {row.adminNote}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full border px-2.5 py-1 text-xs capitalize ${badge[row.status]}`}>{row.status}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-300">{new Date(row.createdAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</td>
                    {isReviewer && (
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {['accepted', 'revision', 'reviewed'].map((next) => (
                            <button key={next} onClick={() => review(row, next)} className="rounded-lg bg-white/5 px-2 py-1 text-[11px] capitalize text-white hover:bg-white/10">{next}</button>
                          ))}
                        </div>
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
