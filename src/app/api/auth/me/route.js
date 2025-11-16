import { NextResponse } from 'next/server';
import { authenticate } from '../../../../../lib/auth.js';
import pool from '../../../../../lib/db.js';

export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;

    // Get employee details if exists
    const [employees] = await pool.execute(
      `SELECT e.*, u.email, u.role 
       FROM employees e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.user_id = ?`,
      [user.id]
    );

    const employee = employees.length > 0 ? employees[0] : null;

    return NextResponse.json({
      success: true,
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
          address: employee.address,
          city: employee.city,
          state: employee.state,
          country: employee.country,
          postalCode: employee.postal_code,
          avatar: employee.avatar,
          department: employee.department,
          designation: employee.designation,
          joiningDate: employee.joining_date,
          salary: employee.salary,
          employmentType: employee.employment_type,
          managerId: employee.manager_id,
          emergencyContactName: employee.emergency_contact_name,
          emergencyContactPhone: employee.emergency_contact_phone
        } : null
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

