import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// GET /api/training/certifications - Get all certifications
export async function GET(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const expirySoon = searchParams.get('expiry_soon');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (employeeId) {
            conditions.push('c.employee_id = ?');
            params.push(employeeId);
        }

        if (status) {
            conditions.push('c.status = ?');
            params.push(status);
        }

        if (expirySoon === 'true') {
            conditions.push('c.expiry_date IS NOT NULL AND c.expiry_date <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)');
        }

        if (user.role === 'employee' || user.role === 'intern') {
            conditions.push('c.employee_id = (SELECT id FROM employees WHERE user_id = ?)');
            params.push(user.id);
        } else if (user.role === 'project_manager') {
            conditions.push(`c.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = ?)
                OR e.id = (SELECT id FROM employees WHERE user_id = ?)
            )`);
            params.push(user.id, user.id);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) as total FROM certifications c ${whereClause}`,
            params
        );
        const totalRecords = parseInt(countRows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        const [certifications] = await pool.execute(
            `SELECT
                c.*,
                e.first_name, e.last_name, e.employee_id as emp_id, e.designation,
                cb.first_name as created_by_first_name, cb.last_name as created_by_last_name,
                DATEDIFF(c.expiry_date, CURDATE()) as days_until_expiry
            FROM certifications c
            JOIN employees e ON c.employee_id = e.id
            LEFT JOIN users u_cb ON c.created_by = u_cb.id
            LEFT JOIN employees cb ON u_cb.id = cb.user_id
            ${whereClause}
            ORDER BY c.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            certifications,
            pagination: { current_page: page, total_pages: totalPages, total_records: totalRecords, per_page: limit }
        });

    } catch (error) {
        console.error('Error fetching certifications:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/training/certifications - Add a new certification
export async function POST(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        const body = await request.json();
        const {
            employee_id, certification_name, issuing_organization, certification_number,
            issue_date, expiry_date, credential_url, status = 'active',
            cost, renewal_required = false, next_renewal_date,
            skills_acquired, attachment
        } = body;

        let verification_status = body.verification_status || 'pending';

        if (!employee_id || !certification_name || !issue_date) {
            return NextResponse.json({ error: 'Employee, certification name, and issue date are required' }, { status: 400 });
        }

        let canCreate = false;

        if (user.role === 'admin' || user.role === 'hr') {
            canCreate = true;
        } else if (user.role === 'project_manager') {
            const [teamCheck] = await pool.execute(
                'SELECT e.id FROM employees e WHERE e.id = ? AND e.manager_id = (SELECT id FROM employees WHERE user_id = ?)',
                [employee_id, user.id]
            );
            if (teamCheck.length > 0) canCreate = true;
        } else if (user.role === 'employee' || user.role === 'intern') {
            const [empCheck] = await pool.execute(
                'SELECT id FROM employees WHERE user_id = ? AND id = ?',
                [user.id, employee_id]
            );
            if (empCheck.length > 0) {
                canCreate = true;
                verification_status = 'pending';
            }
        }

        if (!canCreate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const [empCheck] = await pool.execute('SELECT id FROM employees WHERE id = ?', [employee_id]);
        if (empCheck.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const [result] = await pool.execute(
            `INSERT INTO certifications (
                employee_id, certification_name, issuing_organization, certification_number,
                issue_date, expiry_date, credential_url, status, verification_status,
                cost, renewal_required, next_renewal_date, skills_acquired, attachment, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                employee_id, certification_name, issuing_organization, certification_number,
                issue_date, expiry_date || null, credential_url || null, status, verification_status,
                cost || null, renewal_required, next_renewal_date || null,
                skills_acquired || null, attachment || null, user.id
            ]
        );

        const [newCert] = await pool.execute('SELECT * FROM certifications WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Certification added successfully', certification: newCert[0] }, { status: 201 });

    } catch (error) {
        console.error('Error adding certification:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
