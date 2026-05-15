import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/performance/goals - Get all goals
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const category = searchParams.get('category');
        const priority = searchParams.get('priority');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        // Build WHERE clause based on filters
        const conditions = [];

        if (employeeId) {
            conditions.push(`g.employee_id = $${paramIndex}`);
            params.push(employeeId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`g.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (category) {
            conditions.push(`g.category = $${paramIndex}`);
            params.push(category);
            paramIndex++;
        }

        if (priority) {
            conditions.push(`g.priority = $${paramIndex}`);
            params.push(priority);
            paramIndex++;
        }

        // Permission checks
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can only see their own goals
            conditions.push(`g.employee_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})`);
            params.push(session.user.id);
            paramIndex++;
        } else if (session.user.role === 'project_manager') {
            // Project managers can see goals for their team members
            conditions.push(`g.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
                OR e.id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
            )`);
            params.push(session.user.id);
            paramIndex++;
        }
        // Admin and HR can see all goals

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM goals g
            ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get goals with pagination
        const goalsQuery = `
            SELECT
                g.*,
                e.first_name,
                e.last_name,
                e.employee_id as emp_id,
                e.designation,
                e.department,
                ab.first_name as assigned_by_first_name,
                ab.last_name as assigned_by_last_name,
                ap.first_name as approved_by_first_name,
                ap.last_name as approved_by_last_name,
                (
                    SELECT COUNT(*) FROM goal_updates gu
                    WHERE gu.goal_id = g.id
                ) as update_count,
                (
                    SELECT MAX(created_at) FROM goal_updates gu
                    WHERE gu.goal_id = g.id
                ) as last_update
            FROM goals g
            JOIN employees e ON g.employee_id = e.id
            JOIN users u_ab ON g.assigned_by = u_ab.id
            LEFT JOIN employees ab ON u_ab.id = ab.user_id
            LEFT JOIN users u_ap ON g.approved_by = u_ap.id
            LEFT JOIN employees ap ON u_ap.id = ap.user_id
            ${whereClause}
            ORDER BY g.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const goalsResult = await query(goalsQuery, params);

        return NextResponse.json({
            goals: goalsResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit
            }
        });

    } catch (error) {
        console.error('Error fetching goals:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/performance/goals - Create a new goal
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            employee_id,
            title,
            description,
            category = 'individual',
            priority = 'medium',
            status = 'draft',
            target_value,
            current_value = 0,
            unit,
            start_date,
            due_date,
            approved_by
        } = body;

        // Validate required fields
        if (!employee_id || !title) {
            return NextResponse.json(
                { error: 'Employee and title are required' },
                { status: 400 }
            );
        }

        // Check permissions
        let canCreate = false;

        if (checkPermission(session.user.role, ['admin', 'hr'])) {
            canCreate = true;
        } else if (session.user.role === 'project_manager') {
            // Project managers can create goals for their team members
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
            `, [employee_id, session.user.id]);

            if (teamCheck.rows.length > 0) {
                canCreate = true;
            }
        } else if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can create goals for themselves
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, employee_id]
            );

            if (employeeCheck.rows.length > 0) {
                canCreate = true;
                // Force status to draft for employee-created goals
                status = 'draft';
            }
        }

        if (!canCreate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Check if employee exists
        const employeeCheck = await query(
            'SELECT id FROM employees WHERE id = $1',
            [employee_id]
        );

        if (employeeCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        // Insert new goal
        const insertQuery = `
            INSERT INTO goals (
                employee_id, title, description, category, priority, status,
                target_value, current_value, unit, start_date, due_date, assigned_by, approved_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
            RETURNING *
        `;

        const values = [
            employee_id, title, description, category, priority, status,
            target_value, current_value, unit, start_date, due_date,
            session.user.id, approved_by
        ];

        const result = await query(insertQuery, values);

        return NextResponse.json({
            message: 'Goal created successfully',
            goal: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating goal:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
