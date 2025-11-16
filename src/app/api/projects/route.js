import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate, authorize } from '../../../../lib/auth.js';
import { generateProjectCode } from '../../../../lib/utils.js';
import { logActivity } from '../../../../lib/logger.js';

// Get all projects
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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const managerId = searchParams.get('manager_id');
    const search = searchParams.get('search');

    let query = `
      SELECT p.*, 
             pm.first_name as manager_first_name, pm.last_name as manager_last_name,
             pm.employee_id as manager_employee_id,
             COUNT(DISTINCT pmem.employee_id) as member_count,
             COUNT(DISTINCT t.id) as task_count
      FROM projects p
      JOIN employees pm ON p.project_manager_id = pm.id
      LEFT JOIN project_members pmem ON p.id = pmem.project_id
      LEFT JOIN tasks t ON p.id = t.project_id
      WHERE 1=1
    `;
    const params = [];

    // Project managers can only see their own projects unless admin/hr
    if (user.role === 'project_manager') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length > 0) {
        query += ' AND (p.project_manager_id = ? OR EXISTS (SELECT 1 FROM project_members WHERE project_id = p.id AND employee_id = ?))';
        params.push(userEmp[0].id, userEmp[0].id);
      }
    }

    if (status) {
      query += ' AND p.status = ?';
      params.push(status);
    }

    if (managerId) {
      query += ' AND p.project_manager_id = ?';
      params.push(managerId);
    }

    if (search) {
      query += ' AND (p.name LIKE ? OR p.project_code LIKE ? OR p.client_name LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
    }

    query += ' GROUP BY p.id ORDER BY p.created_at DESC';

    const [projects] = await pool.execute(query, params);

    return NextResponse.json({
      success: true,
      projects: projects.map(proj => ({
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
        memberCount: proj.member_count,
        taskCount: proj.task_count,
        createdAt: proj.created_at,
        updatedAt: proj.updated_at
      }))
    });
  } catch (error) {
    console.error('Get projects error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create project
export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { user } = authResult;
    const data = await req.json();
    const { name, description, projectManagerId, clientName, startDate, endDate, status, priority, budget } = data;

    if (!name || !projectManagerId) {
      return NextResponse.json(
        { error: 'Project name and manager are required' },
        { status: 400 }
      );
    }

    // If project_manager role, they can only create projects for themselves
    if (user.role === 'project_manager') {
      const [userEmp] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (userEmp.length === 0 || userEmp[0].id !== parseInt(projectManagerId)) {
        return NextResponse.json(
          { error: 'You can only create projects assigned to you' },
          { status: 403 }
        );
      }
    }

    const projectCode = generateProjectCode(name);

    const [result] = await pool.execute(
      `INSERT INTO projects 
       (project_code, name, description, project_manager_id, client_name, start_date, end_date, status, priority, budget)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [projectCode, name, description, projectManagerId, clientName, startDate, endDate, 
       status || 'planning', priority || 'medium', budget]
    );

    await logActivity(user.id, 'create_project', 'project', result.insertId, 
      `Created project: ${name}`, req);

    return NextResponse.json({
      success: true,
      message: 'Project created successfully',
      project: {
        id: result.insertId,
        projectCode,
        name
      }
    });
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

