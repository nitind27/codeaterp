import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { verifyPassword, generateToken, generateRefreshToken } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';
import crypto from 'crypto';

// Office Location Configuration (Surat, Gujarat)
const OFFICE_LOCATION = {
  latitude: 21.1877888,
  longitude: 72.8367104,
  radiusInKm: 5 // 500 meters radius
};

// Roles that require location verification
const LOCATION_REQUIRED_ROLES = ['employee', 'intern'];

// Calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
};

// Check if coordinates are within office radius
const isWithinOfficeRadius = (latitude, longitude) => {
  const distance = calculateDistance(
    latitude,
    longitude,
    OFFICE_LOCATION.latitude,
    OFFICE_LOCATION.longitude
  );
  return {
    isWithin: distance <= OFFICE_LOCATION.radiusInKm,
    distance: distance.toFixed(2)
  };
};

// Generate unique session token
const generateSessionToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

export async function POST(req) {
  try {
    const { email, password, location } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get user from database
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    const user = users[0];

    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check location for employee and intern roles
    if (LOCATION_REQUIRED_ROLES.includes(user.role)) {
      console.log(`[LOGIN] User role: ${user.role}, Location received:`, location);
      console.log(`[LOGIN] Office location: ${OFFICE_LOCATION.latitude}, ${OFFICE_LOCATION.longitude}, Radius: ${OFFICE_LOCATION.radiusInKm} km`);
      
      if (!location || !location.latitude || !location.longitude) {
        console.log('[LOGIN] Location not provided - rejecting');
        return NextResponse.json(
          { 
            error: 'Location access is required for employees and interns. Please enable location services and try again.',
            locationRequired: true
          },
          { status: 403 }
        );
      }

      const locationCheck = isWithinOfficeRadius(location.latitude, location.longitude);
      console.log(`[LOGIN] Distance from office: ${locationCheck.distance} km, Within radius: ${locationCheck.isWithin}`);
      
      if (!locationCheck.isWithin) {
        console.log('[LOGIN] User outside office radius - rejecting');
        return NextResponse.json(
          { 
            error: `You must be at the office location to login. You are ${locationCheck.distance} km away from the office. (Required: within ${OFFICE_LOCATION.radiusInKm} km)`,
            locationRequired: true,
            distance: locationCheck.distance,
            userLocation: location,
            officeLocation: OFFICE_LOCATION
          },
          { status: 403 }
        );
      }
      
      console.log('[LOGIN] Location check passed ✓');
    }

    // Check if there was a previous session (for single device login)
    const previousSessionToken = user.session_token;
    const previousSessionLoggedOut = !!previousSessionToken;

    // Generate new session token
    const sessionToken = generateSessionToken();

    // Update last login and session token (this invalidates any previous session)
    await pool.execute(
      'UPDATE users SET last_login = NOW(), session_token = ? WHERE id = ?',
      [sessionToken, user.id]
    );

    // Generate JWT tokens with session token included
    const token = generateToken(user, sessionToken);
    const refreshToken = generateRefreshToken(user);

    // Get employee details if exists
    const [employees] = await pool.execute(
      `SELECT e.*, u.email, u.role 
       FROM employees e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.user_id = ?`,
      [user.id]
    );

    const employee = employees.length > 0 ? employees[0] : null;

    // Log activity with location info
    const activityDescription = location 
      ? `User logged in from location (${location.latitude}, ${location.longitude})`
      : 'User logged in';
    await logActivity(user.id, 'login', 'user', user.id, activityDescription, req);

    return NextResponse.json({
      success: true,
      token,
      refreshToken,
      sessionToken, // Send session token to client for storage
      previousSessionLoggedOut, // Notify if old session was invalidated
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employee_id,
          firstName: employee.first_name,
          lastName: employee.last_name,
          department: employee.department,
          designation: employee.designation,
          avatar: employee.avatar
        } : null
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

