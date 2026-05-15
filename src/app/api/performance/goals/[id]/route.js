import { NextResponse } from 'next/server';
import pool from '../../../../../../lib/db.js';
import { authenticate } from '../../../../../../lib/auth.js';

// GET /api/performance/goals/[id] - Get a specific goal with updates
export async function GET(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;
        const { id } = params;

        const [goalRows] = await pool.execute(
            `SELECT g.*,
                e.first_name, e.last_name, e.employee_id as emp_id, e.designation, e.department,
                ab.first_name as assigned_by_first_name, ab.last_name as assigned_by_last_name,
                ap.first_name as approved_by_first_name, ap.last_name as approved_by_last_name
            FROM goals g
            JOIN employees e ON g.employee_id = e.id
            JOIN users u_ab ON g.assigned_by = u_ab.id
            LEFT JOIN employees ab ON u_ab.id = ab.user_id
            LEFT JOIN users u_ap ON g.approved_by = u_ap.id
            LEFT JOIN employees ap ON u_ap.id = ap.user_id
            WHERE g.id = ?`,
            [id]
        );

        if (goalRows.length === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        const goal = goalRows[0];

        if (user.role === 'employee' || user.role === 'intern') {
            const [empCheck] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
            if (empCheck.length === 0 || goal.employee_id !== empCheck[0].id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        } else if (user.role === 'project_manager') {
            const [teamCheck] = await pool.execute(
                `SELECT e.id FROM employees e WHERE e.id = ? AND (
                    e.manager_id = (SELECT id FROM employees WHERE user_id = ?)
                    OR e.id = (SELECT id FROM employees WHERE user_id = ?)
                )`,
                [goal.employee_id, user.id, user.id]
            );
            if (teamCheck.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        const [updates] = await pool.execute(
            `SELECT gu.*, u.email as updated_by_email
            FROM goal_updates gu
            JOIN users u ON gu.updated_by = u.id
            WHERE gu.goal_id = ?
            ORDER BY gu.created_at DESC`,
            [id]
        );

        return NextResponse.json({ goal, updates });

    } catch (error) {
        console.error('Error fetching goal:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/performance/goals/[id] - Update a goal
export async function PUT(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;
        const { id } = params;
        const body = await request.json();

        const [existingRows] = await pool.execute('SELECT * FROM goals WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }
        const goal = existingRows[0];

        let canUpdate = false;

        if (user.role === 'admin' || user.role === 'hr') {
            canUpdate = true;
        } else if (user.role === 'project_manager') {
            const [assignedCheck] = await pool.execute(
                'SELECT id FROM employees WHERE user_id = ? AND id = ?',
                [user.id, goal.assigned_by]
            );
            if (assignedCheck.length > 0) canUpdate = true;
        } else if (user.role === 'employee' || user.role === 'intern') {
            const [empCheck] = await pool.execute(
                'SELECT id FROM employees WHERE user_id = ? AND id = ?',
                [user.id, goal.employee_id]
            );
            if (empCheck.length > 0) {
                const allowedFields = ['current_value', 'progress_percentage', 'status'];
                if (Object.keys(body).some(f => !allowedFields.includes(f))) {
                    return NextResponse.json({ error: 'Employees can only update progress fields' }, { status: 403 });
                }
                if (body.status && !['in_progress', 'completed'].includes(body.status)) {
                    return NextResponse.json({ error: 'Invalid status change' }, { status: 400 });
                }
                canUpdate = true;
            }
        }

        if (!canUpdate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const allowedUpdates = [
            'title', 'description', 'category', 'priority', 'status',
            'target_value', 'current_value', 'unit', 'start_date',
            'due_date', 'completion_date', 'progress_percentage', 'approved_by'
        ];

        const updateFields = [];
        const values = [];

        Object.keys(body).forEach(field => {
            if (allowedUpdates.includes(field)) {
                updateFields.push(`${field} = ?`);
                values.push(body[field]);
            }
        });

        if (updateFields.length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        updateFields.push('updated_at = CURRENT_TIMESTAMP');
        values.push(id);

        await pool.execute(`UPDATE goals SET ${updateFields.join(', ')} WHERE id = ?`, values);
        const [updated] = await pool.execute('SELECT * FROM goals WHERE id = ?', [id]);

        return NextResponse.json({ message: 'Goal updated successfully', goal: updated[0] });

    } catch (error) {
        console.error('Error updating goal:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/performance/goals/[id] - Delete a goal
export async function DELETE(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        if (!['admin', 'hr'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { id } = params;

        const [existing] = await pool.execute('SELECT id FROM goals WHERE id = ?', [id]);
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        await pool.execute('DELETE FROM goal_updates WHERE goal_id = ?', [id]);
        await pool.execute('DELETE FROM goals WHERE id = ?', [id]);

        return NextResponse.json({ message: 'Goal deleted successfully' });

    } catch (error) {
        console.error('Error deleting goal:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
