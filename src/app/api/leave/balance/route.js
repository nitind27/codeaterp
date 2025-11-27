import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

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

    const targetEmployeeId = employeeId ? parseInt(employeeId) : employees[0].id;

    // Check permission
    if (user.role !== 'admin' && user.role !== 'hr' && employees[0].id !== targetEmployeeId) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const currentYear = new Date().getFullYear();
    const [balance] = await pool.execute(
      `SELECT lb.*, lt.name as leave_type_name, lt.code as leave_type_code, lt.max_days
       FROM leave_balance lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.employee_id = ? AND lb.year = ?`,
      [targetEmployeeId, currentYear]
    );

    return NextResponse.json({
      success: true,
      balance: balance.map(b => ({
        id: b.id,
        leaveTypeId: b.leave_type_id,
        leaveTypeName: b.leave_type_name,
        leaveTypeCode: b.leave_type_code,
        year: b.year,
        totalDays: b.total_days,
        usedDays: b.used_days,
        pendingDays: b.pending_days,
        availableDays: b.total_days - b.used_days - b.pending_days,
        totalHours: b.total_hours || 0,
        usedHours: b.used_hours || 0,
        pendingHours: b.pending_hours || 0,
        availableHours: (b.total_hours || 0) - (b.used_hours || 0) - (b.pending_hours || 0),
        maxDays: b.max_days
      }))
    });
  } catch (error) {
    console.error('Get leave balance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

