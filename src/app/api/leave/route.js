import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { 
  calculateDaysBetween, 
  calculateLeaveDays, 
  calculateLeaveHours,
  validateTimeRange 
} from '../../../../lib/utils.js';
import { logActivity } from '../../../../lib/logger.js';
import { sendLeaveApprovalEmail } from '../../../../lib/email.js';

// Get leave applications
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    const status = searchParams.get('status');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    let query = `
      SELECT la.*, e.first_name, e.last_name, e.employee_id,
             lt.name as leave_type_name, lt.code as leave_type_code,
             u.email as approved_by_email
      FROM leave_applications la
      JOIN employees e ON la.employee_id = e.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN users u ON la.approved_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-admin/hr can only see their own leaves
    if (user.role !== 'admin' && user.role !== 'hr') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length > 0) {
        query += ' AND la.employee_id = ?';
        params.push(userEmp[0].id);
      } else {
        return NextResponse.json({ success: true, leaves: [] });
      }
    } else if (employeeId) {
      query += ' AND la.employee_id = ?';
      params.push(employeeId);
    }

    if (status) {
      query += ' AND la.status = ?';
      params.push(status);
    }

    if (startDate) {
      query += ' AND la.start_date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND la.end_date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY la.applied_at DESC';

    const [leaves] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      leaves: leaves.map(leave => ({
        id: leave.id,
        employeeId: leave.employee_id,
        employeeName: `${leave.first_name} ${leave.last_name}`,
        employeeCode: leave.employee_id,
        leaveTypeId: leave.leave_type_id,
        leaveTypeName: leave.leave_type_name,
        leaveTypeCode: leave.leave_type_code,
        startDate: leave.start_date,
        endDate: leave.end_date,
        durationType: leave.duration_type || 'full_day',
        halfDaySlot: leave.half_day_slot || null,
        startTime: leave.start_time,
        endTime: leave.end_time,
        totalDays: leave.total_days,
        totalHours: leave.total_hours || 0,
        reason: leave.reason,
        status: leave.status,
        approvedBy: leave.approved_by,
        approvedByEmail: leave.approved_by_email,
        approvedAt: leave.approved_at,
        rejectionReason: leave.rejection_reason,
        attachment: leave.attachment,
        appliedAt: leave.applied_at,
        updatedAt: leave.updated_at
      }))
    });
  } catch (error) {
    console.error('Get leaves error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Apply for leave
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { 
      leaveTypeId, 
      startDate, 
      endDate, 
      durationType = 'full_day',
      halfDaySlot,
      startTime,
      endTime,
      reason, 
      attachment 
    } = await req.json();

    // Validation
    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Leave type, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Validate duration type
    if (!['full_day', 'half_day', 'hourly'].includes(durationType)) {
      return NextResponse.json(
        { error: 'Invalid duration type. Must be full_day, half_day, or hourly' },
        { status: 400 }
      );
    }

    // Validate time fields for half_day and hourly
    const halfDaySlots = {
      before_lunch: { start: '09:00', end: '13:00' },
      after_lunch: { start: '13:00', end: '17:00' }
    };

    let normalizedStartTime = startTime;
    let normalizedEndTime = endTime;

    if (durationType === 'half_day') {
      if (!halfDaySlot || !halfDaySlots[halfDaySlot]) {
        return NextResponse.json(
          { error: 'Please select Before Lunch or After Lunch for half-day leave' },
          { status: 400 }
        );
      }

      if (startDate !== endDate) {
        return NextResponse.json(
          { error: 'Half-day leaves must start and end on the same day' },
          { status: 400 }
        );
      }

      normalizedStartTime = halfDaySlots[halfDaySlot].start;
      normalizedEndTime = halfDaySlots[halfDaySlot].end;
    }

    if (durationType === 'hourly') {
      if (!startDate || !endDate || startDate !== endDate) {
        return NextResponse.json(
          { error: 'Hourly leaves can only be applied for a single day. Please use the same start and end date.' },
          { status: 400 }
        );
      }
    }

    if (durationType === 'half_day' || durationType === 'hourly') {
      if (!normalizedStartTime || !normalizedEndTime) {
        return NextResponse.json(
          { error: 'Start time and end time are required for half-day and hourly leaves' },
          { status: 400 }
        );
      }
      const timeValidation = validateTimeRange(normalizedStartTime, normalizedEndTime);
      if (!timeValidation.valid) {
        return NextResponse.json(
          { error: timeValidation.error },
          { status: 400 }
        );
      }
    }

    // Validate date range
    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    // Get employee
    const [employees] = await pool.execute(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    );

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const employeeId = employees[0].id;

    // Enforce monthly leave limit (1 per month, unused previous month adds one more slot)
    const requestedDate = new Date(startDate);
    const requestMonth = requestedDate.getMonth() + 1;
    const requestYear = requestedDate.getFullYear();

    const [currentMonthLeaves] = await pool.execute(
      `SELECT COUNT(*) as count 
       FROM leave_applications 
       WHERE employee_id = ? 
         AND YEAR(start_date) = ? 
         AND MONTH(start_date) = ?
         AND status IN ('pending', 'approved')`,
      [employeeId, requestYear, requestMonth]
    );

    const previousMonthDate = new Date(requestedDate);
    previousMonthDate.setMonth(previousMonthDate.getMonth() - 1);
    const prevMonth = previousMonthDate.getMonth() + 1;
    const prevYear = previousMonthDate.getFullYear();

    let carryForwardSlots = 0;
    if (prevMonth > 0) {
      const [previousMonthLeaves] = await pool.execute(
        `SELECT COUNT(*) as count 
         FROM leave_applications 
         WHERE employee_id = ? 
           AND YEAR(start_date) = ? 
           AND MONTH(start_date) = ?
           AND status = 'approved'`,
        [employeeId, prevYear, prevMonth]
      );

      if (previousMonthLeaves[0].count === 0) {
        carryForwardSlots = 1;
      }
    }

    const monthlyAllowance = 1 + carryForwardSlots;
    const currentMonthCount = currentMonthLeaves[0].count || 0;

    if (currentMonthCount >= monthlyAllowance) {
      return NextResponse.json(
        { 
          error: `You have already used your leave quota for ${requestedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}. Each month allows 1 leave, plus 1 carry-forward if you skipped the previous month.` 
        },
        { status: 400 }
      );
    }
    
    // Calculate leave days and hours
    const totalDays = calculateLeaveDays(durationType, startDate, endDate, normalizedStartTime, normalizedEndTime);
    const totalHours = calculateLeaveHours(durationType, startDate, endDate, normalizedStartTime, normalizedEndTime);

    if (totalDays <= 0 && totalHours <= 0) {
      return NextResponse.json(
        { error: 'Leave duration must be greater than zero' },
        { status: 400 }
      );
    }

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const [balance] = await pool.execute(
      `SELECT total_days, used_days, pending_days, total_hours, used_hours, pending_hours
       FROM leave_balance 
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      [employeeId, leaveTypeId, currentYear]
    );

    if (balance.length === 0) {
      return NextResponse.json(
        { error: 'Leave balance not found' },
        { status: 404 }
      );
    }

    const bal = balance[0];
    
    // Check balance based on duration type
    if (durationType === 'hourly') {
      const availableHours = (bal.total_hours || 0) - (bal.used_hours || 0) - (bal.pending_hours || 0);
      // Also check days balance (convert hours to days for comparison)
      const availableDays = bal.total_days - bal.used_days - bal.pending_days;
      const daysFromHours = totalHours / 8;
      
      if (totalHours > availableHours && daysFromHours > availableDays) {
        return NextResponse.json(
          { error: `Insufficient leave balance. Available: ${availableHours.toFixed(2)} hours or ${availableDays} days` },
          { status: 400 }
        );
      }
    } else {
      const availableDays = bal.total_days - bal.used_days - bal.pending_days;
      if (totalDays > availableDays) {
        return NextResponse.json(
          { error: `Insufficient leave balance. Available: ${availableDays} days` },
          { status: 400 }
        );
      }
    }

    // Create leave application
    const [result] = await pool.execute(
      `INSERT INTO leave_applications 
       (employee_id, leave_type_id, duration_type, half_day_slot, start_date, end_date, start_time, end_time, total_days, total_hours, reason, attachment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        employeeId, 
        leaveTypeId, 
        durationType,
        durationType === 'half_day' ? halfDaySlot : null,
        startDate, 
        endDate, 
        normalizedStartTime || null,
        normalizedEndTime || null,
        totalDays, 
        totalHours,
        reason, 
        attachment
      ]
    );

    // Update pending days/hours
    if (durationType === 'hourly') {
      await pool.execute(
        `UPDATE leave_balance 
         SET pending_hours = COALESCE(pending_hours, 0) + ?,
             pending_days = pending_days + ?
         WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [totalHours, totalDays, employeeId, leaveTypeId, currentYear]
      );
    } else {
      await pool.execute(
        `UPDATE leave_balance 
         SET pending_days = pending_days + ? 
         WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [totalDays, employeeId, leaveTypeId, currentYear]
      );
    }

    const leaveDescription = durationType === 'hourly' 
      ? `${totalHours.toFixed(2)} hours leave`
      : durationType === 'half_day'
      ? `${totalDays} half-day leave (${halfDaySlot?.replace('_', ' ')})`
      : `${totalDays} days leave`;

    await logActivity(user.id, 'apply_leave', 'leave', result.insertId, 
      `Applied for ${leaveDescription}`, req);

    return NextResponse.json({
      success: true,
      message: 'Leave application submitted successfully',
      leaveId: result.insertId
    });
  } catch (error) {
    console.error('Apply leave error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

