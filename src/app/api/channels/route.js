import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';

// Get all channels user has access to
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const userId = authResult.user.id;
    const userRole = authResult.user.role;

    // Get all active channels
    // For general channels, all users can see
    // For project/department channels, check membership
    const [channels] = await pool.execute(
      `SELECT 
        dc.id,
        dc.name,
        dc.type,
        dc.description,
        dc.project_id,
        dc.department,
        dc.created_at,
        u.email as created_by_email,
        e.first_name as created_by_first_name,
        e.last_name as created_by_last_name,
        (SELECT COUNT(*) FROM channel_members cm WHERE cm.channel_id = dc.id) as member_count,
        (SELECT COUNT(*) FROM messages m WHERE m.channel_id = dc.id) as message_count,
        CASE 
          WHEN EXISTS (SELECT 1 FROM channel_members cm WHERE cm.channel_id = dc.id AND cm.user_id = ?) 
          THEN TRUE 
          ELSE FALSE 
        END as is_member
      FROM discussion_channels dc
      LEFT JOIN users u ON dc.created_by = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE dc.is_active = TRUE
      ORDER BY dc.created_at DESC`,
      [userId]
    );

    return NextResponse.json({ success: true, channels });
  } catch (error) {
    console.error('Get channels error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create new channel
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const data = await req.json();
    const { name, type, description, project_id, department } = data;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    // Create channel
    const [result] = await pool.execute(
      `INSERT INTO discussion_channels (name, type, description, project_id, department, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, description || null, project_id || null, department || null, authResult.user.id]
    );

    const channelId = result.insertId;

    // Add creator as member
    await pool.execute(
      `INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)`,
      [channelId, authResult.user.id]
    );

    // Get created channel
    const [channels] = await pool.execute(
      `SELECT 
        dc.*,
        u.email as created_by_email,
        e.first_name as created_by_first_name,
        e.last_name as created_by_last_name
      FROM discussion_channels dc
      LEFT JOIN users u ON dc.created_by = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE dc.id = ?`,
      [channelId]
    );

    return NextResponse.json({
      success: true,
      channel: channels[0],
      message: 'Channel created successfully'
    });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

