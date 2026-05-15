import { NextResponse } from 'next/server';
import pool from '../../../../../../lib/db.js';
import { authenticate } from '../../../../../../lib/auth.js';

// GET /api/performance/reviews/[id] - Get a specific performance review
export async function GET(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;
        const { id } = params;

        const [reviewRows] = await pool.execute(
            `SELECT
                pr.*,
                rc.name as cycle_name, rc.start_date as cycle_start_date, rc.end_date as cycle_end_date, rc.review_type,
                e.first_name, e.last_name, e.employee_id as emp_id, e.designation, e.department,
                r.first_name as reviewer_first_name, r.last_name as reviewer_last_name, r.employee_id as reviewer_emp_id,
                u.email as employee_email,
                approver.first_name as approver_first_name, approver.last_name as approver_last_name
            FROM performance_reviews pr
            JOIN review_cycles rc ON pr.review_cycle_id = rc.id
            JOIN employees e ON pr.employee_id = e.id
            JOIN employees r ON pr.reviewer_id = r.id
            JOIN users u ON e.user_id = u.id
            LEFT JOIN users approver_user ON pr.approved_by = approver_user.id
            LEFT JOIN employees approver ON approver_user.id = approver.user_id
            WHERE pr.id = ?`,
            [id]
        );

        if (reviewRows.length === 0) {
            return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
        }

        const review = reviewRows[0];

        if (user.role === 'employee' || user.role === 'intern') {
            const [empCheck] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
            if (empCheck.length === 0 || review.employee_id !== empCheck[0].id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        } else if (user.role === 'project_manager') {
            const [teamCheck] = await pool.execute(
                `SELECT e.id FROM employees e WHERE e.id = ? AND (
                    e.manager_id = (SELECT id FROM employees WHERE user_id = ?)
                    OR e.id = (SELECT id FROM employees WHERE user_id = ?)
                )`,
                [review.employee_id, user.id, user.id]
            );
            if (teamCheck.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }

        return NextResponse.json({ review });

    } catch (error) {
        console.error('Error fetching performance review:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT /api/performance/reviews/[id] - Update a performance review
export async function PUT(request, { params }) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;
        const { id } = params;
        const body = await request.json();

        const [existingRows] = await pool.execute('SELECT * FROM performance_reviews WHERE id = ?', [id]);
        if (existingRows.length === 0) {
            return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
        }
        const review = existingRows[0];

        let canUpdate = false;

        if (user.role === 'admin' || user.role === 'hr') {
            canUpdate = true;
        } else if (user.role === 'project_manager') {
            const [reviewerCheck] = await pool.execute(
                'SELECT id FROM employees WHERE user_id = ? AND id = ?',
                [user.id, review.reviewer_id]
            );
            if (reviewerCheck.length > 0) canUpdate = true;
        } else if (user.role === 'employee' || user.role === 'intern') {
            const [empCheck] = await pool.execute(
                'SELECT id FROM employees WHERE user_id = ? AND id = ?',
                [user.id, review.employee_id]
            );
            if (empCheck.length > 0) {
                const allowedFields = ['self_rating', 'self_review', 'status'];
                if (Object.keys(body).some(f => !allowedFields.includes(f))) {
                    return NextResponse.json({ error: 'Employees can only update self-review fields' }, { status: 403 });
                }
                if (body.status && body.status !== 'self_review_pending') {
                    return NextResponse.json({ error: 'Invalid status change' }, { status: 400 });
                }
                canUpdate = true;
            }
        }

        if (!canUpdate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const allowedUpdates = [
            'self_rating', 'reviewer_rating', 'overall_rating', 'status',
            'self_review', 'reviewer_feedback', 'goals_achievement',
            'strengths', 'areas_for_improvement', 'development_plan',
            'next_review_date', 'approved_by', 'approved_at'
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

        await pool.execute(`UPDATE performance_reviews SET ${updateFields.join(', ')} WHERE id = ?`, values);
        const [updated] = await pool.execute('SELECT * FROM performance_reviews WHERE id = ?', [id]);

        return NextResponse.json({ message: 'Performance review updated successfully', review: updated[0] });

    } catch (error) {
        console.error('Error updating performance review:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE /api/performance/reviews/[id] - Delete a performance review
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

        const [existing] = await pool.execute('SELECT id FROM performance_reviews WHERE id = ?', [id]);
        if (existing.length === 0) {
            return NextResponse.json({ error: 'Performance review not found' }, { status: 404 });
        }

        await pool.execute('DELETE FROM performance_reviews WHERE id = ?', [id]);

        return NextResponse.json({ message: 'Performance review deleted successfully' });

    } catch (error) {
        console.error('Error deleting performance review:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
