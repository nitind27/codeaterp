import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';
import { handleOptions, errorResponse, successResponse } from '../../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get today's attendance status for current user
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const { user } = authResult;

    // Get employee
    const [employees] = await pool.execute(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    );

    if (employees.length === 0) {
      return errorResponse('Employee record not found', 404);
    }

    const employeeId = employees[0].id;
    const today = new Date().toISOString().split('T')[0];

    // Get today's attendance
    const [attendance] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (attendance.length === 0) {
      return successResponse({
        hasClockedIn: false,
        hasClockedOut: false,
        attendance: null,
        date: today
      });
    }

    const att = attendance[0];

    return successResponse({
      hasClockedIn: !!att.clock_in,
      hasClockedOut: !!att.clock_out,
      attendance: {
        id: att.id,
        date: att.date,
        clockIn: att.clock_in,
        clockOut: att.clock_out,
        clockInLocation: att.clock_in_location,
        clockOutLocation: att.clock_out_location,
        totalHours: att.total_hours,
        status: att.status,
        notes: att.notes
      },
      date: today
    });
  } catch (error) {
    console.error('Flutter Get today attendance error:', error);
    return errorResponse('Internal server error', 500);
  }
}

