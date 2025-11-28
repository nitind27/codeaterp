import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize, authenticate } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';

// Get single employee
export async function GET(req, { params }) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = params;

    // Users can only view their own profile unless they're admin/hr/pm
    const [employees] = await pool.execute(
      `SELECT e.*, u.email, u.role, u.is_active,
              m.first_name as manager_first_name, m.last_name as manager_last_name
       FROM employees e
       JOIN users u ON e.user_id = u.id
       LEFT JOIN employees m ON e.manager_id = m.id
       WHERE e.id = ?`,
      [id]
    );

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const emp = employees[0];

    // Check permission
    if (user.role !== 'admin' && user.role !== 'hr' && user.role !== 'project_manager') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length === 0 || userEmp[0].id !== parseInt(id)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      employee: {
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
        emergencyContactName: emp.emergency_contact_name,
        emergencyContactPhone: emp.emergency_contact_phone,
        role: emp.role,
        isActive: emp.is_active,
        createdAt: emp.created_at,
        updatedAt: emp.updated_at
      }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update employee
export async function PUT(req, { params }) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const { id } = params;
    const data = await req.json();

    // Check permission
    if (user.role !== 'admin' && user.role !== 'hr') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length === 0 || userEmp[0].id !== parseInt(id)) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      // Employees can only update limited fields
      delete data.salary;
      delete data.department;
      delete data.designation;
      delete data.employment_type;
      delete data.manager_id;
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = [
      'first_name', 'last_name', 'phone', 'date_of_birth', 'gender',
      'address', 'city', 'state', 'country', 'postal_code', 'avatar',
      'department', 'designation', 'salary', 'employment_type', 'manager_id',
      'emergency_contact_name', 'emergency_contact_phone'
    ];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbField} = ?`);
        updateValues.push(data[field]);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'No valid fields to update' },
        { status: 400 }
      );
    }

    updateValues.push(id);

    await pool.execute(
      `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    await logActivity(user.id, 'update_employee', 'employee', id, 
      `Updated employee profile`, req);

    return NextResponse.json({
      success: true,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete employee
export async function DELETE(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = params;

    // Get employee details for logging
    const [employees] = await pool.execute(
      'SELECT * FROM employees WHERE id = ?',
      [id]
    );

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    // Delete employee (cascade will delete user)
    await pool.execute('DELETE FROM employees WHERE id = ?', [id]);

    await logActivity(authResult.user.id, 'delete_employee', 'employee', id, 
      `Deleted employee: ${employees[0].employee_id}`, req);

    return NextResponse.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

