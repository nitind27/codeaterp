import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import pool from '../../../../../../lib/db.js';
import { authenticate, authorize } from '../../../../../../lib/auth.js';
import { ensureSchema } from '../../../../../../lib/ensureSchema.js';
import { loadEmployeeAccess } from '../../../../../../lib/profileAccess.js';

export async function GET(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const access = await loadEmployeeAccess(authResult.user, id);
    if (access.error) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const [rows] = await pool.execute(
      `SELECT id, title, file_name, file_size, created_at
       FROM employee_documents WHERE employee_id = ? ORDER BY created_at DESC`,
      [id]
    );

    return NextResponse.json({
      success: true,
      documents: rows.map((row) => ({
        id: row.id,
        title: row.title,
        fileName: row.file_name,
        size: row.file_size,
        createdAt: row.created_at,
      })),
    });
  } catch (error) {
    console.error('List documents error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const [employee] = await pool.execute('SELECT id FROM employees WHERE id = ?', [id]);
    if (!employee.length) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const form = await req.formData();
    const file = form.get('file');
    const title = String(form.get('title') || '').trim();
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Choose a PDF' }, { status: 400 });
    }
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf) {
      return NextResponse.json({ error: 'Only PDF files can be uploaded' }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: 'PDF must be under 8 MB' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'uploads', 'documents');
    await fs.mkdir(dir, { recursive: true });
    const stored = `${id}-${Date.now()}-${randomBytes(6).toString('hex')}.pdf`;
    await fs.writeFile(path.join(dir, stored), Buffer.from(await file.arrayBuffer()));

    const safeTitle = title || file.name.replace(/\.pdf$/i, '');
    const [result] = await pool.execute(
      `INSERT INTO employee_documents (employee_id, title, file_name, stored_name, file_size, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, safeTitle.slice(0, 255), file.name.slice(0, 255), stored, file.size, authResult.user.id]
    );

    return NextResponse.json({
      success: true,
      message: 'Document uploaded',
      document: {
        id: result.insertId,
        title: safeTitle,
        fileName: file.name,
        size: file.size,
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('Upload document error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
