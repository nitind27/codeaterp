import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// Returns all active users as DM contacts — accessible by every role
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const [rows] = await pool.execute(
      `SELECT
         u.id,
         u.role,
         COALESCE(CONCAT(e.first_name, ' ', e.last_name), u.email) AS name,
         e.designation,
         e.department
       FROM users u
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE u.is_active = TRUE
         AND u.id != ?
       ORDER BY name ASC`,
      [authResult.user.id]
    );

    return NextResponse.json({ success: true, contacts: rows });
  } catch (error) {
    console.error('Contacts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
