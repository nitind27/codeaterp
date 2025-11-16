import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// Get channel details and messages
export async function GET(req, { params }) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const channelId = params.id;
    const userId = authResult.user.id;

    // Check if user is member
    const [members] = await pool.execute(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, userId]
    );

    if (members.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this channel' },
        { status: 403 }
      );
    }

    // Get channel details
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

    if (channels.length === 0) {
      return NextResponse.json(
        { error: 'Channel not found' },
        { status: 404 }
      );
    }

    // Get messages
    const [messages] = await pool.execute(
      `SELECT 
        m.*,
        u.email as user_email,
        e.first_name,
        e.last_name
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE m.channel_id = ?
      ORDER BY m.created_at ASC`,
      [channelId]
    );

    // Format messages
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      channelId: msg.channel_id,
      userId: msg.user_id,
      userName: `${msg.first_name || ''} ${msg.last_name || ''}`.trim() || msg.user_email,
      message: msg.message,
      attachment: msg.attachment,
      isEdited: msg.is_edited,
      createdAt: msg.created_at,
      updatedAt: msg.updated_at
    }));

    // Get channel members
    const [channelMembers] = await pool.execute(
      `SELECT 
        cm.user_id,
        u.email,
        e.first_name,
        e.last_name,
        e.department,
        e.designation
      FROM channel_members cm
      LEFT JOIN users u ON cm.user_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE cm.channel_id = ?`,
      [channelId]
    );

    return NextResponse.json({
      success: true,
      channel: channels[0],
      messages: formattedMessages,
      members: channelMembers
    });
  } catch (error) {
    console.error('Get channel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Join channel
export async function POST(req, { params }) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const channelId = params.id;
    const userId = authResult.user.id;

    // Check if already a member
    const [existing] = await pool.execute(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, userId]
    );

    if (existing.length > 0) {
      return NextResponse.json({
        success: true,
        message: 'Already a member'
      });
    }

    // Add as member
    await pool.execute(
      `INSERT INTO channel_members (channel_id, user_id) VALUES (?, ?)`,
      [channelId, userId]
    );

    return NextResponse.json({
      success: true,
      message: 'Joined channel successfully'
    });
  } catch (error) {
    console.error('Join channel error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

