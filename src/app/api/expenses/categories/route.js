import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';

// GET /api/expenses/categories - Get all expense categories
export async function GET(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }

        const [categories] = await pool.execute(
            'SELECT * FROM expense_categories WHERE is_active = TRUE ORDER BY name ASC'
        );

        return NextResponse.json({ categories });

    } catch (error) {
        console.error('Error fetching expense categories:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/expenses/categories - Create a new expense category (Admin/HR only)
export async function POST(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }
        const { user } = authResult;

        if (!['admin', 'hr'].includes(user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const { name, description, requires_approval = true, max_amount } = body;

        if (!name) {
            return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
        }

        const [existing] = await pool.execute(
            'SELECT id FROM expense_categories WHERE name = ?', [name]
        );
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Expense category with this name already exists' }, { status: 400 });
        }

        const [result] = await pool.execute(
            'INSERT INTO expense_categories (name, description, requires_approval, max_amount) VALUES (?, ?, ?, ?)',
            [name, description || null, requires_approval, max_amount || null]
        );

        const [newCat] = await pool.execute('SELECT * FROM expense_categories WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Expense category created successfully', category: newCat[0] }, { status: 201 });

    } catch (error) {
        console.error('Error creating expense category:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
