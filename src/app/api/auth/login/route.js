import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { verifyPassword, generateToken, generateRefreshToken } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';
import crypto from 'crypto';

// Generate unique session token
const generateSessionToken = () => crypto.randomBytes(32).toString('hex');

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const [users] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (users.length === 0) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const user = users[0];

    if (!user.is_active) {
      return NextResponse.json({ error: 'Account is deactivated' }, { status: 403 });
    }

    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    // Single device session — invalidate previous session
    const previousSessionLoggedOut = !!user.session_token;
    const sessionToken = generateSessionToken();

    await pool.execute(
      'UPDATE users SET last_login = NOW(), session_token = ? WHERE id = ?',
      [sessionToken, user.id]
    );

    const token        = generateToken(user, sessionToken);
    const refreshToken = generateRefreshToken(user);

    const [employees] = await pool.execute(
      `SELECT e.*, u.email, u.role FROM employees e JOIN users u ON e.user_id = u.id WHERE e.user_id = ?`,
      [user.id]
    );
    const employee = employees[0] || null;

    await logActivity(user.id, 'login', 'user', user.id, 'User logged in', req);

    return NextResponse.json({
      success: true,
      token,
      refreshToken,
      sessionToken,
      previousSessionLoggedOut,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employee_id,
          firstName: employee.first_name,
          lastName: employee.last_name,
          department: employee.department,
          designation: employee.designation,
          avatar: employee.avatar,
        } : null,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
