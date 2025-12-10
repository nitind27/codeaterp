import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

// Get all complaints
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
    const status = searchParams.get('status');
    const category = searchParams.get('category');
    const priority = searchParams.get('priority');

    let query = `
      SELECT c.*, 
             e.first_name, e.last_name, e.employee_id,
             u.email as assigned_to_email,
             r.email as resolved_by_email
      FROM complaints c
      JOIN employees e ON c.employee_id = e.id
      LEFT JOIN users u ON c.assigned_to = u.id
      LEFT JOIN users r ON c.resolved_by = r.id
      WHERE 1=1
    `;
    const params = [];

    // Employees can only see their own complaints
    if (user.role === 'employee' || user.role === 'intern') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length > 0) {
        query += ' AND c.employee_id = ?';
        params.push(userEmp[0].id);
      } else {
        return NextResponse.json({ success: true, complaints: [] });
      }
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND c.category = ?';
      params.push(category);
    }

    if (priority) {
      query += ' AND c.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY c.created_at DESC';

    const [complaints] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      complaints: complaints.map(comp => ({
        id: comp.id,
        employeeId: comp.employee_id,
        employeeName: `${comp.first_name} ${comp.last_name}`,
        employeeCode: comp.employee_id,
        subject: comp.subject,
        description: comp.description,
        category: comp.category,
        status: comp.status,
        priority: comp.priority,
        assignedTo: comp.assigned_to,
        assignedToEmail: comp.assigned_to_email,
        resolution: comp.resolution,
        resolvedAt: comp.resolved_at,
        resolvedBy: comp.resolved_by,
        resolvedByEmail: comp.resolved_by_email,
        createdAt: comp.created_at,
        updatedAt: comp.updated_at
      }))
    });
  } catch (error) {
    console.error('Get complaints error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create complaint
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
    const { subject, description, category, priority } = await req.json();

    if (!subject || !description) {
      return NextResponse.json(
        { error: 'Subject and description are required' },
        { status: 400 }
      );
    }

    // Get employee
    const [employees] = await pool.execute(
      'SELECT id FROM employees WHERE user_id = ?',
      [user.id]
    );

    if (employees.length === 0) {
      return NextResponse.json(
        { error: 'Employee record not found' },
        { status: 404 }
      );
    }

    const employeeId = employees[0].id;

    const [result] = await pool.execute(
      `INSERT INTO complaints 
       (employee_id, subject, description, category, priority, status)
       VALUES (?, ?, ?, ?, ?, 'open')`,
      [employeeId, subject, description, category || 'other', priority || 'medium']
    );

    await logActivity(user.id, 'create_complaint', 'complaint', result.insertId, 
      `Created complaint: ${subject}`, req);

    return NextResponse.json({
      success: true,
      message: 'Complaint submitted successfully',
      complaintId: result.insertId
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

