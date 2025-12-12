import pool from '../../../../lib/db.js';
import { authorize, hashPassword } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';
import { validateEmail, generateEmployeeId } from '../../../../lib/utils.js';
import { sendWelcomeEmailWithCredentials } from '../../../../lib/email.js';
import { handleOptions, errorResponse, successResponse } from '../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Get all employees
export async function GET(req) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get('department');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 50;
    const offset = (page - 1) * limit;

    let query = `
      SELECT e.*, u.email, u.role, u.is_active,
             m.first_name as manager_first_name, m.last_name as manager_last_name
      FROM employees e
      JOIN users u ON e.user_id = u.id
      LEFT JOIN employees m ON e.manager_id = m.id
      WHERE 1=1
    `;
    const params = [];

    if (department) {
      query += ' AND e.department = ?';
      params.push(department);
    }

    if (status) {
      query += ' AND u.is_active = ?';
      params.push(status === 'active');
    }

    if (search) {
      query += ' AND (e.first_name LIKE ? OR e.last_name LIKE ? OR e.employee_id LIKE ? OR u.email LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }

    // Get total count for pagination
    const countQuery = query.replace(/SELECT[\s\S]*FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await pool.execute(countQuery, params);
    const total = countResult[0].total;

    query += ` ORDER BY e.created_at DESC LIMIT ${limit} OFFSET ${offset}`;

    const [employees] = await pool.execute(query, params);

    return successResponse({
      employees: employees.map(emp => ({
        id: emp.id,
        userId: emp.user_id,
        employeeId: emp.employee_id,
        email: emp.email,
        firstName: emp.first_name,
        lastName: emp.last_name,
        fullName: `${emp.first_name} ${emp.last_name}`,
        phone: emp.phone,
        dateOfBirth: emp.date_of_birth,
        gender: emp.gender,
        address: emp.address,
        city: emp.city,
        state: emp.state,
        country: emp.country,
        postalCode: emp.postal_code,
        avatar: emp.avatar,
        department: emp.department,
        designation: emp.designation,
        joiningDate: emp.joining_date,
        salary: emp.salary,
        employmentType: emp.employment_type,
        managerId: emp.manager_id,
        managerName: emp.manager_first_name && emp.manager_last_name 
          ? `${emp.manager_first_name} ${emp.manager_last_name}` 
          : null,
        role: emp.role,
        isActive: emp.is_active,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Flutter Get employees error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Create employee
export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status, {
        sessionExpired: authResult.sessionExpired || false
      });
    }

    const data = await req.json();
    const { email, password, role, first_name, last_name, phone, department, designation, joining_date, ...otherData } = data;

    // Validate required fields
    if (!email || !password || !role) {
      return errorResponse('Email, password, and role are required', 400);
    }

    if (!validateEmail(email)) {
      return errorResponse('Invalid email format', 400);
    }

    // Check if user already exists
    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existingUsers.length > 0) {
      return errorResponse('User with this email already exists', 400);
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const [userResult] = await pool.execute(
      'INSERT INTO users (email, password, role, is_active) VALUES (?, ?, ?, ?)',
      [email, hashedPassword, role, true]
    );

    const userId = userResult.insertId;

    // Create employee record if employee/intern role
    let employeeId = null;
    if (role === 'employee' || role === 'intern' || role === 'project_manager') {
      const empId = generateEmployeeId();
      
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
          first_name || '',
          last_name || '',
          phone || null,
          otherData.date_of_birth || null,
          otherData.gender || null,
          otherData.address || null,
          otherData.city || null,
          otherData.state || null,
          otherData.country || 'India',
          otherData.postal_code || null,
          department || null,
          designation || null,
          joining_date || new Date(),
          otherData.salary || null,
          otherData.employment_type || 'full_time',
          otherData.manager_id || null,
          otherData.emergency_contact_name || null,
          otherData.emergency_contact_phone || null
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
    }

    // Log activity
    await logActivity(authResult.user.id, 'create_employee', 'employee', employeeId, 
      `Created employee via Flutter: ${first_name} ${last_name}`, req);

    // Get the generated employee ID for response
    let generatedEmpId = null;
    if (employeeId) {
      const [empData] = await pool.execute(
        'SELECT employee_id FROM employees WHERE id = ?',
        [employeeId]
      );
      if (empData.length > 0) {
        generatedEmpId = empData[0].employee_id;
      }
    }

    // Send welcome email
    let emailSent = false;
    try {
      const emailResult = await sendWelcomeEmailWithCredentials({
        email: email,
        password: password,
        firstName: first_name || '',
        lastName: last_name || '',
        employeeId: generatedEmpId || 'N/A',
        role: role,
        designation: designation || null,
        department: department || null,
        joiningDate: joining_date || new Date()
      });
      
      emailSent = emailResult.success;
    } catch (emailError) {
      console.error('Welcome email error:', emailError);
    }

    return successResponse({
      message: emailSent 
        ? 'Employee created successfully! Welcome email sent.' 
        : 'Employee created successfully! (Email could not be sent)',
      emailSent: emailSent,
      user: {
        id: userId,
        email,
        role,
        employeeId: employeeId,
        employeeCode: generatedEmpId
      }
    });
  } catch (error) {
    console.error('Flutter Create employee error:', error);
    return errorResponse('Internal server error', 500);
  }
}

