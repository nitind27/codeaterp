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
        END as is_member,
        -- For DMs: return the peer's user id
        CASE
          WHEN dc.type = 'direct' THEN (
            SELECT cm_peer.user_id FROM channel_members cm_peer
            WHERE cm_peer.channel_id = dc.id AND cm_peer.user_id != ?
            LIMIT 1
          )
          ELSE NULL
        END as dm_peer_id
      FROM discussion_channels dc
      LEFT JOIN users u ON dc.created_by = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE dc.is_active = TRUE
        AND (dc.type != 'direct' OR EXISTS (SELECT 1 FROM channel_members cm2 WHERE cm2.channel_id = dc.id AND cm2.user_id = ?))
      ORDER BY dc.type = 'direct' ASC, dc.created_at DESC`,
      [userId, userId, userId]
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
    const { name, type, description, project_id, department, dm_user_id } = data;

    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 });
    }

    const userId = authResult.user.id;

    // For DMs: check if channel already exists between these two users
    if (type === 'direct' && dm_user_id) {
      const [existing] = await pool.execute(
        `SELECT dc.id FROM discussion_channels dc
         JOIN channel_members cm1 ON dc.id = cm1.channel_id AND cm1.user_id = ?
         JOIN channel_members cm2 ON dc.id = cm2.channel_id AND cm2.user_id = ?
         WHERE dc.type = 'direct' AND dc.is_active = TRUE
         LIMIT 1`,
        [userId, dm_user_id]
      );
      if (existing.length > 0) {
        const [ch] = await pool.execute('SELECT * FROM discussion_channels WHERE id = ?', [existing[0].id]);
        return NextResponse.json({ success: true, channel: { ...ch[0], is_member: true, member_count: 2 }, message: 'DM channel already exists' });
      }
    }

    // Create channel
    const [result] = await pool.execute(
      `INSERT INTO discussion_channels (name, type, description, project_id, department, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, type, description || null, project_id || null, department || null, userId]
    );
    const channelId = result.insertId;

    // Add creator as member
    await pool.execute(`INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)`, [channelId, userId]);

    // For DMs: also add the other user
    if (type === 'direct' && dm_user_id && dm_user_id !== userId) {
      await pool.execute(`INSERT IGNORE INTO channel_members (channel_id, user_id) VALUES (?, ?)`, [channelId, dm_user_id]);
    }

    const [channels] = await pool.execute(
      `SELECT dc.*, u.email as created_by_email, e.first_name as created_by_first_name, e.last_name as created_by_last_name
       FROM discussion_channels dc
       LEFT JOIN users u ON dc.created_by = u.id
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE dc.id = ?`,
      [channelId]
    );

    return NextResponse.json({ success: true, channel: { ...channels[0], is_member: true, member_count: type === 'direct' ? 2 : 1 }, message: 'Channel created successfully' });
  } catch (error) {
    console.error('Create channel error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

