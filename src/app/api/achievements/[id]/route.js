import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
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

    const [existing] = await pool.execute('SELECT * FROM achievements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    const achievement = existing[0];

    let targetEmployeeId = data.employeeId ?? achievement.employee_id;
    if (targetEmployeeId) {
      const [employee] = await pool.execute(
        'SELECT id FROM employees WHERE id = ?',
        [targetEmployeeId]
      );
      if (employee.length === 0) {
        return NextResponse.json(
          { error: 'Invalid employee selected' },
          { status: 400 }
        );
      }
    } else {
      targetEmployeeId = null;
    }

    const title = data.title ?? achievement.title;
    const description = data.description ?? achievement.description;
    const awardedOn = data.awardedOn ?? achievement.awarded_on;
    const badgeColor = data.badgeColor ?? achievement.badge_color;
    const points = data.points ?? achievement.points;
    const attachment = data.attachment ?? achievement.attachment;

    if (!title || !awardedOn) {
      return NextResponse.json(
        { error: 'Title and award date are required' },
        { status: 400 }
      );
    }

    await pool.execute(
      `UPDATE achievements
       SET employee_id = ?, title = ?, description = ?, awarded_on = ?, badge_color = ?, points = ?, attachment = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [targetEmployeeId, title, description || null, awardedOn, badgeColor || null, points || 0, attachment || null, id]
    );

    await logActivity(
      user.id,
      'update_achievement',
      'achievement',
      id,
      `Updated achievement ${title}`,
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Achievement updated successfully'
    });
  } catch (error) {
    console.error('Update achievement error:', error);
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

    const [existing] = await pool.execute('SELECT title FROM achievements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return NextResponse.json(
        { error: 'Achievement not found' },
        { status: 404 }
      );
    }

    await pool.execute('DELETE FROM achievements WHERE id = ?', [id]);

    await logActivity(
      user.id,
      'delete_achievement',
      'achievement',
      id,
      `Deleted achievement ${existing[0].title}`,
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Achievement deleted successfully'
    });
  } catch (error) {
    console.error('Delete achievement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


