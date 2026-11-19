'use client';

import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';

const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` });

const formatDate = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

const formatSize = (bytes) => {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
};

export default function PersonProfile({ employeeId, viewer }) {
  const fileRef = useRef(null);
  const docRef = useRef(null);
  const [employee, setEmployee] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminPassword, setAdminPassword] = useState('');
  const [ownPassword, setOwnPassword] = useState({ current: '', next: '', confirm: '' });
  const [docTitle, setDocTitle] = useState('');

  const isAdmin = viewer?.role === 'admin';
  const isHr = viewer?.role === 'hr';
  const isSelf = Number(viewer?.employee?.id) === Number(employeeId);

  const load = async () => {
    const [profileRes, docsRes] = await Promise.all([
      fetch(`/api/employees/${employeeId}`, { headers: authHeaders() }),
      fetch(`/api/employees/${employeeId}/documents`, { headers: authHeaders() }),
    ]);
    const profile = await profileRes.json();
    const docs = await docsRes.json();
    if (!profile.success) throw new Error(profile.error || 'Could not open this profile');
    setEmployee(profile.employee);
    setDocuments(docs.documents || []);
  };

  useEffect(() => {
    if (!employeeId) { setLoading(false); return; }
    load().catch((error) => toast.error(error.message)).finally(() => setLoading(false));
  }, [employeeId]);

  const uploadPhoto = async (file) => {
    if (!file) return;
    setBusy('photo');
    try {
      const body = new FormData();
      body.append('photo', file);
      const res = await fetch(`/api/employees/${employeeId}/photo`, { method: 'POST', headers: authHeaders(), body });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Photo upload failed'); return; }
      setEmployee((prev) => ({ ...prev, avatar: `${data.avatar}?t=${Date.now()}` }));
      toast.success('Photo updated');
    } catch {
      toast.error('Photo upload failed');
    } finally {
      setBusy('');
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const saveAdminPassword = async (e) => {
    e.preventDefault();
    setBusy('password');
    try {
      const res = await fetch(`/api/employees/${employeeId}/password`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Could not update password'); return; }
      setEmployee((prev) => ({ ...prev, loginPassword: data.loginPassword }));
      setAdminPassword('');
      toast.success('Password updated');
    } catch {
      toast.error('Could not update password');
    } finally {
      setBusy('');
    }
  };

  const saveOwnPassword = async (e) => {
    e.preventDefault();
    if (ownPassword.next !== ownPassword.confirm) { toast.error('New passwords do not match'); return; }
    setBusy('password');
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: ownPassword.current, newPassword: ownPassword.next }),
      });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Could not change password'); return; }
      setOwnPassword({ current: '', next: '', confirm: '' });
      toast.success('Password changed');
    } catch {
      toast.error('Could not change password');
    } finally {
      setBusy('');
    }
  };

  const uploadDocument = async (e) => {
    e.preventDefault();
    const file = docRef.current?.files?.[0];
    if (!file) { toast.error('Choose a PDF'); return; }
    setBusy('doc');
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('title', docTitle);
      const res = await fetch(`/api/employees/${employeeId}/documents`, { method: 'POST', headers: authHeaders(), body });
      const data = await res.json();
      if (!data.success) { toast.error(data.error || 'Upload failed'); return; }
      setDocuments((prev) => [data.document, ...prev]);
      setDocTitle('');
      if (docRef.current) docRef.current.value = '';
      toast.success('Document uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setBusy('');
    }
  };

  const downloadDocument = async (doc) => {
    try {
      const res = await fetch(`/api/employees/${employeeId}/documents/${doc.id}`, { headers: authHeaders() });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || 'Download failed');
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = doc.fileName || `${doc.title}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Download failed');
    }
  };

  const removeDocument = async (doc) => {
    if (!window.confirm(`Remove ${doc.title}?`)) return;
    const res = await fetch(`/api/employees/${employeeId}/documents/${doc.id}`, { method: 'DELETE', headers: authHeaders() });
    const data = await res.json();
    if (!data.success) { toast.error(data.error || 'Could not remove document'); return; }
    setDocuments((prev) => prev.filter((item) => item.id !== doc.id));
    toast.success('Document removed');
  };

  if (loading) {
    return <div className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-10 text-center text-[#9aa3ab]">Opening profile…</div>;
  }
  if (!employee) {
    return <div className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-10 text-center text-[#9aa3ab]">This profile is not available.</div>;
  }

  const fields = [
    ['Employee ID', employee.employeeId],
    ['Email', employee.email],
    ['Phone', employee.phone],
    ['Role', employee.role?.replace('_', ' ')],
    ['Department', employee.department],
    ['Designation', employee.designation],
    ['Employment', employee.employmentType?.replace('_', ' ')],
    ['Joining', formatDate(employee.joiningDate)],
    ['Date of birth', formatDate(employee.dateOfBirth)],
    ['Gender', employee.gender],
    ['City', employee.city],
    ['State', employee.state],
    ['Manager', employee.managerName],
    ['Attendance', employee.remoteAttendance ? 'Anywhere' : 'Office only'],
  ];

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-3xl border border-[#7fd4e4]/20 bg-gradient-to-br from-[#0c1218] via-[#101820] to-[#0e1c2c]">
        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:p-8">
          <div className="relative mx-auto h-40 w-40 flex-shrink-0 sm:mx-0">
            <div className="h-40 w-40 overflow-hidden rounded-2xl border border-[#7fd4e4]/30 bg-[#070b10] shadow-lg shadow-[#4eb8cc]/10">
              {employee.avatar ? (
                <img src={employee.avatar} alt={employee.fullName} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#1c3d66] to-[#7fd4e4] text-5xl font-bold text-white">
                  {(employee.fullName || 'U').charAt(0)}
                </div>
              )}
            </div>
            {(isSelf || isAdmin || isHr) && (
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy === 'photo'}
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-3 py-1.5 text-xs font-semibold text-white shadow-lg disabled:opacity-60">
                {busy === 'photo' ? 'Uploading…' : 'Upload photo'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => uploadPhoto(e.target.files?.[0])} />
          </div>

          <div className="min-w-0 flex-1 text-center sm:pt-0 sm:text-left">
            <p className="text-[11px] uppercase tracking-[0.28em] text-[#7fd4e4]">Profile</p>
            <h1 className="mt-1 truncate text-3xl font-bold text-[#f4f7f8]">{employee.fullName || 'Unnamed'}</h1>
            <p className="mt-1 text-[#9aa3ab]">{employee.designation || employee.role}{employee.department ? ` · ${employee.department}` : ''}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span className="rounded-full border border-[#7fd4e4]/30 bg-[#1c3d66]/40 px-3 py-1 text-xs font-semibold text-[#7fd4e4]">{employee.employeeId}</span>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${employee.isActive ? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-300' : 'border-rose-400/30 bg-rose-500/10 text-rose-300'}`}>
                {employee.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-6">
        <h2 className="text-lg font-bold text-[#f4f7f8]">Details</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-[#070b10] px-4 py-3">
              <p className="text-[10px] uppercase tracking-widest text-[#8d949b]">{label}</p>
              <p className="mt-1 truncate text-sm font-medium capitalize text-[#f4f7f8]">{value || '—'}</p>
            </div>
          ))}
        </div>
        {employee.address && (
          <p className="mt-4 text-sm text-[#9aa3ab]">{employee.address}{employee.postalCode ? `, ${employee.postalCode}` : ''}</p>
        )}
      </section>

      {isAdmin && (
        <section className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-6">
          <h2 className="text-lg font-bold text-[#f4f7f8]">Login password</h2>
          <p className="mt-1 text-sm text-[#9aa3ab]">Only admins can see this. The student panel never shows it.</p>
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-[#7fd4e4]/20 bg-[#070b10] px-4 py-3">
            <span className="flex-1 font-mono text-sm text-[#7fd4e4]">
              {employee.loginPassword ? (showPassword ? employee.loginPassword : '••••••••') : 'Not stored yet. Set a new password below.'}
            </span>
            {employee.loginPassword && (
              <button type="button" onClick={() => setShowPassword((v) => !v)} className="text-xs font-semibold text-[#d7dee6]">
                {showPassword ? 'Hide' : 'Show'}
              </button>
            )}
          </div>
          <form onSubmit={saveAdminPassword} className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} type="text" minLength={6} required className="input-field" placeholder="Set a new password" />
            <button disabled={busy === 'password'} className="rounded-xl bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy === 'password' ? 'Saving…' : 'Update password'}
            </button>
          </form>
        </section>
      )}

      {isSelf && (
        <section className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-6">
          <h2 className="text-lg font-bold text-[#f4f7f8]">Change your password</h2>
          <p className="mt-1 text-sm text-[#9aa3ab]">Use the password you log in with. Your new one stays private on this panel.</p>
          <form onSubmit={saveOwnPassword} className="mt-4 grid gap-3 sm:grid-cols-2">
            <input type="password" required value={ownPassword.current} onChange={(e) => setOwnPassword({ ...ownPassword, current: e.target.value })} className="input-field sm:col-span-2" placeholder="Current password" />
            <input type="password" required minLength={6} value={ownPassword.next} onChange={(e) => setOwnPassword({ ...ownPassword, next: e.target.value })} className="input-field" placeholder="New password" />
            <input type="password" required minLength={6} value={ownPassword.confirm} onChange={(e) => setOwnPassword({ ...ownPassword, confirm: e.target.value })} className="input-field" placeholder="Confirm new password" />
            <button disabled={busy === 'password'} className="rounded-xl bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:col-span-2 sm:w-fit">
              {busy === 'password' ? 'Saving…' : 'Change password'}
            </button>
          </form>
        </section>
      )}

      <section className="rounded-3xl border border-[#7fd4e4]/15 bg-[#0c1218] p-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#f4f7f8]">Documents</h2>
            <p className="mt-1 text-sm text-[#9aa3ab]">{isSelf ? 'Download the files shared with you.' : 'PDFs uploaded here appear in this person\'s panel.'}</p>
          </div>
          <span className="text-xs text-[#8d949b]">{documents.length} file{documents.length === 1 ? '' : 's'}</span>
        </div>

        {(isAdmin || isHr) && (
          <form onSubmit={uploadDocument} className="mt-4 grid gap-3 rounded-2xl border border-[#7fd4e4]/15 bg-[#070b10] p-4 sm:grid-cols-[1fr_1fr_auto]">
            <input value={docTitle} onChange={(e) => setDocTitle(e.target.value)} className="input-field" placeholder="Document title, e.g. Offer letter" />
            <input ref={docRef} type="file" accept="application/pdf,.pdf" required className="input-field file:mr-3 file:rounded-lg file:border-0 file:bg-[#1c3d66] file:px-3 file:py-1 file:text-xs file:font-semibold file:text-white" />
            <button disabled={busy === 'doc'} className="rounded-xl bg-gradient-to-r from-[#1c3d66] to-[#7fd4e4] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">
              {busy === 'doc' ? 'Uploading…' : 'Upload PDF'}
            </button>
          </form>
        )}

        <div className="mt-4 space-y-2">
          {documents.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-[#7fd4e4]/20 px-4 py-8 text-center text-sm text-[#9aa3ab]">No documents yet.</p>
          ) : documents.map((doc) => (
            <div key={doc.id} className="flex flex-col gap-3 rounded-2xl border border-white/5 bg-[#070b10] px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-[#1c3d66] text-[10px] font-bold text-[#7fd4e4]">PDF</div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-[#f4f7f8]">{doc.title}</p>
                <p className="truncate text-xs text-[#8d949b]">{doc.fileName} · {formatSize(doc.size)} · {formatDate(doc.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => downloadDocument(doc)} className="rounded-xl border border-[#7fd4e4]/30 px-3 py-2 text-xs font-semibold text-[#7fd4e4] hover:bg-[#7fd4e4]/10">
                  Download
                </button>
                {(isAdmin || isHr) && (
                  <button type="button" onClick={() => removeDocument(doc)} className="rounded-xl border border-rose-400/30 px-3 py-2 text-xs font-semibold text-rose-300 hover:bg-rose-500/10">
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
