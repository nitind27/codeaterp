import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/training/courses - Get all training courses
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const category = searchParams.get('category');
        const status = searchParams.get('status');
        const courseType = searchParams.get('course_type');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        // Build WHERE clause based on filters
        const conditions = [];

        if (category) {
            conditions.push(`tc.category = $${paramIndex}`);
            params.push(category);
            paramIndex++;
        }

        if (status) {
            conditions.push(`tc.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (courseType) {
            conditions.push(`tc.course_type = $${paramIndex}`);
            params.push(courseType);
            paramIndex++;
        }

        // Permission checks - all authenticated users can see courses

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM training_courses tc
            ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get courses with enrollment info
        const coursesQuery = `
            SELECT
                tc.*,
                u.email as created_by_email,
                e.first_name as created_by_first_name,
                e.last_name as created_by_last_name,
                (
                    SELECT COUNT(*) FROM course_enrollments ce
                    WHERE ce.course_id = tc.id AND ce.status IN ('enrolled', 'in_progress')
                ) as enrolled_count,
                (
                    SELECT COUNT(*) FROM course_enrollments ce
                    WHERE ce.course_id = tc.id AND ce.status = 'completed'
                ) as completed_count
            FROM training_courses tc
            JOIN users u ON tc.created_by = u.id
            LEFT JOIN employees e ON u.id = e.user_id
            ${whereClause}
            ORDER BY tc.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const coursesResult = await query(coursesQuery, params);

        return NextResponse.json({
            courses: coursesResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit
            }
        });

    } catch (error) {
        console.error('Error fetching training courses:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/training/courses - Create a new training course
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Check permissions - HR, Admin, and Project Managers can create courses
        if (!checkPermission(session.user.role, ['admin', 'hr', 'project_manager'])) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const {
            title,
            description,
            category,
            course_type = 'internal',
            duration_hours,
            max_participants,
            instructor,
            cost = 0,
            status = 'draft',
            start_date,
            end_date,
            prerequisites,
            learning_objectives
        } = body;

        // Validate required fields
        if (!title) {
            return NextResponse.json(
                { error: 'Course title is required' },
                { status: 400 }
            );
        }

        // Insert new training course
        const insertQuery = `
            INSERT INTO training_courses (
                title, description, category, course_type, duration_hours,
                max_participants, instructor, cost, status, start_date, end_date,
                prerequisites, learning_objectives, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `;

        const values = [
            title, description, category, course_type, duration_hours,
            max_participants, instructor, cost, status, start_date, end_date,
            prerequisites, learning_objectives, session.user.id
        ];

        const result = await query(insertQuery, values);

        return NextResponse.json({
            message: 'Training course created successfully',
            course: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating training course:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
