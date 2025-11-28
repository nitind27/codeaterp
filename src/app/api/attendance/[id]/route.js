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

    const { id } = params;
    const data = await req.json();

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

