// Utility functions

export function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function formatDateTime(date) {
  if (!date) return '';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function formatTime(time) {
  if (!time) return '';
  return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function calculateDaysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end - start);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays + 1; // Include both start and end dates
}

export function calculateHoursBetween(startTime, endTime) {
  if (!startTime || !endTime) return 0;
  const start = new Date(`2000-01-01T${startTime}`);
  const end = new Date(`2000-01-01T${endTime}`);
  const diffMs = end - start;
  const diffHours = diffMs / (1000 * 60 * 60);
  return Math.max(0, diffHours); // Return 0 if end is before start
}

export function calculateLeaveDays(durationType, startDate, endDate, startTime, endTime) {
  if (durationType === 'full_day') {
    return calculateDaysBetween(startDate, endDate);
  } else if (durationType === 'half_day') {
    return calculateDaysBetween(startDate, endDate) * 0.5;
  } else if (durationType === 'hourly') {
    const days = calculateDaysBetween(startDate, endDate);
    if (days === 1 && startTime && endTime) {
      const hours = calculateHoursBetween(startTime, endTime);
      return hours / 8; // Convert hours to days (assuming 8 hours per day)
    }
    // For multi-day hourly leaves, calculate based on hours
    return days; // Will be overridden by total_hours calculation
  }
  return 0;
}

export function calculateLeaveHours(durationType, startDate, endDate, startTime, endTime) {
  if (durationType === 'hourly') {
    if (startTime && endTime) {
      return calculateHoursBetween(startTime, endTime);
    }
    // If no time provided, calculate based on days (8 hours per day)
    const days = calculateDaysBetween(startDate, endDate);
    return days * 8;
  } else if (durationType === 'half_day') {
    return 4; // Half day is 4 hours
  }
  return 0; // Full day leaves don't use hours
}

export function validateTimeRange(startTime, endTime) {
  if (!startTime || !endTime) return { valid: false, error: 'Start time and end time are required' };
  const hours = calculateHoursBetween(startTime, endTime);
  if (hours <= 0) {
    return { valid: false, error: 'End time must be after start time' };
  }
  if (hours > 24) {
    return { valid: false, error: 'Time range cannot exceed 24 hours' };
  }
  return { valid: true };
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validatePhone(phone) {
  const re = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return re.test(phone);
}

export function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  return input.trim().replace(/[<>]/g, '');
}

export function generateEmployeeId() {
  const prefix = 'EMP';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

export function generateProjectCode(name) {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  const timestamp = Date.now().toString().slice(-6);
  return `${prefix}${timestamp}`;
}

export function getStatusColor(status) {
  const colors = {
    active: 'bg-green-500',
    inactive: 'bg-gray-500',
    pending: 'bg-yellow-500',
    approved: 'bg-green-500',
    rejected: 'bg-red-500',
    cancelled: 'bg-gray-500',
    open: 'bg-blue-500',
    in_progress: 'bg-yellow-500',
    resolved: 'bg-green-500',
    closed: 'bg-gray-500',
    todo: 'bg-gray-500',
    done: 'bg-green-500',
    planning: 'bg-blue-500',
    completed: 'bg-green-500',
    on_hold: 'bg-yellow-500'
  };
  return colors[status] || 'bg-gray-500';
}

export function getPriorityColor(priority) {
  const colors = {
    low: 'bg-blue-500',
    medium: 'bg-yellow-500',
    high: 'bg-orange-500',
    urgent: 'bg-red-500'
  };
  return colors[priority] || 'bg-gray-500';
}

