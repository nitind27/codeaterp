import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { ensureSchema } from '../../../../../lib/ensureSchema.js';

export async function PUT(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const { status, adminNote } = await req.json();
    if (!['pending', 'approved', 'rejected'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    await pool.execute(
      'UPDATE portal_requests SET status = ?, admin_note = ?, updated_at = NOW() WHERE id = ?',
      [status, adminNote || null, id]
    );

    return NextResponse.json({ success: true, message: 'Request updated' });
  } catch (error) {
    console.error('Update request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
