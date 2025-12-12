import pool from '../../../../../lib/db.js';
import { authenticate, authorize } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';
import { handleOptions, errorResponse, successResponse } from '../../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get single attendance record
export async function GET(req, { params }) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { id } = params;

    const [attendance] = await pool.execute(
      `SELECT a.*, e.first_name, e.last_name, e.employee_id,
              u.email, u.role
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE a.id = ?`,
      [id]
    );

    if (attendance.length === 0) {
      return errorResponse('Attendance record not found', 404);
    }

    const att = attendance[0];

    return successResponse({
      attendance: {
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
      }
    });
  } catch (error) {
    console.error('Flutter Get attendance error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Update attendance (admin/hr only)
export async function PUT(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { id } = params;
    const data = await req.json();
    const { status, notes, clockIn, clockOut } = data;

    const [existing] = await pool.execute(
      'SELECT * FROM attendance WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return errorResponse('Attendance record not found', 404);
    }

    const updateFields = [];
    const updateValues = [];

    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    if (notes !== undefined) {
      updateFields.push('notes = ?');
      updateValues.push(notes);
    }

    if (clockIn) {
      updateFields.push('clock_in = ?');
      updateValues.push(clockIn);
    }

    if (clockOut) {
      updateFields.push('clock_out = ?');
      updateValues.push(clockOut);

      // Recalculate total hours if both clock in and out are set
      const existingClockIn = clockIn || existing[0].clock_in;
      if (existingClockIn) {
        const clockInTime = new Date(`2000-01-01T${existingClockIn}`);
        const clockOutTime = new Date(`2000-01-01T${clockOut}`);
        const diffMs = clockOutTime - clockInTime;
        const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);
        updateFields.push('total_hours = ?');
        updateValues.push(totalHours);
      }
    }

    if (updateFields.length === 0) {
      return errorResponse('No valid fields to update', 400);
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await pool.execute(
      `UPDATE attendance SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    await logActivity(authResult.user.id, 'update_attendance', 'attendance', id, 
      `Updated attendance via Flutter`, req);

    return successResponse({
      message: 'Attendance updated successfully'
    });
  } catch (error) {
    console.error('Flutter Update attendance error:', error);
    return errorResponse('Internal server error', 500);
  }
}

