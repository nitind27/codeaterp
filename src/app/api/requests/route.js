import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';
import { ensureSchema } from '../../../../lib/ensureSchema.js';

const mapRow = (row) => ({
  id: row.id,
  employeeId: row.employee_id,
  employeeName: `${row.first_name} ${row.last_name}`,
  employeeCode: row.employee_code,
  type: row.request_type,
  subject: row.subject,
  details: row.details,
  status: row.status,
  adminNote: row.admin_note,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export async function GET(req) {
  try {
    await ensureSchema();
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    let query = `
      SELECT r.*, e.first_name, e.last_name, e.employee_id AS employee_code
      FROM portal_requests r
      JOIN employees e ON r.employee_id = e.id
      WHERE 1=1
    `;
    const params = [];

    if (!['admin', 'hr'].includes(user.role)) {
      const [emp] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
      if (!emp.length) return NextResponse.json({ success: true, requests: [] });
      query += ' AND r.employee_id = ?';
      params.push(emp[0].id);
    }

    query += ' ORDER BY r.created_at DESC';
    const [rows] = await pool.execute(query, params);
    return NextResponse.json({ success: true, requests: rows.map(mapRow) });
  } catch (error) {
    console.error('Get requests error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await ensureSchema();
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { type, subject, details } = await req.json();
    if (!type || !subject?.trim()) {
      return NextResponse.json({ error: 'Type and subject are required' }, { status: 400 });
    }

    const [emp] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [authResult.user.id]);
    if (!emp.length) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    await pool.execute(
      `INSERT INTO portal_requests (employee_id, request_type, subject, details) VALUES (?, ?, ?, ?)`,
      [emp[0].id, type, subject.trim(), details?.trim() || null]
    );

    return NextResponse.json({ success: true, message: 'Request sent to admin' });
  } catch (error) {
    console.error('Create request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
