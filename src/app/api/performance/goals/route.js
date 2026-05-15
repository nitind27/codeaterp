import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// GET /api/performance/goals - Get all goals
export async function GET(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const priority = searchParams.get('priority');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (employeeId) { conditions.push('g.employee_id = ?'); params.push(employeeId); }
        if (status) { conditions.push('g.status = ?'); params.push(status); }
        if (category) { conditions.push('g.category = ?'); params.push(category); }
        if (priority) { conditions.push('g.priority = ?'); params.push(priority); }

        if (user.role === 'employee' || user.role === 'intern') {
            conditions.push('g.employee_id = (SELECT id FROM employees WHERE user_id = ?)');
            params.push(user.id);
        } else if (user.role === 'project_manager') {
            conditions.push(`g.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = ?)
                OR e.id = (SELECT id FROM employees WHERE user_id = ?)
            )`);
            params.push(user.id, user.id);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) as total FROM goals g ${whereClause}`, params
        );
        const totalRecords = parseInt(countRows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        const [goals] = await pool.execute(
            `SELECT
                g.*,
                e.first_name, e.last_name, e.employee_id as emp_id, e.designation, e.department,
                ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name,
                ap.first_name as approved_by_first_name, ap.last_name as approved_by_last_name,
                (SELECT COUNT(*) FROM goal_updates gu WHERE gu.goal_id = g.id) as update_count,
                (SELECT MAX(created_at) FROM goal_updates gu WHERE gu.goal_id = g.id) as last_update
            FROM goals g
            JOIN employees e ON g.employee_id = e.id
            JOIN users u_ab ON g.assigned_by = u_ab.id
            LEFT JOIN employees ab ON u_ab.id = ab.user_id
            LEFT JOIN users u_ap ON g.approved_by = u_ap.id
            LEFT JOIN employees ap ON u_ap.id = ap.user_id
            ${whereClause}
            ORDER BY g.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            goals,
            pagination: { current_page: page, total_pages: totalPages, total_records: totalRecords, per_page: limit }
        });

    } catch (error) {
        console.error('Error fetching goals:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/performance/goals - Create a new goal
export async function POST(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        const body = await request.json();
        const {
            employee_id, title, description, category = 'individual', priority = 'medium',
            target_value, current_value = 0, unit, start_date, due_date, approved_by
        } = body;
        let goalStatus = body.status || 'draft';

        if (!employee_id || !title) {
            return NextResponse.json({ error: 'Employee and title are required' }, { status: 400 });
        }

        let canCreate = false;

        if (user.role === 'admin' || user.role === 'hr') {
            canCreate = true;
        } else if (user.role === 'project_manager') {
            const [teamCheck] = await pool.execute(
                'SELECT e.id FROM employees e WHERE e.id = ? AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)',
                [employee_id, user.id]
            );
            if (teamCheck.length > 0) canCreate = true;
        } else if (user.role === 'employee' || user.role === 'intern') {
            const [empCheck] = await pool.execute(
                'SELECT id FROM employees WHERE user_id = ? AND id = ?',
                [user.id, employee_id]
            );
            if (empCheck.length > 0) { canCreate = true; goalStatus = 'draft'; }
        }

        if (!canCreate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const [empCheck] = await pool.execute('SELECT id FROM employees WHERE id = ?', [employee_id]);
        if (empCheck.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const [result] = await pool.execute(
            `INSERT INTO goals (
                employee_id, title, description, category, priority, status,
                target_value, current_value, unit, start_date, due_date, assigned_by, approved_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employee_id, title, description || null, category, priority, goalStatus,
                target_value || null, current_value, unit || null,
                start_date || null, due_date || null, user.id, approved_by || null
            ]
        );

        const [newGoal] = await pool.execute('SELECT * FROM goals WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Goal created successfully', goal: newGoal[0] }, { status: 201 });

    } catch (error) {
        console.error('Error creating goal:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
