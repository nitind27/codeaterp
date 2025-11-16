// Socket.io server for real-time discussions
const { createServer } = require('http');
const { Server } = require('socket.io');
const next = require('next');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

const dev = process.env.NODE_ENV !== 'production';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Database connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'codeat_erp',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Store user socket mapping
const userSockets = new Map();

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    handle(req, res);
  });

  const io = new Server(httpServer, {
    cors: {
      origin: dev ? '*' : process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true
    }
  });

  // Authentication middleware for Socket.io
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return next(new Error('Authentication error: No token provided'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      
      // Get user from database
      const [users] = await pool.execute(
        `SELECT u.id, u.email, u.role, e.first_name, e.last_name
         FROM users u
         LEFT JOIN employees e ON u.id = e.user_id
         WHERE u.id = ? AND u.is_active = TRUE`,
        [decoded.userId]
      );

      if (users.length === 0) {
        return next(new Error('Authentication error: User not found'));
      }

      socket.userId = decoded.userId;
      socket.user = users[0];
      next();
    } catch (error) {
      console.error('Socket auth error:', error);
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // Socket.io connection handling
  io.on('connection', (socket) => {
    console.log(`User connected: ${socket.user.email} (${socket.id})`);
    
    // Store user socket mapping
    userSockets.set(socket.userId, socket.id);

    // Join channel
    socket.on('join_channel', async (channelId) => {
      try {
        // Verify user is member of channel
        const [members] = await pool.execute(
          `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
          [channelId, socket.userId]
        );

        if (members.length === 0) {
          socket.emit('error', { message: 'You are not a member of this channel' });
          return;
        }

        socket.join(`channel_${channelId}`);
        console.log(`User ${socket.user.email} joined channel ${channelId}`);
        
        // Notify others in channel
        socket.to(`channel_${channelId}`).emit('user_joined', {
          userId: socket.userId,
          userName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email,
          channelId
        });
      } catch (error) {
        console.error('Join channel error:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Leave channel
    socket.on('leave_channel', (channelId) => {
      socket.leave(`channel_${channelId}`);
      console.log(`User ${socket.user.email} left channel ${channelId}`);
      
      // Notify others in channel
      socket.to(`channel_${channelId}`).emit('user_left', {
        userId: socket.userId,
        userName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email,
        channelId
      });
    });

    // Send message
    socket.on('send_message', async (data) => {
      try {
        const { channelId, message, attachment } = data;

        if (!channelId || !message || !message.trim()) {
          socket.emit('error', { message: 'Channel ID and message are required' });
          return;
        }

        // Verify user is member of channel
        const [members] = await pool.execute(
          `SELECT * FROM channel_members WHERE channel_id = ? AND user_id = ?`,
          [channelId, socket.userId]
        );

        if (members.length === 0) {
          socket.emit('error', { message: 'You are not a member of this channel' });
          return;
        }

        // Save message to database
        const [result] = await pool.execute(
          `INSERT INTO messages (channel_id, user_id, message, attachment)
           VALUES (?, ?, ?, ?)`,
          [channelId, socket.userId, message.trim(), attachment || null]
        );

        const messageData = {
          id: result.insertId,
          channelId,
          userId: socket.userId,
          userName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email,
          message: message.trim(),
          attachment: attachment || null,
          isEdited: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Broadcast to channel
        io.to(`channel_${channelId}`).emit('new_message', messageData);
      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      socket.to(`channel_${data.channelId}`).emit('user_typing', {
        userId: socket.userId,
        userName: `${socket.user.first_name || ''} ${socket.user.last_name || ''}`.trim() || socket.user.email,
        channelId: data.channelId
      });
    });

    // Stop typing
    socket.on('stop_typing', (data) => {
      socket.to(`channel_${data.channelId}`).emit('user_stop_typing', {
        userId: socket.userId,
        channelId: data.channelId
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.user.email} (${socket.id})`);
      userSockets.delete(socket.userId);
    });
  });

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Socket.io server running`);
  });
});

