import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/performance/goals/[id] - Get a specific goal with updates
export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Get goal with related data
        const goalQuery = `
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
                ap.last_name as approved_by_last_name
            FROM goals g
            JOIN employees e ON g.employee_id = e.id
            JOIN users u_ab ON g.assigned_by = u_ab.id
            LEFT JOIN employees ab ON u_ab.id = ab.user_id
            LEFT JOIN users u_ap ON g.approved_by = u_ap.id
            LEFT JOIN employees ap ON u_ap.id = ap.user_id
            WHERE g.id = $1
        `;

        const goalResult = await query(goalQuery, [id]);

        if (goalResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Goal not found' },
                { status: 404 }
            );
        }

        const goal = goalResult.rows[0];

        // Check permissions
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can only see their own goals
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1',
                [session.user.id]
            );
            if (employeeCheck.rows.length === 0 || goal.employee_id !== employeeCheck.rows[0].id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        } else if (session.user.role === 'project_manager') {
            // Project managers can see goals for their team members
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND (
                    e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
                    OR e.id = (SELECT id FROM employees WHERE user_id = $2)
                )
            `, [goal.employee_id, session.user.id]);

            if (teamCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }
        // Admin and HR can see all goals

        // Get goal updates
        const updatesQuery = `
            SELECT gu.*, u.email as updated_by_email
            FROM goal_updates gu
            JOIN users u ON gu.updated_by = u.id
            WHERE gu.goal_id = $1
            ORDER BY gu.created_at DESC
        `;

        const updatesResult = await query(updatesQuery, [id]);

        return NextResponse.json({
            goal,
            updates: updatesResult.rows
        });

    } catch (error) {
        console.error('Error fetching goal:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/performance/goals/[id] - Update a goal
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();

        // Check if goal exists
        const existingGoal = await query(
            'SELECT * FROM goals WHERE id = $1',
            [id]
        );

        if (existingGoal.rows.length === 0) {
            return NextResponse.json(
                { error: 'Goal not found' },
                { status: 404 }
            );
        }

        const goal = existingGoal.rows[0];

        // Check permissions
        let canUpdate = false;

        if (checkPermission(session.user.role, ['admin', 'hr'])) {
            canUpdate = true;
        } else if (session.user.role === 'project_manager') {
            // Check if the assigned_by is the current user or a team member
            const assignedCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, goal.assigned_by]
            );
            if (assignedCheck.rows.length > 0) {
                canUpdate = true;
            }
        } else if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can update their own goals (limited fields)
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, goal.employee_id]
            );
            if (employeeCheck.rows.length > 0) {
                // Employees can only update progress and status (to completed)
                const allowedFields = ['current_value', 'progress_percentage', 'status'];
                const hasInvalidFields = Object.keys(body).some(field => !allowedFields.includes(field));

                if (hasInvalidFields) {
                    return NextResponse.json(
                        { error: 'Employees can only update progress fields' },
                        { status: 403 }
                    );
                }

                // Only allow status change to 'completed' or progress updates
                if (body.status && !['in_progress', 'completed'].includes(body.status)) {
                    return NextResponse.json(
                        { error: 'Invalid status change' },
                        { status: 400 }
                    );
                }

                canUpdate = true;
            }
        }

        if (!canUpdate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Build update query
        const updateFields = [];
        const values = [];
        let paramIndex = 1;

        const allowedUpdates = [
            'title', 'description', 'category', 'priority', 'status',
            'target_value', 'current_value', 'unit', 'start_date',
            'due_date', 'completion_date', 'progress_percentage', 'approved_by'
        ];

        Object.keys(body).forEach(field => {
            if (allowedUpdates.includes(field)) {
                updateFields.push(`${field} = $${paramIndex}`);
                values.push(body[field]);
                paramIndex++;
            }
        });

        if (updateFields.length === 0) {
            return NextResponse.json(
                { error: 'No valid fields to update' },
                { status: 400 }
            );
        }

        // Add updated_at
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

        const updateQuery = `
            UPDATE goals
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        values.push(id);

        const result = await query(updateQuery, values);

        return NextResponse.json({
            message: 'Goal updated successfully',
            goal: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating goal:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/performance/goals/[id] - Delete a goal
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Admin and HR can delete goals
        if (!checkPermission(session.user.role, ['admin', 'hr'])) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { id } = params;

        // Check if goal exists
        const existingGoal = await query(
            'SELECT id FROM goals WHERE id = $1',
            [id]
        );

        if (existingGoal.rows.length === 0) {
            return NextResponse.json(
                { error: 'Goal not found' },
                { status: 404 }
            );
        }

        // Delete goal updates first (cascade will handle this, but being explicit)
        await query('DELETE FROM goal_updates WHERE goal_id = $1', [id]);

        // Delete the goal
        await query('DELETE FROM goals WHERE id = $1', [id]);

        return NextResponse.json({
            message: 'Goal deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting goal:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
