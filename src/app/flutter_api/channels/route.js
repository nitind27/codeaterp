import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';
import { handleOptions, errorResponse, successResponse } from '../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get all channels user has access to
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const userId = authResult.user.id;

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

    return successResponse({
      channels: channels.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        description: ch.description,
        projectId: ch.project_id,
        department: ch.department,
        createdAt: ch.created_at,
        createdByEmail: ch.created_by_email,
        createdByName: ch.created_by_first_name && ch.created_by_last_name
          ? `${ch.created_by_first_name} ${ch.created_by_last_name}`
          : null,
        memberCount: ch.member_count,
        messageCount: ch.message_count,
        isMember: ch.is_member
      }))
    });
  } catch (error) {
    console.error('Flutter Get channels error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Create new channel
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const data = await req.json();
    const { name, type, description, project_id, department } = data;

    if (!name || !type) {
      return errorResponse('Name and type are required', 400);
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

    return successResponse({
      message: 'Channel created successfully',
      channelId: channelId
    });
  } catch (error) {
    console.error('Flutter Create channel error:', error);
    return errorResponse('Internal server error', 500);
  }
}

