import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';

// GET /api/expenses/categories - Get all expense categories
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get all active expense categories
        const categoriesQuery = `
            SELECT * FROM expense_categories
            WHERE is_active = TRUE
            ORDER BY name ASC
        `;

        const categoriesResult = await query(categoriesQuery);

        return NextResponse.json({
            categories: categoriesResult.rows
        });

    } catch (error) {
        console.error('Error fetching expense categories:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/expenses/categories - Create a new expense category (Admin/HR only)
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Admin and HR can create expense categories
        if (!['admin', 'hr'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const {
            name,
            description,
            requires_approval = true,
            max_amount
        } = body;

        // Validate required fields
        if (!name) {
            return NextResponse.json(
                { error: 'Category name is required' },
                { status: 400 }
            );
        }

        // Check if category already exists
        const existingCategory = await query(
            'SELECT id FROM expense_categories WHERE name = $1',
            [name]
        );

        if (existingCategory.rows.length > 0) {
            return NextResponse.json(
                { error: 'Expense category with this name already exists' },
                { status: 400 }
            );
        }

        // Insert new category
        const insertQuery = `
            INSERT INTO expense_categories (name, description, requires_approval, max_amount)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `;

        const values = [name, description, requires_approval, max_amount];
        const result = await query(insertQuery, values);

        return NextResponse.json({
            message: 'Expense category created successfully',
            category: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating expense category:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
