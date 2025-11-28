import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate, authorize } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';

// Get single project
export async function GET(req, { params }) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = params;

    const [projects] = await pool.execute(
      `SELECT p.*, 
              pm.first_name as manager_first_name, pm.last_name as manager_last_name,
              pm.employee_id as manager_employee_id
       FROM projects p
       JOIN employees pm ON p.project_manager_id = pm.id
       WHERE p.id = ?`,
      [id]
    );

    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const proj = projects[0];

    // Get project members
    const [members] = await pool.execute(
      `SELECT pm.*, e.first_name, e.last_name, e.employee_id, e.designation
       FROM project_members pm
       JOIN employees e ON pm.employee_id = e.id
       WHERE pm.project_id = ?`,
      [id]
    );

    return NextResponse.json({
      success: true,
      project: {
        id: proj.id,
        projectCode: proj.project_code,
        name: proj.name,
        description: proj.description,
        projectManagerId: proj.project_manager_id,
        managerName: `${proj.manager_first_name} ${proj.manager_last_name}`,
        managerEmployeeId: proj.manager_employee_id,
        clientName: proj.client_name,
        startDate: proj.start_date,
        endDate: proj.end_date,
        status: proj.status,
        priority: proj.priority,
        budget: proj.budget,
        members: members.map(m => ({
          id: m.id,
          employeeId: m.employee_id,
          employeeName: `${m.first_name} ${m.last_name}`,
          employeeCode: m.employee_id,
          designation: m.designation,
          role: m.role,
          assignedAt: m.assigned_at
        })),
        createdAt: proj.created_at,
        updatedAt: proj.updated_at
      }
    });
  } catch (error) {
    console.error('Get project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update project
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

    // Check if user is project manager of this project or admin/hr
    const [projects] = await pool.execute(
      `SELECT p.*, pm.user_id as manager_user_id
       FROM projects p
       JOIN employees pm ON p.project_manager_id = pm.id
       WHERE p.id = ?`,
      [id]
    );

    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (user.role !== 'admin' && user.role !== 'hr' && projects[0].manager_user_id !== user.id) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['name', 'description', 'client_name', 'start_date', 'end_date', 
                          'status', 'priority', 'budget', 'project_manager_id'];

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
      `UPDATE projects SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    await logActivity(user.id, 'update_project', 'project', id, 
      `Updated project`, req);

    return NextResponse.json({
      success: true,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('Update project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete project
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

    const [projects] = await pool.execute('SELECT name FROM projects WHERE id = ?', [id]);

    if (projects.length === 0) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    await pool.execute('DELETE FROM projects WHERE id = ?', [id]);

    await logActivity(authResult.user.id, 'delete_project', 'project', id, 
      `Deleted project: ${projects[0].name}`, req);

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('Delete project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

