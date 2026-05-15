import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// GET /api/performance/reviews - Get all performance reviews
export async function GET(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const cycleId = searchParams.get('cycle_id');
        const status = searchParams.get('status');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (employeeId) { conditions.push('pr.employee_id = ?'); params.push(employeeId); }
        if (cycleId) { conditions.push('pr.review_cycle_id = ?'); params.push(cycleId); }
        if (status) { conditions.push('pr.status = ?'); params.push(status); }

        if (user.role === 'employee' || user.role === 'intern') {
            conditions.push('pr.employee_id = (SELECT id FROM employees WHERE user_id = ?)');
            params.push(user.id);
        } else if (user.role === 'project_manager') {
            conditions.push(`pr.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = ?)
                OR e.id = (SELECT id FROM employees WHERE user_id = ?)
            )`);
            params.push(user.id, user.id);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) as total FROM performance_reviews pr ${whereClause}`, params
        );
        const totalRecords = parseInt(countRows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        const [reviews] = await pool.execute(
            `SELECT
                pr.*,
                rc.name as cycle_name, rc.start_date as cycle_start_date, rc.end_date as cycle_end_date,
                e.first_name, e.last_name, e.employee_id as emp_id, e.designation,
                r.first_name as reviewer_first_name, r.last_name as reviewer_last_name, r.employee_id as reviewer_emp_id,
                u.email as employee_email
            FROM performance_reviews pr
            JOIN review_cycles rc ON pr.review_cycle_id = rc.id
            JOIN employees e ON pr.employee_id = e.id
            JOIN employees r ON pr.reviewer_id = r.id
            JOIN users u ON e.user_id = u.id
            ${whereClause}
            ORDER BY pr.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            reviews,
            pagination: { current_page: page, total_pages: totalPages, total_records: totalRecords, per_page: limit }
        });

    } catch (error) {
        console.error('Error fetching performance reviews:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/performance/reviews - Create a new performance review
export async function POST(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        if (!['admin', 'hr', 'project_manager'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const {
            review_cycle_id, employee_id, reviewer_id, self_rating, reviewer_rating,
            overall_rating, status = 'draft', self_review, reviewer_feedback,
            goals_achievement, strengths, areas_for_improvement, development_plan, next_review_date
        } = body;

        if (!review_cycle_id || !employee_id || !reviewer_id) {
            return NextResponse.json({ error: 'Review cycle, employee, and reviewer are required' }, { status: 400 });
        }

        const [cycleCheck] = await pool.execute('SELECT id, status FROM review_cycles WHERE id = ?', [review_cycle_id]);
        if (cycleCheck.length === 0) {
            return NextResponse.json({ error: 'Review cycle not found' }, { status: 404 });
        }
        if (cycleCheck[0].status !== 'active') {
            return NextResponse.json({ error: 'Review cycle is not active' }, { status: 400 });
        }

        const [empCheck] = await pool.execute('SELECT id FROM employees WHERE id = ?', [employee_id]);
        const [revCheck] = await pool.execute('SELECT id FROM employees WHERE id = ?', [reviewer_id]);
        if (empCheck.length === 0 || revCheck.length === 0) {
            return NextResponse.json({ error: 'Employee or reviewer not found' }, { status: 404 });
        }

        const [existingReview] = await pool.execute(
            'SELECT id FROM performance_reviews WHERE review_cycle_id = ? AND employee_id = ?',
            [review_cycle_id, employee_id]
        );
        if (existingReview.length > 0) {
            return NextResponse.json({ error: 'Performance review already exists for this employee in the selected cycle' }, { status: 400 });
        }

        const [result] = await pool.execute(
            `INSERT INTO performance_reviews (
                review_cycle_id, employee_id, reviewer_id, self_rating, reviewer_rating,
                overall_rating, status, self_review, reviewer_feedback, goals_achievement,
                strengths, areas_for_improvement, development_plan, next_review_date
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                review_cycle_id, employee_id, reviewer_id, self_rating || null, reviewer_rating || null,
                overall_rating || null, status, self_review || null, reviewer_feedback || null,
                goals_achievement || null, strengths || null, areas_for_improvement || null,
                development_plan || null, next_review_date || null
            ]
        );

        const [newReview] = await pool.execute('SELECT * FROM performance_reviews WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Performance review created successfully', review: newReview[0] }, { status: 201 });

    } catch (error) {
        console.error('Error creating performance review:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
