import pool from '../../../../../lib/db.js';
import { verifyPassword, generateToken, generateRefreshToken } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';
import crypto from 'crypto';
import { handleOptions, jsonResponse, errorResponse, successResponse } from '../../cors.js';

// Office Location Configuration (Surat, Gujarat)
const OFFICE_LOCATION = {
  latitude: 21.1877888,
  longitude: 72.8367104,
  radiusInKm: 5 // 5 km radius
};

// Roles that require location verification (can be bypassed for Flutter with skipLocationCheck)
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
  return R * c;
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

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { 
      email, 
      password, 
      location, 
      skipLocationCheck = false,  // Flutter apps can set this to true
      deviceInfo = null  // Optional device information from Flutter
    } = body;

    if (!email || !password) {
      return errorResponse('Email and password are required', 400);
    }

    // Get user from database
    const [users] = await pool.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return errorResponse('Invalid email or password', 401);
    }

    const user = users[0];

    if (!user.is_active) {
      return errorResponse('Account is deactivated', 403);
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password);
    if (!isValidPassword) {
      return errorResponse('Invalid email or password', 401);
    }

    // Check location for employee and intern roles (skip if Flutter requests it)
    if (LOCATION_REQUIRED_ROLES.includes(user.role) && !skipLocationCheck) {
      console.log(`[FLUTTER LOGIN] User role: ${user.role}, Location received:`, location);
      
      if (!location || !location.latitude || !location.longitude) {
        console.log('[FLUTTER LOGIN] Location not provided');
        return jsonResponse({
          success: false,
          error: 'Location access is required for employees and interns. Please enable location services and try again.',
          locationRequired: true,
          officeLocation: OFFICE_LOCATION
        }, 403);
      }

      const locationCheck = isWithinOfficeRadius(location.latitude, location.longitude);
      console.log(`[FLUTTER LOGIN] Distance from office: ${locationCheck.distance} km`);
      
      if (!locationCheck.isWithin) {
        return jsonResponse({
          success: false,
          error: `You must be at the office location to login. You are ${locationCheck.distance} km away from the office.`,
          locationRequired: true,
          distance: locationCheck.distance,
          userLocation: location,
          officeLocation: OFFICE_LOCATION,
          requiredRadius: OFFICE_LOCATION.radiusInKm
        }, 403);
      }
    }

    // Check if there was a previous session
    const previousSessionToken = user.session_token;
    const previousSessionLoggedOut = !!previousSessionToken;

    // Generate new session token
    const sessionToken = generateSessionToken();

    // Update last login and session token
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

    // Log activity with device info
    const activityDescription = location 
      ? `User logged in from Flutter app at location (${location.latitude}, ${location.longitude})${deviceInfo ? ` - Device: ${deviceInfo}` : ''}`
      : `User logged in from Flutter app${deviceInfo ? ` - Device: ${deviceInfo}` : ''}`;
    await logActivity(user.id, 'login', 'user', user.id, activityDescription, req);

    return successResponse({
      message: 'Login successful',
      token,
      refreshToken,
      sessionToken,
      previousSessionLoggedOut,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        employee: employee ? {
          id: employee.id,
          employeeId: employee.employee_id,
          firstName: employee.first_name,
          lastName: employee.last_name,
          fullName: `${employee.first_name} ${employee.last_name}`,
          phone: employee.phone,
          dateOfBirth: employee.date_of_birth,
          gender: employee.gender,
          department: employee.department,
          designation: employee.designation,
          avatar: employee.avatar,
          joiningDate: employee.joining_date
        } : null
      },
      officeLocation: OFFICE_LOCATION
    });
  } catch (error) {
    console.error('Flutter Login error:', error);
    return errorResponse('Internal server error', 500);
  }
}

