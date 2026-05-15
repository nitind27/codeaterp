import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

// GET all system settings (admin only)
export async function GET(req) {
  try {
    const authResult = await authorize('admin')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const [settings] = await pool.execute(
      'SELECT setting_key, setting_value, setting_type, description FROM system_settings ORDER BY setting_key'
    );

    const result = {};
    settings.forEach((s) => {
      result[s.setting_key] = {
        value: s.setting_value,
        type: s.setting_type,
        description: s.description,
      };
    });

    return NextResponse.json({ success: true, settings: result });
  } catch (error) {
    console.error('Get settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT update system settings (admin only)
export async function PUT(req) {
  try {
    const authResult = await authorize('admin')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { user } = authResult;
    const { settings } = await req.json();

    if (!settings || typeof settings !== 'object') {
      return NextResponse.json({ error: 'Invalid settings data' }, { status: 400 });
    }

    // Upsert each setting
    for (const [key, value] of Object.entries(settings)) {
      await pool.execute(
        `INSERT INTO system_settings (setting_key, setting_value, updated_by)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_by = VALUES(updated_by)`,
        [key, value, user.id]
      );
    }

    await logActivity(user.id, 'update_settings', 'system_settings', null, 'Updated system settings', req);

    return NextResponse.json({ success: true, message: 'Settings updated successfully' });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
