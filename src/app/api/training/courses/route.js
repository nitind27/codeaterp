import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// GET /api/training/courses - Get all training courses
export async function GET(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const courseType = searchParams.get('course_type');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (category) {
            conditions.push('tc.category = ?');
            params.push(category);
        }
        if (status) {
            conditions.push('tc.status = ?');
            params.push(status);
        }
        if (courseType) {
            conditions.push('tc.course_type = ?');
            params.push(courseType);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) as total FROM training_courses tc ${whereClause}`,
            params
        );
        const totalRecords = parseInt(countRows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        const [courses] = await pool.execute(
            `SELECT
                tc.*,
                u.email as created_by_email,
                e.first_name as created_by_first_name,
                e.last_name as created_by_last_name,
                (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = tc.id AND ce.status IN ('enrolled', 'in_progress')) as enrolled_count,
                (SELECT COUNT(*) FROM course_enrollments ce WHERE ce.course_id = tc.id AND ce.status = 'completed') as completed_count
            FROM training_courses tc
            JOIN users u ON tc.created_by = u.id
            LEFT JOIN employees e ON u.id = e.user_id
            ${whereClause}
            ORDER BY tc.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            courses,
            pagination: { current_page: page, total_pages: totalPages, total_records: totalRecords, per_page: limit }
        });

    } catch (error) {
        console.error('Error fetching training courses:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/training/courses - Create a new training course
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
            title, description, category, course_type = 'internal', duration_hours,
            max_participants, instructor, cost = 0, status = 'draft',
            start_date, end_date, prerequisites, learning_objectives
        } = body;

        if (!title) {
            return NextResponse.json({ error: 'Course title is required' }, { status: 400 });
        }

        const [result] = await pool.execute(
            `INSERT INTO training_courses (
                title, description, category, course_type, duration_hours,
                max_participants, instructor, cost, status, start_date, end_date,
                prerequisites, learning_objectives, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                title, description || null, category || null, course_type, duration_hours || null,
                max_participants || null, instructor || null, cost, status,
                start_date || null, end_date || null, prerequisites || null,
                learning_objectives || null, user.id
            ]
        );

        const [newCourse] = await pool.execute('SELECT * FROM training_courses WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Training course created successfully', course: newCourse[0] }, { status: 201 });

    } catch (error) {
        console.error('Error creating training course:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
