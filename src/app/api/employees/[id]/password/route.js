import { NextResponse } from 'next/server';
import pool from '../../../../../../lib/db.js';
import { authorize, hashPassword } from '../../../../../../lib/auth.js';
import { logActivity } from '../../../../../../lib/logger.js';
import { ensureSchema } from '../../../../../../lib/ensureSchema.js';

export async function PUT(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const { password } = await req.json();
    if (!password || String(password).length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const [rows] = await pool.execute('SELECT user_id FROM employees WHERE id = ?', [id]);
    if (!rows.length) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const hashed = await hashPassword(password);
    await pool.execute(
      'UPDATE users SET password = ?, portal_password = ? WHERE id = ?',
      [hashed, password, rows[0].user_id]
    );

    await logActivity(authResult.user.id, 'admin_set_password', 'employee', id, 'Admin set a new login password', req);
    return NextResponse.json({ success: true, message: 'Password updated', loginPassword: password });
  } catch (error) {
    console.error('Admin set password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
