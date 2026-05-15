'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  email: '', password: '', role: 'employee',
  first_name: '', last_name: '', phone: '',
  department: '', designation: '',
  joining_date: new Date().toISOString().split('T')[0],
  date_of_birth: ''
};

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Add modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState(EMPTY_FORM);

  // Edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Delete modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (!token || !userData) { router.push('/login'); return; }
    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);
    if (parsedUser.role !== 'admin' && parsedUser.role !== 'hr') { router.push('/dashboard'); return; }
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employees', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (data.success) setEmployees(data.employees || []);
      else toast.error(data.error || 'Failed to load employees');
    } catch { toast.error('Error loading employees'); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...formData, date_of_birth: formData.date_of_birth || null })
      });
      const data = await res.json();
      if (data.success) {
        if (data.emailSent) toast.success('Employee created! Welcome email sent to ' + formData.email, { duration: 5000 });
        else { toast.success('Employee created successfully!'); toast('Welcome email could not be sent. Share credentials manually.', { icon: '📧', duration: 5000 }); }
        setShowModal(false);
        setFormData(EMPTY_FORM);
        loadEmployees();
      } else toast.error(data.error || 'Failed to create employee');
    } catch { toast.error('Error creating employee'); }
    finally { setSubmitting(false); }
  };

  const openEdit = (emp) => {
    setEditData({
      id: emp.id,
      first_name: emp.firstName || '',
      last_name: emp.lastName || '',
      phone: emp.phone || '',
      department: emp.department || '',
      designation: emp.designation || '',
      date_of_birth: emp.dateOfBirth ? emp.dateOfBirth.split('T')[0] : '',
      joining_date: emp.joiningDate ? emp.joiningDate.split('T')[0] : '',
      salary: emp.salary || '',
      employment_type: emp.employmentType || 'full_time',
      role: emp.role || 'employee',
      gender: emp.gender || '',
      address: emp.address || '',
      city: emp.city || '',
      state: emp.state || '',
      country: emp.country || 'India',
    });
    setShowEditModal(true);
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    setEditSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const { id, role, ...fields } = editData;
      const res = await fetch(`/api/employees/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(fields)
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Employee updated successfully!');
        setShowEditModal(false);
        setEditData(null);
        loadEmployees();
      } else toast.error(data.error || 'Failed to update employee');
    } catch { toast.error('Error updating employee'); }
    finally { setEditSubmitting(false); }
  };

  const openDelete = (emp) => { setDeleteTarget(emp); setShowDeleteModal(true); };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/employees/${deleteTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Employee deleted successfully!');
        setShowDeleteModal(false);
        setDeleteTarget(null);
        loadEmployees();
      } else toast.error(data.error || 'Failed to delete employee');
    } catch { toast.error('Error deleting employee'); }
    finally { setDeleteSubmitting(false); }
  };

  if (loading || !user) return <LogoLoader />;

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Employees</h1>
            <p className="text-codeat-gray text-lg">Manage your team members and their information</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: employees.length, color: 'from-codeat-teal to-codeat-accent' },
            { label: 'Active', value: employees.filter(e => e.isActive).length, color: 'from-green-500 to-emerald-400' },
            { label: 'Inactive', value: employees.filter(e => !e.isActive).length, color: 'from-red-500 to-rose-400' },
            { label: 'Departments', value: [...new Set(employees.map(e => e.department).filter(Boolean))].length, color: 'from-purple-500 to-violet-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-codeat-mid rounded-xl border border-codeat-muted/30 p-4 flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${stat.color} flex items-center justify-center text-white font-bold text-lg`}>{stat.value}</div>
              <span className="text-codeat-gray text-sm font-medium">{stat.label}</span>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-codeat-muted/30">
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Name</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Department</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden lg:table-cell">Designation</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Status</th>
                  <th className="px-4 sm:px-6 py-4 text-right text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-codeat-muted/20">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-codeat-muted/30 flex items-center justify-center">
                          <svg className="w-8 h-8 text-codeat-gray" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                        <div className="text-codeat-gray text-lg font-medium">No employees found</div>
                        <p className="text-codeat-gray/60 text-sm">Click "Add Employee" to create your first employee</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      <td className="px-4 sm:px-6 py-4 text-codeat-accent font-mono text-sm font-semibold">{emp.employeeId}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-codeat-accent to-codeat-teal flex items-center justify-center text-white font-bold text-sm shadow-md flex-shrink-0">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-codeat-silver font-semibold text-sm">{emp.fullName}</div>
                            <div className="text-codeat-gray text-xs capitalize">{emp.role}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm hidden md:table-cell">{emp.email}</td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver text-sm font-medium">{emp.department || <span className="text-codeat-gray/50">—</span>}</td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm hidden lg:table-cell">{emp.designation || <span className="text-codeat-gray/50">—</span>}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${emp.isActive ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${emp.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button onClick={() => openEdit(emp)}
                            className="p-2 rounded-lg bg-codeat-teal/10 text-codeat-teal hover:bg-codeat-teal/20 transition-colors duration-200" title="Edit employee">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => openDelete(emp)}
                            className="p-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors duration-200" title="Delete employee">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── ADD EMPLOYEE MODAL ── */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl ">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 bg-[#071e20] z-999">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-codeat-silver mb-1">Add New Employee</h2>
                    <p className="text-codeat-gray text-sm">Fill in the details to create a new employee account</p>
                  </div>
                  <button onClick={() => { setShowModal(false); setFormData(EMPTY_FORM); }}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">First Name <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} className="input-field" placeholder="Enter first name" required />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Last Name <span className="text-red-400">*</span></label>
                    <input type="text" value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} className="input-field" placeholder="Enter last name" required />
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">Email Address <span className="text-red-400">*</span></label>
                  <input type="email" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="input-field" placeholder="employee@codeat.com" required />
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">Password <span className="text-red-400">*</span></label>
                  <input type="password" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="input-field" placeholder="Minimum 6 characters" required minLength={6} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Role <span className="text-red-400">*</span></label>
                    <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="input-field">
                      <option value="employee">Employee</option>
                      <option value="intern">Intern</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Phone Number</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" placeholder="+91 1234567890" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Department</label>
                    <input type="text" value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="input-field" placeholder="e.g., IT, HR, Sales" />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Designation</label>
                    <input type="text" value={formData.designation} onChange={e => setFormData({ ...formData, designation: e.target.value })} className="input-field" placeholder="e.g., Developer, Manager" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Date of Birth</label>
                    <input type="date" value={formData.date_of_birth} onChange={e => setFormData({ ...formData, date_of_birth: e.target.value })} className="input-field" max={new Date().toISOString().split('T')[0]} />
                    <p className="text-codeat-gray/60 text-xs mt-1">Required for birthday celebrations</p>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Joining Date</label>
                    <input type="date" value={formData.joining_date} onChange={e => setFormData({ ...formData, joining_date: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-codeat-muted/30">
                  <button type="submit" disabled={submitting}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                    {submitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating Employee...
                      </>
                    ) : 'Create Employee'}
                  </button>
                  <button type="button" onClick={() => { setShowModal(false); setFormData(EMPTY_FORM); }} disabled={submitting}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── EDIT EMPLOYEE MODAL ── */}
        {showEditModal && editData && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-codeat-silver mb-1">Edit Employee</h2>
                    <p className="text-codeat-gray text-sm">Update employee profile information</p>
                  </div>
                  <button onClick={() => { setShowEditModal(false); setEditData(null); }}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleEdit} className="p-6 lg:p-8 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">First Name <span className="text-red-400">*</span></label>
                    <input type="text" value={editData.first_name} onChange={e => setEditData({ ...editData, first_name: e.target.value })} className="input-field" required />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Last Name <span className="text-red-400">*</span></label>
                    <input type="text" value={editData.last_name} onChange={e => setEditData({ ...editData, last_name: e.target.value })} className="input-field" required />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Phone Number</label>
                    <input type="tel" value={editData.phone} onChange={e => setEditData({ ...editData, phone: e.target.value })} className="input-field" placeholder="+91 1234567890" />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Gender</label>
                    <select value={editData.gender} onChange={e => setEditData({ ...editData, gender: e.target.value })} className="input-field">
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Department</label>
                    <input type="text" value={editData.department} onChange={e => setEditData({ ...editData, department: e.target.value })} className="input-field" placeholder="e.g., IT, HR, Sales" />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Designation</label>
                    <input type="text" value={editData.designation} onChange={e => setEditData({ ...editData, designation: e.target.value })} className="input-field" placeholder="e.g., Developer, Manager" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Employment Type</label>
                    <select value={editData.employment_type} onChange={e => setEditData({ ...editData, employment_type: e.target.value })} className="input-field">
                      <option value="full_time">Full Time</option>
                      <option value="part_time">Part Time</option>
                      <option value="contract">Contract</option>
                      <option value="intern">Intern</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Salary</label>
                    <input type="number" value={editData.salary} onChange={e => setEditData({ ...editData, salary: e.target.value })} className="input-field" placeholder="Monthly salary" min="0" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Date of Birth</label>
                    <input type="date" value={editData.date_of_birth} onChange={e => setEditData({ ...editData, date_of_birth: e.target.value })} className="input-field" max={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Joining Date</label>
                    <input type="date" value={editData.joining_date} onChange={e => setEditData({ ...editData, joining_date: e.target.value })} className="input-field" />
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2">Address</label>
                  <input type="text" value={editData.address} onChange={e => setEditData({ ...editData, address: e.target.value })} className="input-field" placeholder="Street address" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">City</label>
                    <input type="text" value={editData.city} onChange={e => setEditData({ ...editData, city: e.target.value })} className="input-field" placeholder="City" />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">State</label>
                    <input type="text" value={editData.state} onChange={e => setEditData({ ...editData, state: e.target.value })} className="input-field" placeholder="State" />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2">Country</label>
                    <input type="text" value={editData.country} onChange={e => setEditData({ ...editData, country: e.target.value })} className="input-field" placeholder="Country" />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-codeat-muted/30">
                  <button type="submit" disabled={editSubmitting}
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 disabled:opacity-60 disabled:cursor-not-allowed disabled:scale-100 hover:scale-105 active:scale-95 flex items-center justify-center gap-2">
                    {editSubmitting ? (
                      <>
                        <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving Changes...
                      </>
                    ) : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setShowEditModal(false); setEditData(null); }} disabled={editSubmitting}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── DELETE CONFIRMATION MODAL ── */}
        {showDeleteModal && deleteTarget && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-codeat-mid rounded-2xl border border-red-500/30 w-full max-w-md shadow-2xl">
              <div className="p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-codeat-silver mb-2">Delete Employee</h3>
                <p className="text-codeat-gray mb-1">Are you sure you want to delete</p>
                <p className="text-codeat-accent font-semibold mb-1">{deleteTarget.fullName}</p>
                <p className="text-codeat-gray/60 text-sm mb-6">({deleteTarget.employeeId}) — This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button onClick={handleDelete} disabled={deleteSubmitting}
                    className="flex-1 px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {deleteSubmitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Deleting...
                      </>
                    ) : 'Yes, Delete'}
                  </button>
                  <button onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }} disabled={deleteSubmitting}
                    className="flex-1 px-5 py-3 bg-codeat-muted/50 text-codeat-silver rounded-xl font-semibold hover:bg-codeat-muted transition-all duration-200 border border-codeat-muted/30 disabled:opacity-50">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
}
