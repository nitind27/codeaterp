import { NextResponse } from 'next/server';
import pool from '../../../../../../../lib/db.js';
import { authenticate } from '../../../../../../../lib/auth.js';

// POST /api/performance/goals/[id]/updates - Add a progress update to a goal
export async function POST(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;
        const { id } = params;

        const body = await request.json();
        const { progress_value, progress_percentage, notes } = body;

        if (progress_percentage === undefined && progress_value === undefined) {
            return NextResponse.json({ error: 'Either progress_value or progress_percentage is required' }, { status: 400 });
        }

        const [goalRows] = await pool.execute(
            'SELECT g.*, e.user_id as employee_user_id FROM goals g JOIN employees e ON g.employee_id = e.id WHERE g.id = ?',
            [id]
        );

        if (goalRows.length === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        const goal = goalRows[0];
        let canUpdate = false;

        if (user.role === 'admin' || user.role === 'hr') {
            canUpdate = true;
        } else if (user.role === 'project_manager') {
            const [teamCheck] = await pool.execute(
                'SELECT e.id FROM employees e WHERE e.id = ? AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)',
                [goal.employee_id, user.id]
            );
            if (teamCheck.length > 0) canUpdate = true;
        } else if (user.role === 'employee' || user.role === 'intern') {
            if (goal.employee_user_id === user.id) canUpdate = true;
        }

        if (!canUpdate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const [result] = await pool.execute(
            'INSERT INTO goal_updates (goal_id, progress_value, progress_percentage, notes, updated_by) VALUES (?, ?, ?, ?, ?)',
            [id, progress_value || null, progress_percentage || null, notes || null, user.id]
        );

        if (progress_percentage !== undefined) {
            await pool.execute(
                'UPDATE goals SET progress_percentage = ?, current_value = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [progress_percentage, progress_value || goal.current_value, id]
            );
        }

        const [newUpdate] = await pool.execute('SELECT * FROM goal_updates WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Goal update added successfully', update: newUpdate[0] }, { status: 201 });

    } catch (error) {
        console.error('Error adding goal update:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET /api/performance/goals/[id]/updates - Get all updates for a goal
export async function GET(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;
        const { id } = params;

        const [goalRows] = await pool.execute(
            'SELECT g.*, e.user_id as employee_user_id FROM goals g JOIN employees e ON g.employee_id = e.id WHERE g.id = ?',
            [id]
        );

        if (goalRows.length === 0) {
            return NextResponse.json({ error: 'Goal not found' }, { status: 404 });
        }

        const goal = goalRows[0];

        if (user.role === 'employee' || user.role === 'intern') {
            if (goal.employee_user_id !== user.id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        } else if (user.role === 'project_manager') {
            const [teamCheck] = await pool.execute(
                'SELECT e.id FROM employees e WHERE e.id = ? AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)',
                [goal.employee_id, user.id]
            );
            if (teamCheck.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        const [updates] = await pool.execute(
            `SELECT gu.*, u.email as updated_by_email,
                e.first_name as updated_by_first_name, e.last_name as updated_by_last_name
            FROM goal_updates gu
            JOIN users u ON gu.updated_by = u.id
            LEFT JOIN employees e ON u.id = e.user_id
            WHERE gu.goal_id = ?
            ORDER BY gu.created_at DESC`,
            [id]
        );

        return NextResponse.json({ updates });

    } catch (error) {
        console.error('Error fetching goal updates:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
