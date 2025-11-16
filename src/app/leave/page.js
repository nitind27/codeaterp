'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function LeavePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState([]);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    leaveTypeId: '',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [leaveTypes, setLeaveTypes] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = localStorage.getItem('token');
      const userData = JSON.parse(localStorage.getItem('user'));

      const [leavesRes, balanceRes, typesRes] = await Promise.all([
        fetch('/api/leave', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/leave/balance', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/leave/types', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const [leavesData, balanceData, typesData] = await Promise.all([
        leavesRes.json(),
        balanceRes.json(),
        typesRes.json()
      ]);

      setLeaves(leavesData.leaves || []);
      setLeaveBalance(balanceData.balance || []);
      setLeaveTypes(typesData.types || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');

      const response = await fetch('/api/leave', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Leave application submitted successfully!');
        setShowApplyForm(false);
        setFormData({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
        await loadData();
      } else {
        toast.error(data.error || 'Failed to apply leave');
      }
    } catch (error) {
      toast.error('Error applying leave');
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Leave Management</h1>
            <p className="text-codeat-gray text-lg">Apply for leave and view your leave history</p>
          </div>
          {(user.role === 'employee' || user.role === 'intern') && (
            <button
              onClick={() => setShowApplyForm(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-accent to-codeat-teal text-white rounded-xl hover:from-codeat-accent/90 hover:to-codeat-teal/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-accent/30 hover:shadow-codeat-accent/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Apply for Leave
            </button>
          )}
        </div>

        {/* Leave Balance */}
        <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-codeat-silver">Leave Balance</h2>
            <div className="h-1 flex-1 mx-4 bg-codeat-muted/30 rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {leaveBalance.map((balance) => (
              <div key={balance.id} className="bg-gradient-to-br from-codeat-dark to-codeat-dark/80 rounded-xl p-5 lg:p-6 border border-codeat-muted/30 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-codeat-gray text-sm font-semibold uppercase tracking-wide">{balance.leaveTypeName}</p>
                  <span className="text-codeat-gray text-xs font-mono">{balance.leaveTypeCode}</span>
                </div>
                <p className="text-codeat-accent text-4xl lg:text-5xl font-bold mb-2">{balance.availableDays}</p>
                <div className="pt-3 border-t border-codeat-muted/30">
                  <p className="text-codeat-gray text-xs">
                    <span className="text-codeat-silver font-semibold">{balance.usedDays}</span> used / <span className="text-codeat-silver font-semibold">{balance.totalDays}</span> total
                  </p>
                  {balance.pendingDays > 0 && (
                    <p className="text-yellow-400 text-xs mt-1">
                      {balance.pendingDays} pending
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Apply Leave Form Modal */}
        {showApplyForm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Apply for Leave</h2>
                    <p className="text-codeat-gray text-sm">Submit your leave application</p>
                  </div>
                  <button
                    onClick={() => setShowApplyForm(false)}
                    className="p-2 hover:bg-codeat-muted/50 rounded-lg transition text-codeat-gray hover:text-codeat-silver"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
              <form onSubmit={handleApplyLeave} className="p-6 lg:p-8 space-y-6">
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Leave Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.leaveTypeId}
                    onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                    className="input-field"
                    required
                  >
                    <option value="">Select leave type</option>
                    {leaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.code})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                      End Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Reason <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    value={formData.reason}
                    onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                    className="input-field"
                    rows="4"
                    placeholder="Please provide a reason for your leave..."
                    required
                  />
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-accent to-codeat-teal text-white rounded-xl hover:from-codeat-accent/90 hover:to-codeat-teal/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-accent/30 hover:shadow-codeat-accent/50 hover:scale-105 active:scale-95"
                  >
                    Submit Application
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowApplyForm(false)}
                    className="flex-1 px-6 py-3.5 bg-codeat-muted/50 text-codeat-silver rounded-xl hover:bg-codeat-muted transition-all duration-300 font-semibold border border-codeat-muted/30"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Leave History */}
        <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-codeat-silver">Leave History</h2>
            <div className="h-1 flex-1 mx-4 bg-codeat-muted/30 rounded-full"></div>
          </div>
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Leave Type</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Start Date</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">End Date</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Days</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {leaves.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-codeat-gray text-lg mb-2">No leave applications found</div>
                      <p className="text-codeat-gray text-sm">Your leave history will appear here</p>
                    </td>
                  </tr>
                ) : (
                  leaves.map((leave) => (
                    <tr key={leave.id} className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      <td className="px-4 sm:px-6 py-4">
                        <div>
                          <span className="text-codeat-silver font-semibold">{leave.leaveTypeName}</span>
                          <span className="text-codeat-gray text-xs ml-2 font-mono">({leave.leaveTypeCode})</span>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-medium">
                        {new Date(leave.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-medium">
                        {new Date(leave.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-accent font-bold">{leave.totalDays} days</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          leave.status === 'approved' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : leave.status === 'rejected'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            leave.status === 'approved' ? 'bg-green-400' :
                            leave.status === 'rejected' ? 'bg-red-400' :
                            'bg-yellow-400'
                          }`}></span>
                          {leave.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

