'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const parseTimeToDate = (timeStr) => {
  if (!timeStr) return null;
  const parts = timeStr.split(':').map((value) => parseInt(value, 10));
  const [hours = 0, minutes = 0, seconds = 0] = parts;

  if ([hours, minutes, seconds].some((num) => Number.isNaN(num))) {
    return null;
  }

  const date = new Date();
  date.setHours(hours, minutes, seconds, 0);
  return date;
};

const formatDurationFromMs = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

const calculateHoursDifference = (start, end) => {
  const startDate = parseTimeToDate(start);
  const endDate = parseTimeToDate(end);
  if (!startDate || !endDate) return null;

  const diff = endDate - startDate;
  return Number((diff / (1000 * 60 * 60)).toFixed(2));
};

export default function AttendancePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [editForm, setEditForm] = useState({ clockIn: '', clockOut: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');

    if (!token || !userData) {
      router.push('/login');
      return;
    }

    setUser(JSON.parse(userData));
    loadAttendance();
  }, []);

  useEffect(() => {
    if (todayAttendance?.clockIn && !todayAttendance?.clockOut) {
      const updateElapsed = () => {
        const startDate = parseTimeToDate(todayAttendance.clockIn);
        if (!startDate) {
          setElapsedTime('00:00:00');
          return;
        }
        const now = new Date();
        const diff = now - startDate;
        setElapsedTime(formatDurationFromMs(diff));
      };

      updateElapsed();
      const intervalId = setInterval(updateElapsed, 1000);
      return () => clearInterval(intervalId);
    }

    setElapsedTime(null);
  }, [todayAttendance?.clockIn, todayAttendance?.clockOut]);

  const loadAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const firstDay = new Date(new Date().setDate(1)).toISOString().split('T')[0];

      const [todayRes, monthRes] = await Promise.all([
        fetch(`/api/attendance?start_date=${today}&end_date=${today}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`/api/attendance?start_date=${firstDay}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);

      const [todayData, monthData] = await Promise.all([
        todayRes.json(),
        monthRes.json()
      ]);

      setTodayAttendance(todayData.attendance?.[0] || null);
      setAttendance(monthData.attendance || []);
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClockIn = async () => {
    setClocking(true);
    try {
      const token = localStorage.getItem('token');
      const location = 'Office'; // Can be enhanced with geolocation

      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ location })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Clocked in successfully!');
        await loadAttendance();
      } else {
        toast.error(data.error || 'Failed to clock in');
      }
    } catch (error) {
      toast.error('Error clocking in');
    } finally {
      setClocking(false);
    }
  };

  const handleClockOut = async () => {
    setClocking(true);
    try {
      const token = localStorage.getItem('token');
      const location = 'Office'; // Can be enhanced with geolocation

      const response = await fetch('/api/attendance', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ location })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Clocked out successfully!');
        await loadAttendance();
      } else {
        toast.error(data.error || 'Failed to clock out');
      }
    } catch (error) {
      toast.error('Error clocking out');
    } finally {
      setClocking(false);
    }
  };

  const openEditModal = (record) => {
    setEditingRecord(record);
    setEditForm({
      clockIn: record.clockIn || '',
      clockOut: record.clockOut || ''
    });
  };

  const closeEditModal = () => {
    setEditingRecord(null);
    setEditForm({ clockIn: '', clockOut: '' });
  };

  const handleEditSubmit = async () => {
    if (!editingRecord) return;

    if (!editForm.clockIn) {
      toast.error('Clock in time is required');
      return;
    }

    let totalHours = null;
    if (editForm.clockOut) {
      const diff = calculateHoursDifference(editForm.clockIn, editForm.clockOut);
      if (diff === null || diff < 0) {
        toast.error('Clock out time must be after clock in time');
        return;
      }
      totalHours = diff;
    }

    setSavingEdit(true);
    try {
      const token = localStorage.getItem('token');
      const payload = {
        clock_in: editForm.clockIn
      };

      if (editForm.clockOut) {
        payload.clock_out = editForm.clockOut;
        payload.total_hours = totalHours;
      } else {
        payload.clock_out = null;
        payload.total_hours = null;
      }

      const response = await fetch(`/api/attendance/${editingRecord.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to update attendance');
      }

      toast.success('Attendance updated successfully');
      closeEditModal();
      await loadAttendance();
    } catch (error) {
      console.error('Update attendance error:', error);
      toast.error(error.message || 'Failed to update attendance');
    } finally {
      setSavingEdit(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="min-h-screen bg-codeat-dark flex items-center justify-center">
        <div className="text-codeat-accent text-xl">Loading...</div>
      </div>
    );
  }

  const canClockIn = !todayAttendance || !todayAttendance.clockIn;
  const canClockOut = todayAttendance && todayAttendance.clockIn && !todayAttendance.clockOut;
  const canEditAttendance = ['admin', 'hr'].includes(user.role);
  const previewTotalHours = editingRecord && editForm.clockIn && editForm.clockOut
    ? calculateHoursDifference(editForm.clockIn, editForm.clockOut)
    : null;

  return (
    <Layout user={user}>
      <div className="space-y-6 lg:space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-bold text-codeat-silver mb-2">Attendance</h1>
          <p className="text-codeat-gray text-lg">Manage your attendance and view history</p>
        </div>

        {/* Clock In/Out Card */}
        <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-codeat-silver mb-1">Today's Attendance</h2>
              <p className="text-codeat-gray text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div className="text-5xl opacity-20">⏰</div>
          </div>
          
          {todayAttendance ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 lg:gap-6">
                <div className="bg-codeat-dark/50 rounded-xl p-5 border border-codeat-muted/30">
                  <p className="text-codeat-gray text-sm font-medium mb-2 uppercase tracking-wide">Clock In</p>
                  <p className="text-codeat-accent text-2xl lg:text-3xl font-bold">
                    {todayAttendance.clockIn || 'Not clocked in'}
                  </p>
                </div>
                <div className="bg-codeat-dark/50 rounded-xl p-5 border border-codeat-muted/30">
                  <p className="text-codeat-gray text-sm font-medium mb-2 uppercase tracking-wide">Clock Out</p>
                  <p className="text-codeat-accent text-2xl lg:text-3xl font-bold">
                    {todayAttendance.clockOut || 'Not clocked out'}
                  </p>
                </div>
                {todayAttendance.clockIn && !todayAttendance.clockOut && (
                  <div className="bg-codeat-dark/50 rounded-xl p-5 border border-codeat-muted/30">
                    <p className="text-codeat-gray text-sm font-medium mb-2 uppercase tracking-wide">Live Timer</p>
                    <p className="text-codeat-accent text-2xl lg:text-3xl font-bold">
                      {elapsedTime || '00:00:00'}
                    </p>
                    <p className="text-codeat-gray text-xs mt-1">Counting from clock in</p>
                  </div>
                )}
                {todayAttendance.totalHours && (
                  <div className="bg-codeat-dark/50 rounded-xl p-5 border border-codeat-muted/30">
                    <p className="text-codeat-gray text-sm font-medium mb-2 uppercase tracking-wide">Total Hours</p>
                    <p className="text-codeat-accent text-2xl lg:text-3xl font-bold">
                      {todayAttendance.totalHours} hrs
                    </p>
                  </div>
                )}
              </div>
              {canEditAttendance && todayAttendance.clockIn && (
                <div className="flex justify-end">
                  <button
                    onClick={() => openEditModal(todayAttendance)}
                    className="px-4 py-2 text-sm font-semibold bg-codeat-dark border border-codeat-muted/40 text-codeat-silver rounded-lg hover:border-codeat-accent hover:text-codeat-accent transition-colors duration-200"
                  >
                    Edit Clock Times
                  </button>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                {canClockIn && (
                  <button
                    onClick={handleClockIn}
                    disabled={clocking}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 transition-all duration-300 font-semibold shadow-lg shadow-green-500/30 hover:shadow-green-500/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {clocking ? (
                      <>
                        <div className="spinner w-5 h-5"></div>
                        <span>Clocking In...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Clock In</span>
                      </>
                    )}
                  </button>
                )}
                {canClockOut && (
                  <button
                    onClick={handleClockOut}
                    disabled={clocking}
                    className="flex-1 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all duration-300 font-semibold shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
                  >
                    {clocking ? (
                      <>
                        <div className="spinner w-5 h-5"></div>
                        <span>Clocking Out...</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                        </svg>
                        <span>Clock Out</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-6xl mb-4 opacity-30">⏰</div>
              <p className="text-codeat-gray text-lg mb-6">No attendance record for today</p>
              <button
                onClick={handleClockIn}
                disabled={clocking}
                className="px-8 py-4 bg-gradient-to-r from-codeat-accent to-codeat-teal text-white rounded-xl hover:from-codeat-accent/90 hover:to-codeat-teal/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-accent/30 hover:shadow-codeat-accent/50 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2 mx-auto"
              >
                {clocking ? (
                  <>
                    <div className="spinner w-5 h-5"></div>
                    <span>Clocking In...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Clock In Now</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Attendance History */}
        <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-codeat-silver">This Month's Attendance</h2>
            <div className="h-1 flex-1 mx-4 bg-codeat-muted/30 rounded-full"></div>
          </div>
          <div className="table-container">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Date</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Clock In</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Clock Out</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Hours</th>
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Status</th>
                  {canEditAttendance && (
                    <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {attendance.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center">
                      <div className="text-codeat-gray text-lg mb-2">No attendance records found</div>
                      <p className="text-codeat-gray text-sm">Your attendance history will appear here</p>
                    </td>
                  </tr>
                ) : (
                  attendance.map((att) => (
                    <tr key={att.id} className="hover:bg-codeat-dark/40 transition-colors duration-200">
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-medium">
                        {new Date(att.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-mono text-sm">{att.clockIn || '-'}</td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-mono text-sm">{att.clockOut || '-'}</td>
                      <td className="px-4 sm:px-6 py-4 text-codeat-silver font-semibold">{att.totalHours ? `${att.totalHours} hrs` : '-'}</td>
                      <td className="px-4 sm:px-6 py-4">
                        <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${
                          att.status === 'present' 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : att.status === 'absent'
                            ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                            : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        }`}>
                          <span className={`w-2 h-2 rounded-full mr-2 ${
                            att.status === 'present' ? 'bg-green-400' :
                            att.status === 'absent' ? 'bg-red-400' :
                            'bg-yellow-400'
                          }`}></span>
                          {att.status.replace('_', ' ')}
                        </span>
                      </td>
                      {canEditAttendance && (
                        <td className="px-4 sm:px-6 py-4">
                          <button
                            onClick={() => openEditModal(att)}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-codeat-muted/40 text-codeat-silver hover:text-codeat-accent hover:border-codeat-accent transition-colors duration-200"
                          >
                            Edit
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-codeat-mid rounded-2xl border border-codeat-muted/40 p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-codeat-silver">Edit Attendance</h3>
                <p className="text-codeat-gray text-sm">{new Date(editingRecord.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
              </div>
              <button
                onClick={closeEditModal}
                className="text-codeat-gray hover:text-codeat-silver text-2xl leading-none"
                aria-label="Close edit modal"
                disabled={savingEdit}
              >
                &times;
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-codeat-gray mb-2">Clock In Time</label>
                <input
                  type="time"
                  value={editForm.clockIn}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, clockIn: e.target.value }))}
                  className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/40 rounded-lg text-codeat-silver focus:outline-none focus:border-codeat-accent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-codeat-gray mb-2">Clock Out Time</label>
                <input
                  type="time"
                  value={editForm.clockOut}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, clockOut: e.target.value }))}
                  className="w-full px-4 py-3 bg-codeat-dark border border-codeat-muted/40 rounded-lg text-codeat-silver focus:outline-none focus:border-codeat-accent"
                />
                <p className="text-codeat-gray text-xs mt-1">Leave empty to keep it blank.</p>
              </div>
              {previewTotalHours !== null && (
                <div className="bg-codeat-dark/40 rounded-xl p-4 border border-codeat-muted/30">
                  <p className="text-codeat-gray text-xs uppercase tracking-wide mb-1">Calculated Hours</p>
                  <p className={`text-2xl font-semibold ${previewTotalHours < 0 ? 'text-red-400' : 'text-codeat-accent'}`}>
                    {previewTotalHours >= 0
                      ? `${previewTotalHours} hrs`
                      : 'Invalid range'}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  onClick={handleEditSubmit}
                  disabled={savingEdit}
                  className="flex-1 px-5 py-3 bg-codeat-accent text-white rounded-xl font-semibold hover:bg-codeat-accent/90 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
                <button
                  onClick={closeEditModal}
                  disabled={savingEdit}
                  className="flex-1 px-5 py-3 bg-codeat-dark text-codeat-silver rounded-xl font-semibold border border-codeat-muted/40 hover:border-codeat-silver transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
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

