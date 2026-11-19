import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { avatarDiskPaths } from '../../../../../../lib/avatarPath.js';

const TYPES = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
};

export async function GET(_req, { params }) {
  try {
    const { file } = await params;
    const safe = path.basename(decodeURIComponent(file || ''));
    if (!/^[a-zA-Z0-9._-]+$/.test(safe)) {
      return NextResponse.json({ error: 'Invalid image' }, { status: 400 });
    }

    let data = null;
    for (const full of avatarDiskPaths(safe)) {
      try {
        data = await fs.readFile(full);
        break;
      } catch {
        data = null;
      }
    }

    if (!data) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    const type = TYPES[path.extname(safe).toLowerCase()] || 'application/octet-stream';
    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Content-Type': type,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('Avatar read error:', error);
    return NextResponse.json({ error: 'Could not load image' }, { status: 500 });
  }
}
