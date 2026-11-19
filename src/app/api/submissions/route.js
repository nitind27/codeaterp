import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';
import { ensureSchema } from '../../../../lib/ensureSchema.js';

const mapRow = (row) => ({
  id: row.id,
  employeeId: row.employee_id,
  employeeName: `${row.first_name} ${row.last_name}`,
  employeeCode: row.employee_code,
  taskId: row.task_id,
  taskTitle: row.task_title,
  title: row.title,
  link: row.submission_link,
  notes: row.notes,
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
      SELECT s.*, e.first_name, e.last_name, e.employee_id AS employee_code, t.title AS task_title
      FROM task_submissions s
      JOIN employees e ON s.employee_id = e.id
      LEFT JOIN tasks t ON s.task_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (!['admin', 'hr', 'project_manager'].includes(user.role)) {
      const [emp] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
      if (!emp.length) return NextResponse.json({ success: true, submissions: [] });
      query += ' AND s.employee_id = ?';
      params.push(emp[0].id);
    }

    query += ' ORDER BY s.created_at DESC';
    const [rows] = await pool.execute(query, params);
    return NextResponse.json({ success: true, submissions: rows.map(mapRow) });
  } catch (error) {
    console.error('Get submissions error:', error);
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

    const { title, link, notes, taskId } = await req.json();
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const [emp] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [authResult.user.id]);
    if (!emp.length) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    await pool.execute(
      `INSERT INTO task_submissions (employee_id, task_id, title, submission_link, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [emp[0].id, taskId || null, title.trim(), link?.trim() || null, notes?.trim() || null]
    );

    return NextResponse.json({ success: true, message: 'Work submitted. Admin can review it now.' });
  } catch (error) {
    console.error('Create submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
