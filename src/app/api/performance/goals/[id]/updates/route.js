import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';

// POST /api/performance/goals/[id]/updates - Add a progress update to a goal
export async function POST(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();
        const { progress_value, progress_percentage, notes } = body;

        // Validate required fields
        if (progress_percentage === undefined && progress_value === undefined) {
            return NextResponse.json(
                { error: 'Either progress_value or progress_percentage is required' },
                { status: 400 }
            );
        }

        // Check if goal exists and user has access
        const goalCheck = await query(
            'SELECT g.*, e.user_id as employee_user_id FROM goals g JOIN employees e ON g.employee_id = e.id WHERE g.id = $1',
            [id]
        );

        if (goalCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'Goal not found' },
                { status: 404 }
            );
        }

        const goal = goalCheck.rows[0];

        // Check permissions - employee can update their own goals, managers can update team goals, HR/Admin can update all
        let canUpdate = false;

        if (session.user.role === 'admin' || session.user.role === 'hr') {
            canUpdate = true;
        } else if (session.user.role === 'project_manager') {
            // Check if goal belongs to team member
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
            `, [goal.employee_id, session.user.id]);

            if (teamCheck.rows.length > 0) {
                canUpdate = true;
            }
        } else if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can update their own goals
            if (goal.employee_user_id === session.user.id) {
                canUpdate = true;
            }
        }

        if (!canUpdate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Insert goal update
        const insertQuery = `
            INSERT INTO goal_updates (goal_id, progress_value, progress_percentage, notes, updated_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
        `;

        const values = [id, progress_value, progress_percentage, notes, session.user.id];
        const result = await query(insertQuery, values);

        // Update goal's current progress if progress_percentage provided
        if (progress_percentage !== undefined) {
            await query(
                'UPDATE goals SET progress_percentage = $1, current_value = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
                [progress_percentage, progress_value || goal.current_value, id]
            );
        }

        return NextResponse.json({
            message: 'Goal update added successfully',
            update: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error adding goal update:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// GET /api/performance/goals/[id]/updates - Get all updates for a goal
export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Check if goal exists and user has access
        const goalCheck = await query(
            'SELECT g.*, e.user_id as employee_user_id FROM goals g JOIN employees e ON g.employee_id = e.id WHERE g.id = $1',
            [id]
        );

        if (goalCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'Goal not found' },
                { status: 404 }
            );
        }

        const goal = goalCheck.rows[0];

        // Check permissions
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            if (goal.employee_user_id !== session.user.id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        } else if (session.user.role === 'project_manager') {
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
            `, [goal.employee_id, session.user.id]);

            if (teamCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }
        // Admin and HR can see all updates

        // Get goal updates
        const updatesQuery = `
            SELECT
                gu.*,
                u.email as updated_by_email,
                e.first_name as updated_by_first_name,
                e.last_name as updated_by_last_name
            FROM goal_updates gu
            JOIN users u ON gu.updated_by = u.id
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE gu.goal_id = $1
            ORDER BY gu.created_at DESC
        `;

        const updatesResult = await query(updatesQuery, [id]);

        return NextResponse.json({
            updates: updatesResult.rows
        });

    } catch (error) {
        console.error('Error fetching goal updates:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
