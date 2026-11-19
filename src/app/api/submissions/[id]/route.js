import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
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
