'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function EmployeesPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'employee',
    first_name: '',
    last_name: '',
    phone: '',
    department: '',
    designation: '',
    joining_date: new Date().toISOString().split('T')[0],
    date_of_birth: ''
  });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    const parsedUser = JSON.parse(userData);
    setUser(parsedUser);

    if (parsedUser.role !== 'admin' && parsedUser.role !== 'hr') {
      router.push('/dashboard');
      return;
    }

    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setEmployees(data.employees || []);
      } else {
        toast.error(data.error || 'Failed to load employees');
      }
    } catch (error) {
      toast.error('Error loading employees');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login again');
        router.push('/login');
        return;
      }

      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          role: formData.role,
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone: formData.phone,
          department: formData.department,
          designation: formData.designation,
          joining_date: formData.joining_date,
          date_of_birth: formData.date_of_birth || null
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Employee created successfully!');
        setShowModal(false);
        setFormData({
          email: '',
          password: '',
          role: 'employee',
          first_name: '',
          last_name: '',
          phone: '',
          department: '',
          designation: '',
          joining_date: new Date().toISOString().split('T')[0],
          date_of_birth: ''
        });
        loadEmployees();
      } else {
        toast.error(data.error || 'Failed to create employee');
      }
    } catch (error) {
      toast.error('Error creating employee');
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Employees</h1>
            <p className="text-codeat-gray text-lg">Manage your team members and their information</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Employee
          </button>
        </div>

        {/* Employees Table */}
        <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 overflow-hidden shadow-xl">
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Employee ID</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Name</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden md:table-cell">Email</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Department</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden lg:table-cell">Designation</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-6 py-12 text-center">
                      <div className="text-codeat-gray text-lg mb-2">No employees found</div>
                      <p className="text-codeat-gray text-sm">Click "Add Employee" to create your first employee</p>
                    </td>
                  </tr>
                ) : (
                  employees.map((emp) => (
                    <tr key={emp.id} className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      <td className="px-4 sm:px-6 py-4 text-codeat-accent font-mono text-sm font-semibold">{emp.employeeId}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-codeat-accent to-codeat-teal flex items-center justify-center text-white font-bold text-sm shadow-md">
                            {emp.fullName.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-codeat-silver font-semibold">{emp.fullName}</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm hidden md:table-cell">{emp.email}</td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver text-sm font-medium">{emp.department || '-'}</td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm hidden lg:table-cell">{emp.designation || '-'}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          emp.isActive 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${emp.isActive ? 'bg-green-400' : 'bg-red-400'}`}></span>
                          {emp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Add Employee Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Add New Employee</h2>
                    <p className="text-codeat-gray text-sm">Fill in the details to create a new employee account</p>
                  </div>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="p-6 lg:p-8 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">First Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      className="input-field"
                      placeholder="Enter first name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Last Name <span className="text-red-400">*</span></label>
                    <input
                      type="text"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      className="input-field"
                      placeholder="Enter last name"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Email Address <span className="text-red-400">*</span></label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    placeholder="employee@codeat.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Password <span className="text-red-400">*</span></label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    placeholder="Minimum 6 characters"
                    required
                    minLength={6}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Role <span className="text-red-400">*</span></label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      className="input-field"
                    >
                      <option value="employee">Employee</option>
                      <option value="intern">Intern</option>
                      <option value="project_manager">Project Manager</option>
                      <option value="hr">HR</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Phone Number</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="input-field"
                      placeholder="+91 1234567890"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Department</label>
                    <input
                      type="text"
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="input-field"
                      placeholder="e.g., IT, HR, Sales"
                    />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Designation</label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="input-field"
                      placeholder="e.g., Developer, Manager"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="input-field"
                      max={new Date().toISOString().split('T')[0]}
                      title="Select employee's date of birth for birthday tracking"
                    />
                    <p className="text-codeat-gray text-xs mt-1.5">Required for birthday celebrations</p>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Joining Date</label>
                    <input
                      type="date"
                      value={formData.joining_date}
                      onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Create Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

