import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';

// Get messages for a channel
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return NextResponse.json(
        { error: 'Channel ID is required' },
        { status: 400 }
      );
    }

    // Check if user is member
    const [members] = await pool.execute(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, authResult.user.id]
    );

    if (members.length === 0) {
      return NextResponse.json(
        { error: 'You are not a member of this channel' },
        { status: 403 }
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

    return NextResponse.json({
      success: true,
      messages: formattedMessages
    });
  } catch (error) {
    console.error('Get messages error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


// Send a message (REST fallback when socket is unavailable)
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { channelId, message } = await req.json();
    if (!channelId || !message?.trim()) {
      return NextResponse.json({ error: 'channelId and message are required' }, { status: 400 });
    }

    // Verify membership
    const [members] = await pool.execute(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, authResult.user.id]
    );
    if (members.length === 0) {
      return NextResponse.json({ error: 'Not a member of this channel' }, { status: 403 });
    }

    const [result] = await pool.execute(
      `INSERT INTO messages (channel_id, user_id, message) VALUES (?, ?, ?)`,
      [channelId, authResult.user.id, message.trim()]
    );

    const [rows] = await pool.execute(
      `SELECT m.*, u.email as user_email, e.first_name, e.last_name
       FROM messages m
       LEFT JOIN users u ON m.user_id = u.id
       LEFT JOIN employees e ON u.id = e.user_id
       WHERE m.id = ?`,
      [result.insertId]
    );

    const msg = rows[0];
    return NextResponse.json({
      success: true,
      message: {
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        userName: `${msg.first_name || ''} ${msg.last_name || ''}`.trim() || msg.user_email,
        message: msg.message,
        attachment: msg.attachment || null,
        isEdited: msg.is_edited,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at
      }
    });
  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
