import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import pool from './db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-change-in-production';

// Hash password
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Verify password
export async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

// Generate JWT token
export function generateToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

// Generate refresh token
export function generateRefreshToken(user) {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role 
    },
    JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
}

// Verify token
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

// Verify refresh token
export function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, JWT_REFRESH_SECRET);
  } catch (error) {
    return null;
  }
}

// Get user from token
export async function getUserFromToken(token) {
  const decoded = verifyToken(token);
  if (!decoded) return null;

  const [users] = await pool.execute(
    'SELECT id, email, role, is_active FROM users WHERE id = ? AND is_active = TRUE',
    [decoded.id]
  );

  return users.length > 0 ? users[0] : null;
}

// Role-based access control
export const roles = {
  admin: ['admin'],
  hr: ['admin', 'hr'],
  project_manager: ['admin', 'hr', 'project_manager'],
  employee: ['admin', 'hr', 'project_manager', 'employee'],
  intern: ['admin', 'hr', 'project_manager', 'employee', 'intern']
};

export function hasPermission(userRole, requiredRole) {
  const userRoleHierarchy = roles[userRole] || [];
  return userRoleHierarchy.includes(requiredRole);
}

// Authentication middleware
export async function authenticate(req) {
  // Next.js App Router uses Headers object with get() method
  let authHeader;
  try {
    if (req.headers && typeof req.headers.get === 'function') {
      // Next.js Request object (App Router)
      authHeader = req.headers.get('authorization');
    } else if (req.headers && req.headers.authorization) {
      // Plain headers object (fallback)
      authHeader = req.headers.authorization;
    } else {
      return { error: 'No token provided', status: 401 };
    }
  } catch (error) {
    console.error('Error reading authorization header:', error);
    return { error: 'No token provided', status: 401 };
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { error: 'No token provided', status: 401 };
  }

  const token = authHeader.substring(7);
  
  if (!token) {
    return { error: 'Invalid token format', status: 401 };
  }

  const user = await getUserFromToken(token);

  if (!user) {
    return { error: 'Invalid or expired token', status: 401 };
  }

  return { user };
}

// Authorization middleware
export function authorize(...allowedRoles) {
  return async (req) => {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return authResult;
    }

    const { user } = authResult;
    if (!allowedRoles.includes(user.role)) {
      return { error: 'Insufficient permissions', status: 403 };
    }

    return { user };
  };
}

