'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ComplaintsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ subject: '', description: '', category: 'other', priority: 'medium' });

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadComplaints();
  }, []);

  const loadComplaints = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/complaints', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints || []);
      } else {
        toast.error(data.error || 'Failed to load complaints');
      }
    } catch (error) {
      toast.error('Error loading complaints');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Complaint submitted successfully!');
        setShowModal(false);
        setFormData({ subject: '', description: '', category: 'other', priority: 'medium' });
        loadComplaints();
      } else {
        toast.error(data.error || 'Failed to submit complaint');
      }
    } catch (error) {
      toast.error('Error submitting complaint');
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  const getStatusColor = (status) => {
    const colors = {
      open: 'bg-blue-500/20 text-blue-400',
      in_progress: 'bg-yellow-500/20 text-yellow-400',
      resolved: 'bg-green-500/20 text-green-400',
      closed: 'bg-gray-500/20 text-gray-400'
    };
    return colors[status] || 'bg-gray-500/20 text-gray-400';
  };

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Complaints & Grievances</h1>
            <p className="text-codeat-gray text-lg">Submit and track your complaints</p>
          </div>
          {(user.role === 'employee' || user.role === 'intern') && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Submit Complaint
            </button>
          )}
        </div>

        {/* Complaints List */}
        <div className="space-y-4">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-6 lg:p-8 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center text-white text-xl font-bold shadow-lg flex-shrink-0">
                      📝
                    </div>
                    <div className="flex-1">
                      <h3 className="text-codeat-silver font-bold text-xl mb-3">{complaint.subject}</h3>
                      <p className="text-codeat-gray text-sm mb-4 leading-relaxed">{complaint.description}</p>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-codeat-gray">Category:</span>
                          <span className="text-codeat-silver font-semibold capitalize px-3 py-1 bg-codeat-dark rounded-lg">{complaint.category}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-codeat-gray">Priority:</span>
                          <span className={`font-semibold capitalize px-3 py-1 rounded-lg ${
                            complaint.priority === 'urgent' ? 'bg-red-500/20 text-red-400' :
                            complaint.priority === 'high' ? 'bg-orange-500/20 text-orange-400' :
                            complaint.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-blue-500/20 text-blue-400'
                          }`}>
                            {complaint.priority}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <span className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold ${getStatusColor(complaint.status)} border`}>
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      complaint.status === 'resolved' ? 'bg-green-400' :
                      complaint.status === 'in_progress' ? 'bg-yellow-400' :
                      complaint.status === 'closed' ? 'bg-gray-400' :
                      'bg-blue-400'
                    }`}></span>
                    {complaint.status.replace('_', ' ')}
                  </span>
                  <div className="text-xs text-codeat-gray">
                    {new Date(complaint.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {complaints.length === 0 && (
          <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/30 p-12 lg:p-16 text-center shadow-xl">
            <div className="text-6xl mb-4 opacity-30">📝</div>
            <p className="text-codeat-gray text-xl font-semibold mb-2">No complaints found</p>
            <p className="text-codeat-gray text-sm">Your complaints will appear here</p>
          </div>
        )}

        {/* Submit Complaint Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md modal-backdrop flex items-center justify-center z-50 p-4 animate-fadeIn">
            <div className="bg-codeat-mid rounded-2xl border border-codeat-muted/50 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-slideUp">
              <div className="sticky top-0 bg-codeat-mid border-b border-codeat-muted/30 p-6 backdrop-blur-sm z-10">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl lg:text-3xl font-bold text-codeat-silver mb-1">Submit Complaint</h2>
                    <p className="text-codeat-gray text-sm">Report an issue or grievance</p>
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
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Subject <span className="text-red-400">*</span></label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="input-field"
                    placeholder="Enter complaint subject"
                    required
                  />
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Description <span className="text-red-400">*</span></label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="input-field"
                    rows="5"
                    placeholder="Provide detailed description of your complaint..."
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="input-field"
                    >
                      <option value="workplace">Workplace</option>
                      <option value="harassment">Harassment</option>
                      <option value="discrimination">Discrimination</option>
                      <option value="salary">Salary</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">Priority</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                      className="input-field"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-codeat-muted/30">
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Submit Complaint
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

