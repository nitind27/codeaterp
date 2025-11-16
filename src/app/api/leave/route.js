import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { calculateDaysBetween } from '../../../../lib/utils.js';
import { logActivity } from '../../../../lib/logger.js';
import { sendLeaveApprovalEmail } from '../../../../lib/email.js';

// Get leave applications
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
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
        totalDays: leave.total_days,
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
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { leaveTypeId, startDate, endDate, reason, attachment } = await req.json();

    if (!leaveTypeId || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Leave type, start date, and end date are required' },
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
    const totalDays = calculateDaysBetween(startDate, endDate);

    // Check leave balance
    const currentYear = new Date().getFullYear();
    const [balance] = await pool.execute(
      `SELECT total_days, used_days, pending_days 
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

    const availableDays = balance[0].total_days - balance[0].used_days - balance[0].pending_days;
    if (totalDays > availableDays) {
      return NextResponse.json(
        { error: 'Insufficient leave balance' },
        { status: 400 }
      );
    }

    // Create leave application
    const [result] = await pool.execute(
      `INSERT INTO leave_applications 
       (employee_id, leave_type_id, start_date, end_date, total_days, reason, attachment, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [employeeId, leaveTypeId, startDate, endDate, totalDays, reason, attachment]
    );

    // Update pending days
    await pool.execute(
      `UPDATE leave_balance 
       SET pending_days = pending_days + ? 
       WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
      [totalDays, employeeId, leaveTypeId, currentYear]
    );

    await logActivity(user.id, 'apply_leave', 'leave', result.insertId, 
      `Applied for ${totalDays} days leave`, req);

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

