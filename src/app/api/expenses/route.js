import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';

// GET /api/expenses - Get all expense claims
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
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (employeeId) { conditions.push('ec.employee_id = ?'); params.push(employeeId); }
        if (status) { conditions.push('ec.status = ?'); params.push(status); }
        if (startDate) { conditions.push('ec.submitted_date >= ?'); params.push(startDate); }
        if (endDate) { conditions.push('ec.submitted_date <= ?'); params.push(endDate); }

        if (user.role === 'employee' || user.role === 'intern') {
            conditions.push('ec.employee_id = (SELECT id FROM employees WHERE user_id = ?)');
            params.push(user.id);
        } else if (user.role === 'project_manager') {
            conditions.push(`ec.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = ?)
                OR e.id = (SELECT id FROM employees WHERE user_id = ?)
            )`);
            params.push(user.id, user.id);
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) as total FROM expense_claims ec ${whereClause}`, params
        );
        const totalRecords = parseInt(countRows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        const [expenses] = await pool.execute(
            `SELECT
                ec.*,
                e.first_name, e.last_name, e.employee_id as emp_id, e.designation, e.department,
                ap.first_name as approved_by_first_name, ap.last_name as approved_by_last_name,
                (SELECT COUNT(*) FROM expense_items ei WHERE ei.expense_claim_id = ec.id) as item_count,
                (SELECT COUNT(*) FROM expense_attachments ea WHERE ea.expense_claim_id = ec.id) as attachment_count
            FROM expense_claims ec
            JOIN employees e ON ec.employee_id = e.id
            LEFT JOIN users u_ap ON ec.approved_by = u_ap.id
            LEFT JOIN employees ap ON u_ap.id = ap.user_id
            ${whereClause}
            ORDER BY ec.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            expenses,
            pagination: { current_page: page, total_pages: totalPages, total_records: totalRecords, per_page: limit }
        });

    } catch (error) {
        console.error('Error fetching expense claims:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/expenses - Create a new expense claim
export async function POST(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        const body = await request.json();
        const { employee_id, title, description, total_amount, currency = 'INR', expense_items, notes } = body;
        let claimStatus = body.status || 'draft';

        if (!employee_id || !title || !total_amount || !expense_items || expense_items.length === 0) {
            return NextResponse.json({ error: 'Employee, title, total amount, and expense items are required' }, { status: 400 });
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
            if (empCheck.length > 0) { canCreate = true; claimStatus = 'draft'; }
        }

        if (!canCreate) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const [empCheck] = await pool.execute('SELECT id FROM employees WHERE id = ?', [employee_id]);
        if (empCheck.length === 0) {
            return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
        }

        const conn = await pool.getConnection();
        try {
            await conn.beginTransaction();

            const [claimResult] = await conn.execute(
                `INSERT INTO expense_claims (employee_id, title, description, status, total_amount, currency, notes, created_by)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [employee_id, title, description || null, claimStatus, total_amount, currency, notes || null, user.id]
            );
            const claimId = claimResult.insertId;

            for (const item of expense_items) {
                await conn.execute(
                    `INSERT INTO expense_items (expense_claim_id, category_id, description, amount, expense_date, merchant, location, is_billable, tax_amount)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [claimId, item.category_id, item.description, item.amount, item.expense_date,
                     item.merchant || null, item.location || null,
                     item.is_billable !== undefined ? item.is_billable : true, item.tax_amount || 0]
                );
            }

            await conn.commit();
            return NextResponse.json({ message: 'Expense claim created successfully', claim_id: claimId }, { status: 201 });
        } catch (err) {
            await conn.rollback();
            throw err;
        } finally {
            conn.release();
        }

    } catch (error) {
        console.error('Error creating expense claim:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
