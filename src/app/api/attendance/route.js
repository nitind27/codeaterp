import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

// Get attendance records
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
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');

    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_id,
             u.email, u.role
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-admin/hr/pm can only see their own attendance
    if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'project_manager') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length > 0) {
        query += ' AND a.employee_id = ?';
        params.push(userEmp[0].id);
      } else {
        return NextResponse.json({ success: true, attendance: [] });
      }
    } else if (employeeId) {
      query += ' AND a.employee_id = ?';
      params.push(employeeId);
    }

    if (startDate) {
      query += ' AND a.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND a.date <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    query += ' ORDER BY a.date DESC, a.created_at DESC';

    const [attendance] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      attendance: attendance.map(att => ({
        id: att.id,
        employeeId: att.employee_id,
        employeeName: `${att.first_name} ${att.last_name}`,
        employeeCode: att.employee_id,
        date: att.date,
        clockIn: att.clock_in,
        clockOut: att.clock_out,
        clockInLocation: att.clock_in_location,
        clockOutLocation: att.clock_out_location,
        totalHours: att.total_hours,
        status: att.status,
        notes: att.notes,
        createdAt: att.created_at,
        updatedAt: att.updated_at
      }))
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Clock in
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
    const { location } = await req.json();

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
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Check if already clocked in today
    const [existing] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (existing.length > 0 && existing[0].clock_in) {
      return NextResponse.json(
        { error: 'Already clocked in today' },
        { status: 400 }
      );
    }

    if (existing.length > 0) {
      // Update existing record
      await pool.execute(
        `UPDATE attendance 
         SET clock_in = ?, clock_in_location = ?, status = 'present', updated_at = NOW()
         WHERE id = ?`,
        [now, location, existing[0].id]
      );
    } else {
      // Create new record
      await pool.execute(
        `INSERT INTO attendance (employee_id, date, clock_in, clock_in_location, status)
         VALUES (?, ?, ?, ?, 'present')`,
        [employeeId, today, now, location]
      );
    }

    await logActivity(user.id, 'clock_in', 'attendance', employeeId, 
      `Clocked in at ${now}`, req);

    return NextResponse.json({
      success: true,
      message: 'Clocked in successfully',
      time: now
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Clock out
export async function PUT(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { location } = await req.json();

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
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Get today's attendance
    const [attendance] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (attendance.length === 0 || !attendance[0].clock_in) {
      return NextResponse.json(
        { error: 'Please clock in first' },
        { status: 400 }
      );
    }

    if (attendance[0].clock_out) {
      return NextResponse.json(
        { error: 'Already clocked out today' },
        { status: 400 }
      );
    }

    // Calculate total hours
    const clockIn = attendance[0].clock_in;
    const clockInTime = new Date(`2000-01-01T${clockIn}`);
    const clockOutTime = new Date(`2000-01-01T${now}`);
    const diffMs = clockOutTime - clockInTime;
    const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    await pool.execute(
      `UPDATE attendance 
       SET clock_out = ?, clock_out_location = ?, total_hours = ?, updated_at = NOW()
       WHERE id = ?`,
      [now, location, totalHours, attendance[0].id]
    );

    await logActivity(user.id, 'clock_out', 'attendance', employeeId, 
      `Clocked out at ${now}`, req);

    return NextResponse.json({
      success: true,
      message: 'Clocked out successfully',
      time: now,
      totalHours: parseFloat(totalHours)
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

