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

    const [types] = await pool.execute(
      'SELECT * FROM leave_types WHERE is_active = TRUE ORDER BY name'
    );

    return NextResponse.json({
      success: true,
      types: types.map(type => ({
        id: type.id,
        name: type.name,
        code: type.code,
        maxDays: type.max_days,
        isPaid: type.is_paid,
        description: type.description
      }))
    });
  } catch (error) {
    console.error('Get leave types error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

