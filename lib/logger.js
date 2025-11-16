import pool from './db.js';

// Log activity
export async function logActivity(userId, action, entityType = null, entityId = null, description = null, req = null) {
  try {
    const ipAddress = req?.headers?.['x-forwarded-for'] || req?.connection?.remoteAddress || null;
    const userAgent = req?.headers?.['user-agent'] || null;

    await pool.execute(
      `INSERT INTO activity_logs (user_id, action, entity_type, entity_id, description, ip_address, user_agent) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, action, entityType, entityId, description, ipAddress, userAgent]
    );
  } catch (error) {
    console.error('Activity log error:', error);
  }
}

// Get activity logs
export async function getActivityLogs(filters = {}) {
  try {
    let query = `
      SELECT al.*, u.email, e.first_name, e.last_name 
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE 1=1
    `;
    const params = [];

    if (filters.userId) {
      query += ' AND al.user_id = ?';
      params.push(filters.userId);
    }

    if (filters.action) {
      query += ' AND al.action = ?';
      params.push(filters.action);
    }

    if (filters.startDate) {
      query += ' AND al.created_at >= ?';
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ' AND al.created_at <= ?';
      params.push(filters.endDate);
    }

    query += ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?';
    params.push(filters.limit || 100, filters.offset || 0);

    const [logs] = await pool.execute(query, params);
    return logs;
  } catch (error) {
    console.error('Get activity logs error:', error);
    return [];
  }
}

