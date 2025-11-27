import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { calculateDaysBetween } from '../../../../../lib/utils.js';
import { logActivity } from '../../../../../lib/logger.js';

export async function PUT(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = params;
    const data = await req.json();

    const [existing] = await pool.execute('SELECT * FROM holidays WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Holiday not found' },
        { status: 404 }
      );
    }

    const holiday = existing[0];

    const title = data.title ?? holiday.title;
    const description = data.description ?? holiday.description;
    const startDate = data.startDate ?? holiday.start_date;
    const endDate = data.endDate ?? holiday.end_date;
    const isOptional = data.isOptional ?? holiday.is_optional;

    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, start date, and end date are required' },
        { status: 400 }
      );
    }

    if (new Date(endDate) < new Date(startDate)) {
      return NextResponse.json(
        { error: 'End date cannot be before start date' },
        { status: 400 }
      );
    }

    const totalDays = calculateDaysBetween(startDate, endDate);

    await pool.execute(
      `UPDATE holidays
       SET title = ?, description = ?, start_date = ?, end_date = ?, total_days = ?, is_optional = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [title, description || null, startDate, endDate, totalDays, Boolean(isOptional), id]
    );

    await logActivity(
      user.id,
      'update_holiday',
      'holiday',
      id,
      `Updated holiday ${title}`,
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Holiday updated successfully'
    });
  } catch (error) {
    console.error('Update holiday error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = params;

    const [existing] = await pool.execute('SELECT title FROM holidays WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Holiday not found' },
        { status: 404 }
      );
    }

    await pool.execute('DELETE FROM holidays WHERE id = ?', [id]);

    await logActivity(
      user.id,
      'delete_holiday',
      'holiday',
      id,
      `Deleted holiday ${existing[0].title}`,
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Delete holiday error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


