import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';

// Get all tasks
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
    const projectId = searchParams.get('project_id');
    const assignedTo = searchParams.get('assigned_to');
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');

    let query = `
      SELECT t.*, 
             p.name as project_name, p.project_code,
             e.first_name as assigned_first_name, e.last_name as assigned_last_name,
             e.employee_id as assigned_employee_id,
             u.email as created_by_email
      FROM tasks t
      LEFT JOIN projects p ON t.project_id = p.id
      LEFT JOIN employees e ON t.assigned_to = e.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    const params = [];

    // Employees/interns can only see their own tasks
    if (user.role === 'employee' || user.role === 'intern') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length > 0) {
        query += ' AND t.assigned_to = ?';
        params.push(userEmp[0].id);
      } else {
        return NextResponse.json({ success: true, tasks: [] });
      }
    }

    if (projectId) {
      query += ' AND t.project_id = ?';
      params.push(projectId);
    }

    if (assignedTo) {
      query += ' AND t.assigned_to = ?';
      params.push(assignedTo);
    }

    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }

    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }

    query += ' ORDER BY t.created_at DESC';

    const [tasks] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      tasks: tasks.map(task => ({
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
      }))
    });
  } catch (error) {
    console.error('Get tasks error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create task
export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const data = await req.json();
    const { projectId, title, description, assignedTo, status, priority, dueDate, estimatedHours } = data;

    if (!title) {
      return NextResponse.json(
        { error: 'Task title is required' },
        { status: 400 }
      );
    }

    const [result] = await pool.execute(
      `INSERT INTO tasks 
       (project_id, title, description, assigned_to, created_by, status, priority, due_date, estimated_hours)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectId, title, description, assignedTo, user.id, status || 'todo', 
       priority || 'medium', dueDate, estimatedHours]
    );

    await logActivity(user.id, 'create_task', 'task', result.insertId, 
      `Created task: ${title}`, req);

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      task: {
        id: result.insertId,
        title
      }
    });
  } catch (error) {
    console.error('Create task error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

