import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate, authorize } from '../../../../../lib/auth.js';
import { ensureSchema } from '../../../../../lib/ensureSchema.js';

export async function PUT(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const { status, adminNote } = await req.json();
    const allowed = ['submitted', 'reviewed', 'accepted', 'revision'];
    if (!allowed.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await pool.execute(
      'UPDATE task_submissions SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?',
      [status, adminNote || null, id]
    );

    return NextResponse.json({ success: true, message: 'Submission updated' });
  } catch (error) {
    console.error('Update submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const [rows] = await pool.execute(
      'SELECT id, employee_id, title FROM task_submissions WHERE id = ?',
      [id]
    );
    if (!rows.length) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }

    const staff = ['admin', 'hr', 'project_manager'].includes(authResult.user.role);
    if (!staff) {
      const [emp] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [authResult.user.id]);
      if (!emp.length || Number(emp[0].id) !== Number(rows[0].employee_id)) {
        return NextResponse.json({ error: 'You can only delete your own submission' }, { status: 403 });
      }
    }

    await pool.execute('DELETE FROM task_submissions WHERE id = ?', [id]);
    return NextResponse.json({ success: true, message: 'Submission deleted' });
  } catch (error) {
    console.error('Delete submission error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
