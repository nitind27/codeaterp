import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate, authorize } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';

// Get single task
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

    const [tasks] = await pool.execute(
      `SELECT t.*, 
              p.name as project_name, p.project_code,
              e.first_name as assigned_first_name, e.last_name as assigned_last_name,
              e.employee_id as assigned_employee_id,
              u.email as created_by_email
       FROM tasks t
       LEFT JOIN projects p ON t.project_id = p.id
       LEFT JOIN employees e ON t.assigned_to = e.id
       LEFT JOIN users u ON t.created_by = u.id
       WHERE t.id = ?`,
      [id]
    );

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = tasks[0];

    return NextResponse.json({
      success: true,
      task: {
        id: task.id,
        projectId: task.project_id,
        projectName: task.project_name,
        projectCode: task.project_code,
        title: task.title,
        description: task.description,
        assignedTo: task.assigned_to,
        assignedName: task.assigned_first_name && task.assigned_last_name
          ? `${task.assigned_first_name} ${task.assigned_last_name}`
          : null,
        assignedEmployeeId: task.assigned_employee_id,
        createdBy: task.created_by,
        createdByEmail: task.created_by_email,
        status: task.status,
        priority: task.priority,
        dueDate: task.due_date,
        estimatedHours: task.estimated_hours,
        actualHours: task.actual_hours,
        createdAt: task.created_at,
        updatedAt: task.updated_at
      }
    });
  } catch (error) {
    console.error('Get task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Update task
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
    const [tasks] = await pool.execute(
      'SELECT * FROM tasks WHERE id = ?',
      [id]
    );

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const task = tasks[0];

    // Employees can only update their own tasks (limited fields)
    if (user.role === 'employee' || user.role === 'intern') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length === 0 || userEmp[0].id !== task.assigned_to) {
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        );
      }
      // Employees can only update status and actual_hours
      const allowedFields = ['status', 'actual_hours'];
      Object.keys(data).forEach(key => {
        if (!allowedFields.includes(key)) {
          delete data[key];
        }
      });
    }

    const updateFields = [];
    const updateValues = [];

    const allowedFields = ['title', 'description', 'assigned_to', 'status', 'priority', 
                          'due_date', 'estimated_hours', 'actual_hours'];

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
      `UPDATE tasks SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
      updateValues
    );

    await logActivity(user.id, 'update_task', 'task', id, 
      `Updated task`, req);

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully'
    });
  } catch (error) {
    console.error('Update task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Delete task
export async function DELETE(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = params;

    const [tasks] = await pool.execute('SELECT title FROM tasks WHERE id = ?', [id]);

    if (tasks.length === 0) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    await pool.execute('DELETE FROM tasks WHERE id = ?', [id]);

    await logActivity(authResult.user.id, 'delete_task', 'task', id, 
      `Deleted task: ${tasks[0].title}`, req);

    return NextResponse.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    console.error('Delete task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

