import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';
import { checkPermission } from '@/lib/auth';

// GET /api/expenses - Get all expense claims
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const employeeId = searchParams.get('employee_id');
        const status = searchParams.get('status');
        const startDate = searchParams.get('start_date');
        const endDate = searchParams.get('end_date');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        // Build WHERE clause based on filters
        const conditions = [];

        if (employeeId) {
            conditions.push(`ec.employee_id = $${paramIndex}`);
            params.push(employeeId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`ec.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (startDate) {
            conditions.push(`ec.submitted_date >= $${paramIndex}`);
            params.push(startDate);
            paramIndex++;
        }

        if (endDate) {
            conditions.push(`ec.submitted_date <= $${paramIndex}`);
            params.push(endDate);
            paramIndex++;
        }

        // Permission checks
        if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can only see their own expense claims
            conditions.push(`ec.employee_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})`);
            params.push(session.user.id);
            paramIndex++;
        } else if (session.user.role === 'project_manager') {
            // Project managers can see expense claims for their team members
            conditions.push(`ec.employee_id IN (
                SELECT e.id FROM employees e
                WHERE e.manager_id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
                OR e.id = (SELECT id FROM employees WHERE user_id = $${paramIndex})
            )`);
            params.push(session.user.id);
            paramIndex++;
        }
        // Admin and HR can see all expense claims

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM expense_claims ec
            ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get expense claims with related data
        const expensesQuery = `
            SELECT
                ec.*,
                e.first_name,
                e.last_name,
                e.employee_id as emp_id,
                e.designation,
                e.department,
                ap.first_name as approved_by_first_name,
                ap.last_name as approved_by_last_name,
                (
                    SELECT COUNT(*) FROM expense_items ei WHERE ei.expense_claim_id = ec.id
                ) as item_count,
                (
                    SELECT COUNT(*) FROM expense_attachments ea WHERE ea.expense_claim_id = ec.id
                ) as attachment_count
            FROM expense_claims ec
            JOIN employees e ON ec.employee_id = e.id
            LEFT JOIN users u_ap ON ec.approved_by = u_ap.id
            LEFT JOIN employees ap ON u_ap.id = ap.user_id
            ${whereClause}
            ORDER BY ec.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const expensesResult = await query(expensesQuery, params);

        return NextResponse.json({
            expenses: expensesResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit
            }
        });

    } catch (error) {
        console.error('Error fetching expense claims:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/expenses - Create a new expense claim
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const {
            employee_id,
            title,
            description,
            total_amount,
            currency = 'INR',
            status = 'draft',
            expense_items,
            notes
        } = body;

        // Validate required fields
        if (!employee_id || !title || !total_amount || !expense_items || expense_items.length === 0) {
            return NextResponse.json(
                { error: 'Employee, title, total amount, and expense items are required' },
                { status: 400 }
            );
        }

        // Check permissions
        let canCreate = false;

        if (checkPermission(session.user.role, ['admin', 'hr'])) {
            canCreate = true;
        } else if (session.user.role === 'project_manager') {
            // Project managers can create expense claims for their team members
            const teamCheck = await query(`
                SELECT e.id FROM employees e
                WHERE e.id = $1 AND e.manager_id = (SELECT id FROM employees WHERE user_id = $2)
            `, [employee_id, session.user.id]);

            if (teamCheck.rows.length > 0) {
                canCreate = true;
            }
        } else if (session.user.role === 'employee' || session.user.role === 'intern') {
            // Employees can create their own expense claims
            const employeeCheck = await query(
                'SELECT id FROM employees WHERE user_id = $1 AND id = $2',
                [session.user.id, employee_id]
            );

            if (employeeCheck.rows.length > 0) {
                canCreate = true;
                // Force draft status for employee-created claims
                status = 'draft';
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

        // Start transaction
        await query('START TRANSACTION');

        try {
            // Insert expense claim
            const claimQuery = `
                INSERT INTO expense_claims (
                    employee_id, title, description, status, total_amount, currency, notes, created_by
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id
            `;

            const claimValues = [employee_id, title, description, status, total_amount, currency, notes, session.user.id];
            const claimResult = await query(claimQuery, claimValues);
            const claimId = claimResult.rows[0].id;

            // Insert expense items
            for (const item of expense_items) {
                const itemQuery = `
                    INSERT INTO expense_items (
                        expense_claim_id, category_id, description, amount, expense_date,
                        merchant, location, is_billable, tax_amount
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `;

                const itemValues = [
                    claimId,
                    item.category_id,
                    item.description,
                    item.amount,
                    item.expense_date,
                    item.merchant,
                    item.location,
                    item.is_billable !== undefined ? item.is_billable : true,
                    item.tax_amount || 0
                ];

                await query(itemQuery, itemValues);
            }

            await query('COMMIT');

            return NextResponse.json({
                message: 'Expense claim created successfully',
                claim_id: claimId
            }, { status: 201 });

        } catch (error) {
            await query('ROLLBACK');
            throw error;
        }

    } catch (error) {
        console.error('Error creating expense claim:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
