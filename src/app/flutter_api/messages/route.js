import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';
import { handleOptions, errorResponse, successResponse } from '../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get messages for a channel
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { searchParams } = new URL(req.url);
    const channelId = searchParams.get('channelId');

    if (!channelId) {
      return errorResponse('Channel ID is required', 400);
    }

    // Check if user is member
    const [members] = await pool.execute(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, authResult.user.id]
    );

    if (members.length === 0) {
      return errorResponse('You are not a member of this channel', 403);
    }

    // Get messages
    const [messages] = await pool.execute(
      `SELECT 
        m.*,
        u.email as user_email,
        e.first_name,
        e.last_name,
        e.avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE m.channel_id = ?
      ORDER BY m.created_at ASC`,
      [channelId]
    );

    return successResponse({
      messages: messages.map(msg => ({
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        userName: `${msg.first_name || ''} ${msg.last_name || ''}`.trim() || msg.user_email,
        userAvatar: msg.avatar,
        message: msg.message,
        attachment: msg.attachment,
        isEdited: msg.is_edited,
        createdAt: msg.created_at,
        updatedAt: msg.updated_at
      }))
    });
  } catch (error) {
    console.error('Flutter Get messages error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Send a message
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { channelId, message, attachment } = await req.json();

    if (!channelId || !message) {
      return errorResponse('Channel ID and message are required', 400);
    }

    // Check if user is member
    const [members] = await pool.execute(
      `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
      [channelId, authResult.user.id]
    );

    if (members.length === 0) {
      return errorResponse('You are not a member of this channel', 403);
    }

    const [result] = await pool.execute(
      `INSERT INTO messages (channel_id, user_id, message, attachment)
       VALUES (?, ?, ?, ?)`,
      [channelId, authResult.user.id, message, attachment || null]
    );

    // Get the created message with user info
    const [newMessage] = await pool.execute(
      `SELECT 
        m.*,
        u.email as user_email,
        e.first_name,
        e.last_name,
        e.avatar
      FROM messages m
      LEFT JOIN users u ON m.user_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE m.id = ?`,
      [result.insertId]
    );

    const msg = newMessage[0];

    return successResponse({
      message: 'Message sent successfully',
      sentMessage: {
        id: msg.id,
        channelId: msg.channel_id,
        userId: msg.user_id,
        userName: `${msg.first_name || ''} ${msg.last_name || ''}`.trim() || msg.user_email,
        userAvatar: msg.avatar,
        message: msg.message,
        attachment: msg.attachment,
        isEdited: msg.is_edited,
        createdAt: msg.created_at
      }
    });
  } catch (error) {
    console.error('Flutter Send message error:', error);
    return errorResponse('Internal server error', 500);
  }
}

