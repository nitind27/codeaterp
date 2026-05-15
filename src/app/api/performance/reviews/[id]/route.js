import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/performance/reviews/[id] - Get a specific performance review
export async function GET(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;

        // Get review with related data
        const reviewQuery = `
            SELECT
                pr.*,
                rc.name as cycle_name,
                rc.start_date as cycle_start_date,
                rc.end_date as cycle_end_date,
                rc.review_type,
                e.first_name,
                e.last_name,
                e.employee_id as emp_id,
                e.designation,
                e.department,
                r.first_name as reviewer_first_name,
                r.last_name as reviewer_last_name,
                r.employee_id as reviewer_emp_id,
                u.email as employee_email,
                approver.first_name as approver_first_name,
                approver.last_name as approver_last_name
            FROM performance_reviews pr
            JOIN review_cycles rc ON pr.review_cycle_id = rc.id
            JOIN employees e ON pr.employee_id = e.id
            JOIN employees r ON pr.reviewer_id = r.id
            JOIN users u ON e.user_id = u.id
            LEFT JOIN users approver_user ON pr.approved_by = approver_user.id
            LEFT JOIN employees approver ON approver_user.id = approver.user_id
            WHERE pr.id = $1
        `;

        const reviewResult = await query(reviewQuery, [id]);

        if (reviewResult.rows.length === 0) {
            return NextResponse.json(
                { error: 'Performance review not found' },
                { status: 404 }
            );
        }

        const review = reviewResult.rows[0];

        // Check permissions
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can only see their own reviews
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1',
                [session.user.id]
            );
            if (employeeCheck.rows.length === 0 || review.employee_id !== employeeCheck.rows[0].id) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        } else if (session.user.role === 'project_manager') {
            // Project managers can see reviews for their team members
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND (
                    e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
                    OR e.id = (SELECT id FROM employees WHERE user_id = $2)
                )
            `, [review.employee_id, session.user.id]);

            if (teamCheck.rows.length === 0) {
                return NextResponse.json({ error: 'Access denied' }, { status: 403 });
            }
        }
        // Admin and HR can see all reviews

        return NextResponse.json({ review });

    } catch (error) {
        console.error('Error fetching performance review:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// PUT /api/performance/reviews/[id] - Update a performance review
export async function PUT(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { id } = params;
        const body = await request.json();

        // Check if review exists
        const existingReview = await query(
            'SELECT * FROM performance_reviews WHERE id = $1',
            [id]
        );

        if (existingReview.rows.length === 0) {
            return NextResponse.json(
                { error: 'Performance review not found' },
                { status: 404 }
            );
        }

        const review = existingReview.rows[0];

        // Check permissions
        let canUpdate = false;

        if (checkPermission(session.user.role, ['admin', 'hr'])) {
            canUpdate = true;
        } else if (session.user.role === 'project_manager') {
            // Check if the reviewer is the current user or a team member
            const reviewerCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, review.reviewer_id]
            );
            if (reviewerCheck.rows.length > 0) {
                canUpdate = true;
            }
        } else if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can update their self-review part
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, review.employee_id]
            );
            if (employeeCheck.rows.length > 0) {
                // Employees can only update self-review fields
                const allowedFields = ['self_rating', 'self_review', 'status'];
                const hasInvalidFields = Object.keys(body).some(field => !allowedFields.includes(field));

                if (hasInvalidFields) {
                    return NextResponse.json(
                        { error: 'Employees can only update self-review fields' },
                        { status: 403 }
                    );
                }

                // Only allow status change to 'self_review_pending'
                if (body.status && body.status !== 'self_review_pending') {
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
            'self_rating', 'reviewer_rating', 'overall_rating', 'status',
            'self_review', 'reviewer_feedback', 'goals_achievement',
            'strengths', 'areas_for_improvement', 'development_plan',
            'next_review_date', 'approved_by', 'approved_at'
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
            UPDATE performance_reviews
            SET ${updateFields.join(', ')}
            WHERE id = $${paramIndex}
            RETURNING *
        `;

        values.push(id);

        const result = await query(updateQuery, values);

        return NextResponse.json({
            message: 'Performance review updated successfully',
            review: result.rows[0]
        });

    } catch (error) {
        console.error('Error updating performance review:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// DELETE /api/performance/reviews/[id] - Delete a performance review
export async function DELETE(request, { params }) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Admin and HR can delete reviews
        if (!checkPermission(session.user.role, ['admin', 'hr'])) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const { id } = params;

        // Check if review exists
        const existingReview = await query(
            'SELECT id FROM performance_reviews WHERE id = $1',
            [id]
        );

        if (existingReview.rows.length === 0) {
            return NextResponse.json(
                { error: 'Performance review not found' },
                { status: 404 }
            );
        }

        // Delete the review
        await query('DELETE FROM performance_reviews WHERE id = $1', [id]);

        return NextResponse.json({
            message: 'Performance review deleted successfully'
        });

    } catch (error) {
        console.error('Error deleting performance review:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
