'use client';

import { useState, useEffect } from 'react';
import Layout from '../../components/Layout';
import LogoLoader from '../../components/LogoLoader';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

const HALF_DAY_SLOTS = [
  { value: 'before_lunch', label: 'Before Lunch (09:00 - 13:00)', start: '09:00', end: '13:00' },
  { value: 'after_lunch', label: 'After Lunch (13:00 - 17:00)', start: '13:00', end: '17:00' }
];

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
    durationType: 'full_day',
    halfDaySlot: '',
    startTime: '',
    endTime: '',
    reason: ''
  });
  const [selectedLeaveType, setSelectedLeaveType] = useState(null);
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

      const normalizedTypes = (typesData.types || []).map((type) => {
        if (type.code === 'SL') {
          return {
            ...type,
            maxDays: 4,
            fixedDays: 4
          };
        }
        return type;
      });

      setLeaves(leavesData.leaves || []);
      setLeaveBalance(balanceData.balance || []);
      setLeaveTypes(normalizedTypes);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDayValue = (value) => {
    if (value === null || value === undefined) return '0';
    const num = Number(value);
    if (Number.isNaN(num)) return value;
    return Number.isInteger(num) ? num : num.toFixed(1);
  };

  const formatHourValue = (value) => {
    if (value === null || value === undefined) return '0.0';
    const num = Number(value);
    if (Number.isNaN(num)) return '0.0';
    return num.toFixed(1);
  };

  const getHalfDaySlotLabel = (slot) => {
    const found = HALF_DAY_SLOTS.find((item) => item.value === slot);
    return found ? found.label : '';
  };

  const handleHalfDaySlotChange = (slotValue) => {
    const slot = HALF_DAY_SLOTS.find((item) => item.value === slotValue);
    if (!slot) {
      setFormData((prev) => ({
        ...prev,
        halfDaySlot: '',
        startTime: '',
        endTime: ''
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      halfDaySlot: slotValue,
      startTime: slot.start,
      endTime: slot.end,
      endDate: prev.startDate || prev.endDate
    }));
  };

  const handleApplyLeave = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.leaveTypeId || !formData.startDate || !formData.endDate) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error('End date cannot be before start date');
      return;
    }

    if (formData.durationType === 'half_day') {
      if (!formData.halfDaySlot) {
        toast.error('Please select Before Lunch or After Lunch for half-day leave');
        return;
      }

      if (formData.startDate !== formData.endDate) {
        toast.error('Half-day leaves must start and end on the same day');
        return;
      }
    }

    if (formData.durationType === 'hourly' && (!formData.startTime || !formData.endTime)) {
      toast.error('Start time and end time are required for hourly leaves');
      return;
    }

    if (formData.startTime && formData.endTime && formData.durationType === 'hourly') {
      const start = new Date(`2000-01-01T${formData.startTime}`);
      const end = new Date(`2000-01-01T${formData.endTime}`);
      if (end <= start) {
        toast.error('End time must be after start time');
        return;
      }
    }

    // For hourly leaves, ensure single day
    if ((formData.durationType === 'hourly' || formData.durationType === 'half_day') && formData.startDate !== formData.endDate) {
      toast.error('Hourly leaves can only be applied for a single day. Please use the same start and end date.');
      return;
    }

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
        setFormData({ 
          leaveTypeId: '', 
          startDate: '', 
          endDate: '', 
          durationType: 'full_day',
          halfDaySlot: '',
          startTime: '',
          endTime: '',
          reason: '' 
        });
        setSelectedLeaveType(null);
        await loadData();
      } else {
        toast.error(data.error || 'Failed to apply leave');
      }
    } catch (error) {
      toast.error('Error applying leave');
    }
  };

  if (loading || !user) {
    return <LogoLoader />;
  }

  const selectableLeaveTypes = leaveTypes.filter((type) => type.code !== 'EL');

  const today = new Date();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();
  const currentMonthLabel = today.toLocaleString('default', { month: 'long', year: 'numeric' });
  const policyStatuses = ['pending', 'approved'];

  const currentMonthUsage = leaves.filter((leave) => {
    const start = new Date(leave.startDate);
    return (
      start.getMonth() === currentMonth &&
      start.getFullYear() === currentYear &&
      policyStatuses.includes(leave.status)
    );
  }).length;

  const previousMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const previousMonthLabel = previousMonthDate.toLocaleString('default', { month: 'long' });
  const previousMonthApproved = leaves.some((leave) => {
    const start = new Date(leave.startDate);
    return (
      start.getMonth() === previousMonthDate.getMonth() &&
      start.getFullYear() === previousMonthDate.getFullYear() &&
      leave.status === 'approved'
    );
  });

  const monthlyAllowance = 1 + (previousMonthApproved ? 0 : 1);
  const remainingSlots = Math.max(monthlyAllowance - currentMonthUsage, 0);

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
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Apply for Leave
            </button>
          )}
        </div>

        {/* Monthly Policy */}
        <div className="bg-codeat-mid/70 border border-codeat-muted/30 rounded-2xl p-5 lg:p-6 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-codeat-accent/10 text-codeat-accent flex items-center justify-center font-semibold">
              1x
            </div>
            <div>
              <p className="text-codeat-silver font-semibold text-lg">Monthly Leave Policy</p>
              <p className="text-codeat-gray text-sm">
                Only one leave per calendar month. If you skipped {previousMonthLabel}, you unlock one extra slot for the next month automatically.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm text-codeat-gray">
            <span className="px-3 py-1 rounded-full bg-codeat-dark/60 border border-codeat-muted/40 text-codeat-silver">
              {currentMonthLabel}: {remainingSlots} of {monthlyAllowance} slots available
            </span>
            <span className="px-3 py-1 rounded-full bg-codeat-dark/60 border border-codeat-muted/40">
              Carry-forward {previousMonthApproved ? 'used' : 'available'}
            </span>
          </div>
        </div>

        {/* Leave Balance */}
        <div className="bg-codeat-mid rounded-2xl p-6 lg:p-8 border border-codeat-muted/30 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-codeat-silver">Leave Balance</h2>
            <div className="h-1 flex-1 mx-4 bg-codeat-muted/30 rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {leaveBalance.map((balance) => {
              const availableHours = Number(balance.availableHours || 0);
              const pendingHours = Number(balance.pendingHours || 0);
              return (
                <div key={balance.id} className="bg-gradient-to-br from-codeat-dark to-codeat-dark/80 rounded-xl p-5 lg:p-6 border border-codeat-muted/30 shadow-lg hover:shadow-xl transition-all duration-300 card-hover">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-codeat-gray text-sm font-semibold uppercase tracking-wide">{balance.leaveTypeName}</p>
                    <span className="text-codeat-gray text-xs font-mono">{balance.leaveTypeCode}</span>
                  </div>
                  <p className="text-codeat-accent text-4xl lg:text-5xl font-bold mb-2">
                    {formatDayValue(balance.availableDays)}
                    {availableHours > 0 && (
                      <span className="text-lg lg:text-xl text-codeat-gray ml-2">
                        ({formatHourValue(availableHours)}h)
                      </span>
                    )}
                  </p>
                  <div className="pt-3 border-t border-codeat-muted/30">
                    <p className="text-codeat-gray text-xs">
                      <span className="text-codeat-silver font-semibold">{formatDayValue(balance.usedDays)}</span> used / <span className="text-codeat-silver font-semibold">{formatDayValue(balance.totalDays)}</span> total
                      {balance.maxDays > 0 && (
                        <span className="text-codeat-gray ml-2">(Fixed: {balance.maxDays} days)</span>
                      )}
                    </p>
                    {balance.pendingDays > 0 && (
                      <p className="text-yellow-400 text-xs mt-1">
                        {formatDayValue(balance.pendingDays)} days pending
                        {pendingHours > 0 && ` (${formatHourValue(pendingHours)}h)`}
                      </p>
                    )}
                    {availableHours > 0 && availableHours !== Number(balance.availableDays || 0) * 8 && (
                      <p className="text-codeat-gray text-xs mt-1">
                        {formatHourValue(availableHours)} hours available
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
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
                    onClick={() => {
                      setShowApplyForm(false);
                      setFormData({ 
                        leaveTypeId: '', 
                        startDate: '', 
                        endDate: '', 
                        durationType: 'full_day',
                        halfDaySlot: '',
                        startTime: '',
                        endTime: '',
                        reason: '' 
                      });
                      setSelectedLeaveType(null);
                    }}
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
                    onChange={(e) => {
                      const selectedId = parseInt(e.target.value);
                      const selected = selectableLeaveTypes.find((t) => t.id === selectedId) || null;
                      setSelectedLeaveType(selected);
                      setFormData({ ...formData, leaveTypeId: e.target.value });
                    }}
                    className="input-field"
                    required
                  >
                    <option value="">Select leave type</option>
                    {selectableLeaveTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name} ({type.code}) {type.fixedDays > 0 ? `- ${type.fixedDays} days` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedLeaveType && selectedLeaveType.fixedDays > 0 && (
                    <p className="text-codeat-gray text-xs mt-1.5">
                      Fixed days: <span className="text-codeat-accent font-semibold">{selectedLeaveType.fixedDays} days</span>
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                    Duration Type <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={formData.durationType}
                    onChange={(e) => {
                      const newDurationType = e.target.value;
                      const shouldLockEndDate = ['hourly', 'half_day'].includes(newDurationType);
                      const newEndDate = shouldLockEndDate && formData.startDate 
                        ? formData.startDate 
                        : formData.endDate;

                      setFormData((prev) => ({
                        ...prev,
                        durationType: newDurationType,
                        startTime: newDurationType === 'full_day' ? '' : newDurationType === 'half_day' ? '' : prev.startTime,
                        endTime: newDurationType === 'full_day' ? '' : newDurationType === 'half_day' ? '' : prev.endTime,
                        halfDaySlot: newDurationType === 'half_day' ? '' : '',
                        endDate: newEndDate
                      }));
                    }}
                    className="input-field"
                    required
                  >
                    <option value="full_day">Full Day</option>
                    <option value="half_day">Half Day</option>
                    <option value="hourly">Hourly</option>
                  </select>
                  <p className="text-codeat-gray text-xs mt-1.5">
                    {formData.durationType === 'full_day' && 'Full day leave (8 hours)'}
                    {formData.durationType === 'half_day' && 'Half day leave (4 hours)'}
                    {formData.durationType === 'hourly' && 'Hourly leave (flexible hours)'}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                      Start Date <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) => {
                        const newStartDate = e.target.value;
                        const lockEndDate = ['hourly', 'half_day'].includes(formData.durationType);
                        const newEndDate = lockEndDate
                          ? newStartDate
                          : (formData.endDate && newStartDate > formData.endDate 
                            ? newStartDate 
                            : formData.endDate);
                        
                        setFormData({ 
                          ...formData, 
                          startDate: newStartDate,
                          endDate: newEndDate
                        });
                      }}
                      min={new Date().toISOString().split('T')[0]}
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
                      onChange={(e) => {
                        if (['hourly', 'half_day'].includes(formData.durationType) && formData.startDate) {
                          setFormData({ ...formData, endDate: formData.startDate });
                        } else {
                          setFormData({ ...formData, endDate: e.target.value });
                        }
                      }}
                      min={formData.startDate || new Date().toISOString().split('T')[0]}
                      max={['hourly', 'half_day'].includes(formData.durationType) ? formData.startDate : undefined}
                      disabled={['hourly', 'half_day'].includes(formData.durationType) && formData.startDate ? true : false}
                      className="input-field"
                      required
                    />
                  </div>
                </div>
                {formData.durationType === 'half_day' && (
                  <div>
                    <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                      Half Day Slot <span className="text-red-400">*</span>
                    </label>
                    <select
                      value={formData.halfDaySlot}
                      onChange={(e) => handleHalfDaySlotChange(e.target.value)}
                      className="input-field"
                      required
                    >
                      <option value="">Select slot</option>
                      {HALF_DAY_SLOTS.map((slot) => (
                        <option key={slot.value} value={slot.value}>
                          {slot.label}
                        </option>
                      ))}
                    </select>
                    {formData.halfDaySlot && (() => {
                      const slot = HALF_DAY_SLOTS.find((item) => item.value === formData.halfDaySlot);
                      return slot ? (
                        <p className="text-codeat-gray text-xs mt-1.5">
                          Timing: {slot.start} - {slot.end}
                        </p>
                      ) : null;
                    })()}
                  </div>
                )}
                {formData.durationType === 'hourly' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
                    <div>
                      <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                        Start Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.startTime}
                        onChange={(e) => {
                          const newStartTime = e.target.value;
                          if (formData.endTime && newStartTime >= formData.endTime) {
                            const [hours, minutes] = newStartTime.split(':');
                            const endTime = `${String((parseInt(hours, 10) + 1) % 24).padStart(2, '0')}:${minutes}`;
                            setFormData({ ...formData, startTime: newStartTime, endTime });
                          } else {
                            setFormData({ ...formData, startTime: newStartTime });
                          }
                        }}
                        className="input-field"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-codeat-silver text-sm font-semibold mb-2.5">
                        End Time <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="time"
                        value={formData.endTime}
                        onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                        min={formData.startTime}
                        className="input-field"
                        required
                      />
                      {formData.startTime && formData.endTime && (
                        <p className="text-codeat-gray text-xs mt-1.5">
                          Duration: {(() => {
                            const start = new Date(`2000-01-01T${formData.startTime}`);
                            const end = new Date(`2000-01-01T${formData.endTime}`);
                            const diffMs = end - start;
                            const diffHours = diffMs / (1000 * 60 * 60);
                            return diffHours > 0 ? `${diffHours.toFixed(2)} hours` : 'Invalid time range';
                          })()}
                        </p>
                      )}
                    </div>
                  </div>
                )}
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
                    className="flex-1 px-6 py-3.5 bg-gradient-to-r from-codeat-teal to-codeat-accent text-white rounded-xl hover:from-codeat-teal/90 hover:to-codeat-accent/90 transition-all duration-300 font-semibold shadow-lg shadow-codeat-teal/30 hover:shadow-codeat-teal/50 hover:scale-105 active:scale-95"
                  >
                    Submit Application
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowApplyForm(false);
                      setFormData({ 
                        leaveTypeId: '', 
                        startDate: '', 
                        endDate: '', 
                        durationType: 'full_day',
                        halfDaySlot: '',
                        startTime: '',
                        endTime: '',
                        reason: '' 
                      });
                      setSelectedLeaveType(null);
                    }}
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
                  <th className="px-4 sm:px-6 py-4 text-left text-codeat-silver font-semibold text-xs sm:text-sm uppercase tracking-wider">Duration</th>
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
                        {leave.startTime && leave.endTime && (
                          <span className="block text-codeat-gray text-xs mt-1">
                            {leave.startTime} - {leave.endTime}
                          </span>
                        )}
                      </td>
                      <td className="px-4 sm:px-6 py-4">
                        <div className="text-codeat-accent font-bold">
                          {(() => {
                            const totalHours = Number(leave.totalHours || 0);
                            if (leave.durationType === 'hourly' && totalHours > 0) {
                              return <span>{totalHours.toFixed(2)} hours</span>;
                            }
                            if (leave.durationType === 'half_day') {
                              return <span>{formatDayValue(leave.totalDays)} half-day</span>;
                            }
                            return (
                              <span>
                                {formatDayValue(leave.totalDays)} {Number(leave.totalDays) === 1 ? 'day' : 'days'}
                              </span>
                            );
                          })()}
                        </div>
                        <div className="text-codeat-gray text-xs capitalize space-y-0.5">
                          {leave.durationType && (
                            <span>({leave.durationType.replace('_', ' ')})</span>
                          )}
                          {leave.durationType === 'half_day' && leave.halfDaySlot && (
                            <span>{getHalfDaySlotLabel(leave.halfDaySlot)}</span>
                          )}
                        </div>
                      </td>
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

