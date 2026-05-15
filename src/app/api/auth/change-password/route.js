import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate, hashPassword, verifyPassword } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';

export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Current and new password are required' }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    // Get current password hash
    const [users] = await pool.execute('SELECT password FROM users WHERE id = ?', [user.id]);
    if (users.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const isValid = await verifyPassword(currentPassword, users[0].password);
    if (!isValid) {
      return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await pool.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

    await logActivity(user.id, 'change_password', 'user', user.id, 'Changed password', req);

    return NextResponse.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
