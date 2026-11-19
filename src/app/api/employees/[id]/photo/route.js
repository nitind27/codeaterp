import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { randomBytes } from 'crypto';
import pool from '../../../../../../lib/db.js';
import { authenticate } from '../../../../../../lib/auth.js';
import { ensureSchema } from '../../../../../../lib/ensureSchema.js';
import { loadEmployeeAccess } from '../../../../../../lib/profileAccess.js';

const TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

export async function POST(req, { params }) {
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

    const form = await req.formData();
    const file = form.get('photo');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'Choose a photo' }, { status: 400 });
    }
    const ext = TYPES[file.type];
    if (!ext) {
      return NextResponse.json({ error: 'Use a JPG, PNG, or WebP photo' }, { status: 400 });
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo must be under 2 MB' }, { status: 400 });
    }

    const dir = path.join(process.cwd(), 'public', 'uploads', 'avatars');
    await fs.mkdir(dir, { recursive: true });
    const filename = `${id}-${Date.now()}-${randomBytes(4).toString('hex')}${ext}`;
    await fs.writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));

    const [current] = await pool.execute('SELECT avatar FROM employees WHERE id = ?', [id]);
    const previous = current[0]?.avatar || '';
    if (previous.startsWith('/uploads/avatars/')) {
      await fs.unlink(path.join(process.cwd(), 'public', previous)).catch(() => {});
    }

    const avatar = `/uploads/avatars/${filename}`;
    await pool.execute('UPDATE employees SET avatar = ? WHERE id = ?', [avatar, id]);
    return NextResponse.json({ success: true, avatar, message: 'Photo updated' });
  } catch (error) {
    console.error('Photo upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
