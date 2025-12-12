import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';
import { handleOptions, errorResponse, successResponse, jsonResponse } from '../cors.js';

// Office Location Configuration
const OFFICE_LOCATION = {
  latitude: 21.1877888,
  longitude: 72.8367104,
  radiusInKm: 5
};

// Calculate distance between two coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Check if within office radius
const isWithinOfficeRadius = (latitude, longitude) => {
  const distance = calculateDistance(latitude, longitude, OFFICE_LOCATION.latitude, OFFICE_LOCATION.longitude);
  return {
    isWithin: distance <= OFFICE_LOCATION.radiusInKm,
    distance: distance.toFixed(2)
  };
};

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get attendance records
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const { user } = authResult;
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_id,
             u.email, u.role
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // Non-admin/hr/pm can only see their own attendance
    if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'project_manager') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length > 0) {
        query += ' AND a.employee_id = ?';
        params.push(userEmp[0].id);
      } else {
        return successResponse({ attendance: [], pagination: { page, limit, total: 0, totalPages: 0 } });
      }
    } else if (employeeId) {
      query += ' AND a.employee_id = ?';
      params.push(employeeId);
    }

    if (startDate) {
      query += ' AND a.date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND a.date <= ?';
      params.push(endDate);
    }

    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }

    // Get total count
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    query += ` ORDER BY a.date DESC, a.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [attendance] = await pool.execute(query, params);

    return successResponse({
      attendance: attendance.map(att => ({
        id: att.id,
        employeeId: att.employee_id,
        employeeName: `${att.first_name} ${att.last_name}`,
        employeeCode: att.employee_id,
        date: att.date,
        clockIn: att.clock_in,
        clockOut: att.clock_out,
        clockInLocation: att.clock_in_location,
        clockOutLocation: att.clock_out_location,
        totalHours: att.total_hours,
        status: att.status,
        notes: att.notes,
        createdAt: att.created_at,
        updatedAt: att.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Flutter Get attendance error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Clock in
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const { user } = authResult;
    const body = await req.json();
    const { location, skipLocationCheck = false } = body;

    // Get employee
    const [employees] = await pool.execute(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    );

    if (employees.length === 0) {
      return errorResponse('Employee record not found', 404);
    }

    const employeeId = employees[0].id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Check if already clocked in today
    const [existing] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (existing.length > 0 && existing[0].clock_in) {
      return errorResponse('Already clocked in today', 400);
    }

    // Location check (can be skipped for Flutter testing)
    let locationString = null;
    if (location && location.latitude && location.longitude) {
      if (!skipLocationCheck) {
        const locationCheck = isWithinOfficeRadius(location.latitude, location.longitude);
        if (!locationCheck.isWithin) {
          return jsonResponse({
            success: false,
            error: `You must be at office to clock in. You are ${locationCheck.distance} km away.`,
            distance: locationCheck.distance,
            officeLocation: OFFICE_LOCATION
          }, 403);
        }
      }
      locationString = `${location.latitude},${location.longitude}`;
    }

    if (existing.length > 0) {
      // Update existing record
      await pool.execute(
        `UPDATE attendance 
         SET clock_in = ?, clock_in_location = ?, status = 'present', updated_at = NOW()
         WHERE id = ?`,
        [now, locationString, existing[0].id]
      );
    } else {
      // Create new record
      await pool.execute(
        `INSERT INTO attendance (employee_id, date, clock_in, clock_in_location, status)
         VALUES (?, ?, ?, ?, 'present')`,
        [employeeId, today, now, locationString]
      );
    }

    await logActivity(user.id, 'clock_in', 'attendance', employeeId, 
      `Clocked in via Flutter at ${now}`, req);

    return successResponse({
      message: 'Clocked in successfully',
      time: now,
      date: today,
      location: locationString
    });
  } catch (error) {
    console.error('Flutter Clock in error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Clock out
export async function PUT(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const { user } = authResult;
    const body = await req.json();
    const { location, skipLocationCheck = false } = body;

    // Get employee
    const [employees] = await pool.execute(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    );

    if (employees.length === 0) {
      return errorResponse('Employee record not found', 404);
    }

    const employeeId = employees[0].id;
    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toTimeString().split(' ')[0].substring(0, 5);

    // Get today's attendance
    const [attendance] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (attendance.length === 0 || !attendance[0].clock_in) {
      return errorResponse('Please clock in first', 400);
    }

    if (attendance[0].clock_out) {
      return errorResponse('Already clocked out today', 400);
    }

    // Location check
    let locationString = null;
    if (location && location.latitude && location.longitude) {
      if (!skipLocationCheck) {
        const locationCheck = isWithinOfficeRadius(location.latitude, location.longitude);
        if (!locationCheck.isWithin) {
          return jsonResponse({
            success: false,
            error: `You must be at office to clock out. You are ${locationCheck.distance} km away.`,
            distance: locationCheck.distance,
            officeLocation: OFFICE_LOCATION
          }, 403);
        }
      }
      locationString = `${location.latitude},${location.longitude}`;
    }

    // Calculate total hours
    const clockIn = attendance[0].clock_in;
    const clockInTime = new Date(`2000-01-01T${clockIn}`);
    const clockOutTime = new Date(`2000-01-01T${now}`);
    const diffMs = clockOutTime - clockInTime;
    const totalHours = (diffMs / (1000 * 60 * 60)).toFixed(2);

    await pool.execute(
      `UPDATE attendance 
       SET clock_out = ?, clock_out_location = ?, total_hours = ?, updated_at = NOW()
       WHERE id = ?`,
      [now, locationString, totalHours, attendance[0].id]
    );

    await logActivity(user.id, 'clock_out', 'attendance', employeeId, 
      `Clocked out via Flutter at ${now}`, req);

    return successResponse({
      message: 'Clocked out successfully',
      time: now,
      date: today,
      totalHours: parseFloat(totalHours),
      clockIn: clockIn,
      location: locationString
    });
  } catch (error) {
    console.error('Flutter Clock out error:', error);
    return errorResponse('Internal server error', 500);
  }
}

