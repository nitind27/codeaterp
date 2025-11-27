import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    const year = searchParams.get('year');

    let query = `
      SELECT a.*, 
             e.first_name, e.last_name, e.employee_id,
             u.email as created_by_email
      FROM achievements a
      LEFT JOIN employees e ON a.employee_id = e.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (employeeId) {
      query += ' AND a.employee_id = ?';
      params.push(employeeId);
    }

    if (year) {
      query += ' AND YEAR(a.awarded_on) = ?';
      params.push(year);
    }

    query += ' ORDER BY a.awarded_on DESC, a.created_at DESC';

    const [achievements] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      achievements: achievements.map((achievement) => ({
        id: achievement.id,
        employeeId: achievement.employee_id,
        employeeName: achievement.first_name && achievement.last_name
          ? `${achievement.first_name} ${achievement.last_name}`
          : null,
        employeeCode: achievement.employee_id ? achievement.employee_id : null,
        title: achievement.title,
        description: achievement.description,
        awardedOn: achievement.awarded_on,
        badgeColor: achievement.badge_color,
        points: achievement.points,
        attachment: achievement.attachment,
        createdBy: achievement.created_by,
        createdByEmail: achievement.created_by_email,
        createdAt: achievement.created_at,
        updatedAt: achievement.updated_at
      }))
    });
  } catch (error) {
    console.error('Get achievements error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { employeeId, title, description, awardedOn, badgeColor, points = 0, attachment } = await req.json();

    if (!title || !awardedOn) {
      return NextResponse.json(
        { error: 'Title and award date are required' },
        { status: 400 }
      );
    }

    let targetEmployeeId = null;
    if (employeeId) {
      const [employee] = await pool.execute(
        'SELECT id FROM employees WHERE id = ?',
        [employeeId]
      );
      if (employee.length === 0) {
        return NextResponse.json(
          { error: 'Invalid employee selected' },
          { status: 400 }
        );
      }
      targetEmployeeId = employeeId;
    }

    const [result] = await pool.execute(
      `INSERT INTO achievements
       (employee_id, title, description, awarded_on, badge_color, points, attachment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        targetEmployeeId,
        title,
        description || null,
        awardedOn,
        badgeColor || null,
        points || 0,
        attachment || null,
        user.id
      ]
    );

    await logActivity(
      user.id,
      'create_achievement',
      'achievement',
      result.insertId,
      `Awarded ${title}${targetEmployeeId ? ` to employee ${targetEmployeeId}` : ''}`,
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Achievement created successfully'
    });
  } catch (error) {
    console.error('Create achievement error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


