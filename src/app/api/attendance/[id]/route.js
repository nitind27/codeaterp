import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';

// Update attendance (Admin/HR only)
export async function PUT(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = await params;
    const data = await req.json();

    if (data.reset) {
      const scope = data.reset === true || data.reset === 'both' ? 'both' : data.reset;
      if (!['in', 'out', 'both'].includes(scope)) {
        return NextResponse.json({ error: 'Choose clock in, clock out, or both' }, { status: 400 });
      }

      const [rows] = await pool.execute(
        'SELECT clock_in, clock_out FROM attendance WHERE id = ?',
        [id]
      );
      if (rows.length === 0) {
        return NextResponse.json({ error: 'Attendance record not found' }, { status: 404 });
      }

      const row = rows[0];
      if (scope === 'in' && !row.clock_in) {
        return NextResponse.json({ error: 'There is no clock in time to reset' }, { status: 400 });
      }
      if (scope === 'out' && !row.clock_out) {
        return NextResponse.json({ error: 'There is no clock out time to reset' }, { status: 400 });
      }
      if (scope === 'both' && !row.clock_in && !row.clock_out) {
        return NextResponse.json({ error: 'Nothing to reset on this record' }, { status: 400 });
      }

      const note = {
        in: ' Clock in reset by admin.',
        out: ' Clock out reset by admin.',
        both: ' Clock in and clock out reset by admin.',
      }[scope];

      if (scope === 'in') {
        await pool.execute(
          `UPDATE attendance
           SET clock_in = NULL, clock_in_location = NULL, total_hours = NULL,
               status = IF(clock_out IS NULL, 'absent', status),
               notes = TRIM(CONCAT(IFNULL(notes, ''), ?)),
               updated_at = NOW()
           WHERE id = ?`,
          [note, id]
        );
      } else if (scope === 'out') {
        await pool.execute(
          `UPDATE attendance
           SET clock_out = NULL, clock_out_location = NULL, total_hours = NULL,
               status = 'present',
               notes = TRIM(CONCAT(IFNULL(notes, ''), ?)),
               updated_at = NOW()
           WHERE id = ?`,
          [note, id]
        );
      } else {
        await pool.execute(
          `UPDATE attendance
           SET clock_in = NULL, clock_out = NULL, clock_in_location = NULL, clock_out_location = NULL,
               total_hours = NULL, status = 'absent',
               notes = TRIM(CONCAT(IFNULL(notes, ''), ?)),
               updated_at = NOW()
           WHERE id = ?`,
          [note, id]
        );
      }

      const message = {
        in: 'Clock in reset. They can punch in again.',
        out: 'Clock out reset. They can punch out again.',
        both: 'Clock in and clock out reset. They can start the day again.',
      }[scope];

      await logActivity(authResult.user.id, 'reset_attendance', 'attendance', id, message, req);
      return NextResponse.json({ success: true, message });
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['clock_in', 'clock_out', 'clock_in_location', 'clock_out_location', 
                          'total_hours', 'status', 'notes'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbField} = ?`);
        updateValues.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(id);

    await pool.execute(
      `UPDATE attendance SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    await logActivity(authResult.user.id, 'update_attendance', 'attendance', id, 
      `Updated attendance record`, req);

    return NextResponse.json({
      success: true,
      message: 'Attendance updated successfully'
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

