import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

// ── Office location & radius ───────────────────────────────────────────────
const OFFICE = {
  latitude:  21.1877888,
  longitude: 72.8367104,
  radiusInKm: 0.1,  // 100 metres — change here to adjust
};

// Roles that must be within office radius to clock in/out
const LOCATION_REQUIRED_ROLES = ['employee', 'intern'];

const haversineKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const checkLocation = (location, role) => {
  // Admin / HR / PM — no restriction
  if (!LOCATION_REQUIRED_ROLES.includes(role)) return { ok: true };

  if (!location?.latitude || !location?.longitude) {
    return { ok: false, error: 'Location is required to clock in/out. Please enable location access.' };
  }

  const distKm = haversineKm(location.latitude, location.longitude, OFFICE.latitude, OFFICE.longitude);
  const distM  = Math.round(distKm * 1000);
  const limitM = Math.round(OFFICE.radiusInKm * 1000);

  if (distKm > OFFICE.radiusInKm) {
    return {
      ok: false,
      error: `You are ${distM} metres away from the office. You must be within ${limitM} metres to clock in/out.`,
      distanceMeters: distM,
      limitMeters: limitM,
    };
  }

  return { ok: true, distanceMeters: distM };
};

// ── GET — fetch attendance records ────────────────────────────────────────
export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    const startDate  = searchParams.get('start_date');
    const endDate    = searchParams.get('end_date');
    const status     = searchParams.get('status');

    let query = `
      SELECT a.*, e.first_name, e.last_name, e.employee_id,
             u.email, u.role
      FROM attendance a
      JOIN employees e ON a.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'project_manager') {
      const [userEmp] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
      if (userEmp.length > 0) {
        query += ' AND a.employee_id = ?';
        params.push(userEmp[0].id);
      } else {
        return NextResponse.json({ success: true, attendance: [] });
      }
    } else if (employeeId) {
      query += ' AND a.employee_id = ?';
      params.push(employeeId);
    }

    if (startDate) { query += ' AND a.date >= ?'; params.push(startDate); }
    if (endDate)   { query += ' AND a.date <= ?'; params.push(endDate); }
    if (status)    { query += ' AND a.status = ?'; params.push(status); }

    query += ' ORDER BY a.date DESC, a.created_at DESC';

    const [attendance] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
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
        updatedAt: att.updated_at,
      })),
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── POST — clock in ───────────────────────────────────────────────────────
export async function POST(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await req.json();
    const { location } = body;

    // ── Location check ──
    const locResult = checkLocation(location, user.role);
    if (!locResult.ok) {
      return NextResponse.json({ error: locResult.error, locationRequired: true }, { status: 403 });
    }

    const [employees] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
    if (employees.length === 0) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const employeeId = employees[0].id;

    // Use IST (Asia/Kolkata) for date and time
    const nowIST  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today   = `${nowIST.getFullYear()}-${String(nowIST.getMonth()+1).padStart(2,'0')}-${String(nowIST.getDate()).padStart(2,'0')}`;
    const now     = `${String(nowIST.getHours()).padStart(2,'0')}:${String(nowIST.getMinutes()).padStart(2,'0')}:${String(nowIST.getSeconds()).padStart(2,'0')}`;
    const locationStr = location?.latitude
      ? `${location.latitude},${location.longitude}`
      : (body.location || 'Office');

    const [existing] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (existing.length > 0 && existing[0].clock_in) {
      return NextResponse.json({ error: 'Already clocked in today' }, { status: 400 });
    }

    if (existing.length > 0) {
      await pool.execute(
        `UPDATE attendance SET clock_in = ?, clock_in_location = ?, status = 'present', updated_at = NOW() WHERE id = ?`,
        [now, locationStr, existing[0].id]
      );
    } else {
      await pool.execute(
        `INSERT INTO attendance (employee_id, date, clock_in, clock_in_location, status) VALUES (?, ?, ?, ?, 'present')`,
        [employeeId, today, now, locationStr]
      );
    }

    await logActivity(user.id, 'clock_in', 'attendance', employeeId, `Clocked in at ${now}`, req);

    return NextResponse.json({
      success: true,
      message: 'Clocked in successfully',
      time: now,
      ...(locResult.distanceMeters !== undefined && { distanceMeters: locResult.distanceMeters }),
    });
  } catch (error) {
    console.error('Clock in error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ── PUT — clock out ───────────────────────────────────────────────────────
export async function PUT(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const body = await req.json();
    const { location } = body;

    // ── Location check ──
    const locResult = checkLocation(location, user.role);
    if (!locResult.ok) {
      return NextResponse.json({ error: locResult.error, locationRequired: true }, { status: 403 });
    }

    const [employees] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
    if (employees.length === 0) {
      return NextResponse.json({ error: 'Employee record not found' }, { status: 404 });
    }

    const employeeId = employees[0].id;

    // Use IST (Asia/Kolkata) for date and time
    const nowIST  = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
    const today   = `${nowIST.getFullYear()}-${String(nowIST.getMonth()+1).padStart(2,'0')}-${String(nowIST.getDate()).padStart(2,'0')}`;
    const now     = `${String(nowIST.getHours()).padStart(2,'0')}:${String(nowIST.getMinutes()).padStart(2,'0')}:${String(nowIST.getSeconds()).padStart(2,'0')}`;
    const locationStr = location?.latitude
      ? `${location.latitude},${location.longitude}`
      : (body.location || 'Office');

    const [attendance] = await pool.execute(
      'SELECT * FROM attendance WHERE employee_id = ? AND date = ?',
      [employeeId, today]
    );

    if (attendance.length === 0 || !attendance[0].clock_in) {
      return NextResponse.json({ error: 'Please clock in first' }, { status: 400 });
    }
    if (attendance[0].clock_out) {
      return NextResponse.json({ error: 'Already clocked out today' }, { status: 400 });
    }

    // Total hours: parse HH:MM:SS properly
    const [ih, im, is_] = attendance[0].clock_in.split(':').map(Number);
    const [oh, om, os]  = now.split(':').map(Number);
    const inSec  = ih * 3600 + im * 60 + (is_ || 0);
    const outSec = oh * 3600 + om * 60 + (os  || 0);
    const totalHours = Math.max(0, (outSec - inSec) / 3600).toFixed(2);

    await pool.execute(
      `UPDATE attendance SET clock_out = ?, clock_out_location = ?, total_hours = ?, updated_at = NOW() WHERE id = ?`,
      [now, locationStr, totalHours, attendance[0].id]
    );

    await logActivity(user.id, 'clock_out', 'attendance', employeeId, `Clocked out at ${now}`, req);

    return NextResponse.json({
      success: true,
      message: 'Clocked out successfully',
      time: now,
      totalHours: parseFloat(totalHours),
      ...(locResult.distanceMeters !== undefined && { distanceMeters: locResult.distanceMeters }),
    });
  } catch (error) {
    console.error('Clock out error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
