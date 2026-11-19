import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import pool from '../../../../../../../lib/db.js';
import { authenticate, authorize } from '../../../../../../../lib/auth.js';
import { ensureSchema } from '../../../../../../../lib/ensureSchema.js';
import { loadEmployeeAccess } from '../../../../../../../lib/profileAccess.js';

async function findDoc(employeeId, docId) {
  const [rows] = await pool.execute(
    'SELECT * FROM employee_documents WHERE id = ? AND employee_id = ?',
    [docId, employeeId]
  );
  return rows[0] || null;
}

export async function GET(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id, docId } = await params;
    const access = await loadEmployeeAccess(authResult.user, id);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const doc = await findDoc(id, docId);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    const full = path.join(process.cwd(), 'uploads', 'documents', doc.stored_name);
    const data = await fs.readFile(full);
    const filename = String(doc.file_name || 'document.pdf').replace(/["\r\n]/g, '');

    return new NextResponse(data, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(data.length),
      },
    });
  } catch (error) {
    console.error('Download document error:', error);
    return NextResponse.json({ error: 'Could not download this file' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id, docId } = await params;
    const doc = await findDoc(id, docId);
    if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 });

    await pool.execute('DELETE FROM employee_documents WHERE id = ?', [doc.id]);
    await fs.unlink(path.join(process.cwd(), 'uploads', 'documents', doc.stored_name)).catch(() => {});
    return NextResponse.json({ success: true, message: 'Document removed' });
  } catch (error) {
    console.error('Delete document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
