import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/performance/reviews - Get all performance reviews
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const cycleId = searchParams.get('cycle_id');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        // Build WHERE clause based on filters
        const conditions = [];

        if (employeeId) {
            conditions.push(`pr.employee_id = $${paramIndex}`);
            params.push(employeeId);
            paramIndex++;
        }

        if (cycleId) {
            conditions.push(`pr.review_cycle_id = $${paramIndex}`);
            params.push(cycleId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`pr.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        // Permission checks
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can only see their own reviews
            conditions.push(`pr.employee_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})`);
            params.push(session.user.id);
            paramIndex++;
        } else if (session.user.role === 'project_manager') {
            // Project managers can see reviews for their team members
            conditions.push(`pr.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
                OR e.id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
            )`);
            params.push(session.user.id);
            paramIndex++;
        }
        // Admin and HR can see all reviews

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM performance_reviews pr
            ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get reviews with pagination
        const reviewsQuery = `
            SELECT
                pr.*,
                rc.name as cycle_name,
                rc.start_date as cycle_start_date,
                rc.end_date as cycle_end_date,
                e.first_name,
                e.last_name,
                e.employee_id as emp_id,
                e.designation,
                r.first_name as reviewer_first_name,
                r.last_name as reviewer_last_name,
                r.employee_id as reviewer_emp_id,
                u.email as employee_email
            FROM performance_reviews pr
            JOIN review_cycles rc ON pr.review_cycle_id = rc.id
            JOIN employees e ON pr.employee_id = e.id
            JOIN employees r ON pr.reviewer_id = r.id
            JOIN users u ON e.user_id = u.id
            ${whereClause}
            ORDER BY pr.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const reviewsResult = await query(reviewsQuery, params);

        return NextResponse.json({
            reviews: reviewsResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit
            }
        });

    } catch (error) {
        console.error('Error fetching performance reviews:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/performance/reviews - Create a new performance review
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check permissions - only HR, Admin, and Project Managers can create reviews
        if (!checkPermission(session.user.role, ['admin', 'hr', 'project_manager'])) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const {
            review_cycle_id,
            employee_id,
            reviewer_id,
            self_rating,
            reviewer_rating,
            overall_rating,
            status = 'draft',
            self_review,
            reviewer_feedback,
            goals_achievement,
            strengths,
            areas_for_improvement,
            development_plan,
            next_review_date
        } = body;

        // Validate required fields
        if (!review_cycle_id || !employee_id || !reviewer_id) {
            return NextResponse.json(
                { error: 'Review cycle, employee, and reviewer are required' },
                { status: 400 }
            );
        }

        // Check if review cycle exists and is active
        const cycleCheck = await query(
            'SELECT id, status FROM review_cycles WHERE id = $1',
            [review_cycle_id]
        );

        if (cycleCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'Review cycle not found' },
                { status: 404 }
            );
        }

        if (cycleCheck.rows[0].status !== 'active') {
            return NextResponse.json(
                { error: 'Review cycle is not active' },
                { status: 400 }
            );
        }

        // Check if employee and reviewer exist
        const employeeCheck = await query(
            'SELECT id FROM employees WHERE id = $1',
            [employee_id]
        );

        const reviewerCheck = await query(
            'SELECT id FROM employees WHERE id = $1',
            [reviewer_id]
        );

        if (employeeCheck.rows.length === 0 || reviewerCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'Employee or reviewer not found' },
                { status: 404 }
            );
        }

        // Check if review already exists for this employee in this cycle
        const existingReview = await query(
            'SELECT id FROM performance_reviews WHERE review_cycle_id = $1 AND employee_id = $2',
            [review_cycle_id, employee_id]
        );

        if (existingReview.rows.length > 0) {
            return NextResponse.json(
                { error: 'Performance review already exists for this employee in the selected cycle' },
                { status: 400 }
            );
        }

        // Insert new performance review
        const insertQuery = `
            INSERT INTO performance_reviews (
                review_cycle_id, employee_id, reviewer_id, self_rating, reviewer_rating,
                overall_rating, status, self_review, reviewer_feedback, goals_achievement,
                strengths, areas_for_improvement, development_plan, next_review_date
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            review_cycle_id, employee_id, reviewer_id, self_rating, reviewer_rating,
            overall_rating, status, self_review, reviewer_feedback, goals_achievement,
            strengths, areas_for_improvement, development_plan, next_review_date
        ];

        const result = await query(insertQuery, values);

        return NextResponse.json({
            message: 'Performance review created successfully',
            review: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating performance review:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
