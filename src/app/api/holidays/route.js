import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { calculateDaysBetween } from '../../../../lib/utils.js';
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
    const year = searchParams.get('year');
    const upcoming = searchParams.get('upcoming');

    let query = `
      SELECT h.*, u.email as created_by_email
      FROM holidays h
      LEFT JOIN users u ON h.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    if (year) {
      query += ' AND YEAR(h.start_date) = ?';
      params.push(year);
    }

    if (upcoming === 'true') {
      query += ' AND h.end_date >= CURRENT_DATE()';
    }

    query += ' ORDER BY h.start_date ASC';

    const [holidays] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      holidays: holidays.map((holiday) => ({
        id: holiday.id,
        title: holiday.title,
        description: holiday.description,
        startDate: holiday.start_date,
        endDate: holiday.end_date,
        totalDays: holiday.total_days,
        isOptional: !!holiday.is_optional,
        createdBy: holiday.created_by,
        createdByEmail: holiday.created_by_email,
        createdAt: holiday.created_at,
        updatedAt: holiday.updated_at
      }))
    });
  } catch (error) {
    console.error('Get holidays error:', error);
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
    const { title, description, startDate, endDate, isOptional = false } = await req.json();

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

    const [result] = await pool.execute(
      `INSERT INTO holidays (title, description, start_date, end_date, total_days, is_optional, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description || null,
        startDate,
        endDate,
        totalDays,
        Boolean(isOptional),
        user.id
      ]
    );

    await logActivity(
      user.id,
      'create_holiday',
      'holiday',
      result.insertId,
      `Created holiday ${title} (${totalDays} days)`,
      req
    );

    return NextResponse.json({
      success: true,
      message: 'Holiday created successfully'
    });
  } catch (error) {
    console.error('Create holiday error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


