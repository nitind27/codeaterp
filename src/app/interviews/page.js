'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function InterviewsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [interviews, setInterviews] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('all');
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    candidatePhone: '',
    position: '',
    interviewDate: '',
    interviewTime: '',
    interviewerId: '',
    status: 'scheduled',
    notes: ''
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

    loadInterviews();
    loadEmployees();
  }, []);

  const loadInterviews = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/interviews', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setInterviews(data.interviews || []);
      } else {
        toast.error(data.error || 'Failed to load interviews');
      }
    } catch (error) {
      toast.error('Error loading interviews');
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
      console.error('Error loading employees:', error);
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

      // Combine date and time
      const interviewDateTime = formData.interviewDate && formData.interviewTime
        ? `${formData.interviewDate}T${formData.interviewTime}:00`
        : formData.interviewDate
        ? `${formData.interviewDate}T10:00:00`
        : null;

      if (!interviewDateTime) {
        toast.error('Interview date is required');
        return;
      }

      const response = await fetch('/api/interviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          candidateName: formData.candidateName,
          candidateEmail: formData.candidateEmail || null,
          candidatePhone: formData.candidatePhone || null,
          position: formData.position || null,
          interviewDate: interviewDateTime,
          interviewerId: formData.interviewerId || null,
          status: formData.status,
          notes: formData.notes || null
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Interview scheduled successfully!');
        setShowModal(false);
        setFormData({
          candidateName: '',
          candidateEmail: '',
          candidatePhone: '',
          position: '',
          interviewDate: '',
          interviewTime: '',
          interviewerId: '',
          status: 'scheduled',
          notes: ''
        });
        loadInterviews();
      } else {
        toast.error(data.error || 'Failed to schedule interview');
      }
    } catch (error) {
      toast.error('Error scheduling interview');
    }
  };

  const filteredInterviews = filter === 'all' 
    ? interviews 
    : interviews.filter(i => i.status === filter);

  if (loading || !user) {
    return <LogoLoader />;
  }

  const getStatusColor = (status) => {
    const colors = {
      scheduled: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      completed: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelled: 'bg-red-500/20 text-red-400 border-red-500/30',
      rescheduled: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getResultColor = (result) => {
    const colors = {
      pending: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
      selected: 'bg-green-500/20 text-green-400 border-green-500/30',
      rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
      on_hold: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    };
    return colors[result] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const formatDateTime = (dateTimeString) => {
    if (!dateTimeString) return 'Not scheduled';
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Interviews</h1>
            <p className="text-codeat-gray text-lg">Manage candidate interviews and tracking</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            + Schedule Interview
          </button>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-3">
          {['all', 'scheduled', 'completed', 'cancelled', 'rescheduled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-300 ${
                filter === status
                  ? 'bg-gradient-to-r from-codeat-teal to-codeat-accent text-white shadow-lg shadow-codeat-teal/30 scale-105'
                  : 'bg-codeat-mid text-codeat-silver hover:bg-codeat-muted border border-codeat-muted/30 hover:scale-105 active:scale-95'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Interviews List */}
        {filteredInterviews.length === 0 ? (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <h3 className="text-codeat-silver font-bold text-xl mb-2">No Interviews Found</h3>
            <p className="text-codeat-gray mb-6">
              {filter === 'all' 
                ? 'Get started by scheduling your first interview'
                : `No ${filter} interviews found`}
            </p>
            {filter === 'all' && (
              <button
                onClick={() => setShowModal(true)}
                className="px-6 py-3 bg-codeat-accent text-white rounded-lg hover:bg-codeat-accent/80 transition font-medium"
              >
                Schedule Interview
              </button>
            )}
          </div>
        ) : (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 overflow-hidden shadow-xl">
            <div className="table-container">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Candidate</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Position</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden md:table-cell">Interview Date</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden lg:table-cell">Interviewer</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Status</th>
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider hidden lg:table-cell">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInterviews.map((interview) => (
                    <tr key={interview.id} className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <div className="text-codeat-silver font-semibold">{interview.candidateName}</div>
                          {interview.candidateEmail && (
                            <div className="text-codeat-gray text-xs sm:text-sm">{interview.candidateEmail}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver text-sm font-medium">
                        {interview.position || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm hidden md:table-cell">
                        {formatDateTime(interview.interviewDate)}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-gray text-sm hidden lg:table-cell">
                        {interview.interviewerName || '-'}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getStatusColor(interview.status)}`}>
                          {interview.status.charAt(0).toUpperCase() + interview.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-4 hidden lg:table-cell">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border ${getResultColor(interview.result)}`}>
                          {interview.result ? interview.result.replace('_', ' ').charAt(0).toUpperCase() + interview.result.replace('_', ' ').slice(1) : 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Schedule Interview Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Schedule Interview</h2>
                    <p className="text-codeat-gray text-sm">Fill in the details to schedule a new interview</p>
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
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Candidate Name <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.candidateName}
                    onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                    className="input-field"
                    placeholder="Enter candidate name"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Email</label>
                    <input
                      type="email"
                      value={formData.candidateEmail}
                      onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                      className="input-field"
                      placeholder="candidate@example.com"
                    />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Phone</label>
                    <input
                      type="tel"
                      value={formData.candidatePhone}
                      onChange={(e) => setFormData({ ...formData, candidatePhone: e.target.value })}
                      className="input-field"
                      placeholder="+91 1234567890"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Position</label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                    className="input-field"
                    placeholder="e.g., Software Developer, HR Manager"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Interview Date <span className="text-red-400">*</span></label>
                    <input
                      type="date"
                      value={formData.interviewDate}
                      onChange={(e) => setFormData({ ...formData, interviewDate: e.target.value })}
                      className="input-field"
                      required
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Interview Time</label>
                    <input
                      type="time"
                      value={formData.interviewTime}
                      onChange={(e) => setFormData({ ...formData, interviewTime: e.target.value })}
                      className="input-field"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Interviewer</label>
                    <select
                      value={formData.interviewerId}
                      onChange={(e) => setFormData({ ...formData, interviewerId: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Select interviewer</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.fullName} {emp.department ? `(${emp.department})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="input-field"
                    >
                      <option value="scheduled">Scheduled</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                      <option value="rescheduled">Rescheduled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="input-field"
                    rows="4"
                    placeholder="Additional notes about the interview..."
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Schedule Interview
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

