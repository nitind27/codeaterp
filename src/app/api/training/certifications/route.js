import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/training/certifications - Get all certifications
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const expirySoon = searchParams.get('expiry_soon'); // within 30 days
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        // Build WHERE clause based on filters
        const conditions = [];

        if (employeeId) {
            conditions.push(`c.employee_id = $${paramIndex}`);
            params.push(employeeId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`c.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (expirySoon === 'true') {
            conditions.push(`c.expiry_date IS NOT NULL AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)`);
        }

        // Permission checks
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can only see their own certifications
            conditions.push(`c.employee_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})`);
            params.push(session.user.id);
            paramIndex++;
        } else if (session.user.role === 'project_manager') {
            // Project managers can see certifications for their team members
            conditions.push(`c.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
                OR e.id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
            )`);
            params.push(session.user.id);
            paramIndex++;
        }
        // Admin and HR can see all certifications

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM certifications c
            ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get certifications
        const certificationsQuery = `
            SELECT
                c.*,
                e.first_name,
                e.last_name,
                e.employee_id as emp_id,
                e.designation,
                cb.first_name as created_by_first_name,
                cb.last_name as created_by_last_name,
                DATEDIFF(c.expiry_date, CURDATE()) as days_until_expiry
            FROM certifications c
            JOIN employees e ON c.employee_id = e.id
            LEFT JOIN users u_cb ON c.created_by = u_cb.id
            LEFT JOIN employees cb ON u_cb.id = cb.user_id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const certificationsResult = await query(certificationsQuery, params);

        return NextResponse.json({
            certifications: certificationsResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit
            }
        });

    } catch (error) {
        console.error('Error fetching certifications:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/training/certifications - Add a new certification
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            employee_id,
            certification_name,
            issuing_organization,
            certification_number,
            issue_date,
            expiry_date,
            credential_url,
            status = 'active',
            verification_status = 'pending',
            cost,
            renewal_required = false,
            next_renewal_date,
            skills_acquired,
            attachment
        } = body;

        // Validate required fields
        if (!employee_id || !certification_name || !issue_date) {
            return NextResponse.json(
                { error: 'Employee, certification name, and issue date are required' },
                { status: 400 }
            );
        }

        // Check permissions
        let canCreate = false;

        if (checkPermission(session.user.role, ['admin', 'hr'])) {
            canCreate = true;
        } else if (session.user.role === 'project_manager') {
            // Project managers can add certifications for their team members
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
            `, [employee_id, session.user.id]);

            if (teamCheck.rows.length > 0) {
                canCreate = true;
            }
        } else if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can add their own certifications
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, employee_id]
            );

            if (employeeCheck.rows.length > 0) {
                canCreate = true;
                verification_status = 'pending'; // Force pending status for self-reported
            }
        }

        if (!canCreate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        // Check if employee exists
        const employeeCheck = await query(
            'SELECT id FROM employees WHERE id = $1',
            [employee_id]
        );

        if (employeeCheck.rows.length === 0) {
            return NextResponse.json(
                { error: 'Employee not found' },
                { status: 404 }
            );
        }

        // Insert new certification
        const insertQuery = `
            INSERT INTO certifications (
                employee_id, certification_name, issuing_organization, certification_number,
                issue_date, expiry_date, credential_url, status, verification_status,
                cost, renewal_required, next_renewal_date, skills_acquired, attachment, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const values = [
            employee_id, certification_name, issuing_organization, certification_number,
            issue_date, expiry_date, credential_url, status, verification_status,
            cost, renewal_required, next_renewal_date, skills_acquired, attachment, session.user.id
        ];

        const result = await query(insertQuery, values);

        return NextResponse.json({
            message: 'Certification added successfully',
            certification: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error adding certification:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
