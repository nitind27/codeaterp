import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { hashPassword, generateToken } from '../../../../../lib/auth.js';
import { authorize } from '../../../../../lib/auth.js';
import { validateEmail, generateEmployeeId } from '../../../../../lib/utils.js';
import { logActivity } from '../../../../../lib/logger.js';
import { sendOnboardingEmail } from '../../../../../lib/email.js';

export async function POST(req) {
  try {
    // Only admin and HR can register users
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { email, password, role, employeeData } = await req.json();

    if (!email || !password || !role) {
      return NextResponse.json(
        { error: 'Email, password, and role are required' },
        { status: 400 }
      );
    }

    if (!validateEmail(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const [userResult] = await pool.execute(
      'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, role, true]
    );

    const userId = userResult.insertId;

    // Create employee record if employeeData is provided
    let employeeId = null;
    if (employeeData && (role === 'employee' || role === 'intern')) {
      const empId = employeeData.employee_id || generateEmployeeId();
      
      const [empResult] = await pool.execute(
        `INSERT INTO employees (
          user_id, employee_id, first_name, last_name, phone, date_of_birth,
          gender, address, city, state, country, postal_code, department,
          designation, joining_date, salary, employment_type, manager_id,
          emergency_contact_name, emergency_contact_phone
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          empId,
          employeeData.first_name || '',
          employeeData.last_name || '',
          employeeData.phone || null,
          employeeData.date_of_birth || null,
          employeeData.gender || null,
          employeeData.address || null,
          employeeData.city || null,
          employeeData.state || null,
          employeeData.country || 'India',
          employeeData.postal_code || null,
          employeeData.department || null,
          employeeData.designation || null,
          employeeData.joining_date || new Date(),
          employeeData.salary || null,
          employeeData.employment_type || 'full_time',
          employeeData.manager_id || null,
          employeeData.emergency_contact_name || null,
          employeeData.emergency_contact_phone || null
        ]
      );

      employeeId = empResult.insertId;

      // Initialize leave balance for the year
      const currentYear = new Date().getFullYear();
      const [leaveTypes] = await pool.execute('SELECT id FROM leave_types WHERE is_active = TRUE');
      
      for (const leaveType of leaveTypes) {
        await pool.execute(
          `INSERT INTO leave_balance (employee_id, leave_type_id, year, total_days) 
           VALUES (?, ?, ?, ?)`,
          [employeeId, leaveType.id, currentYear, 0]
        );
      }

      // Send onboarding email
      await sendOnboardingEmail(
        { ...employeeData, employee_id: empId },
        { email, id: userId }
      );
    }

    // Log activity
    await logActivity(authResult.user.id, 'create_user', 'user', userId, `Created user: ${email}`, req);

    const token = generateToken({ id: userId, email, role });

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      user: {
        id: userId,
        email,
        role,
        employeeId
      },
      token
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

