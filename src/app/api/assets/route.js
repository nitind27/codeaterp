import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authenticate } from '../../../../lib/auth.js';

// GET /api/assets - Get all assets
export async function GET(request) {
    try {
        const authResult = await authenticate(request);
        if (authResult.error) {
            return NextResponse.json({ error: authResult.error, sessionExpired: authResult.sessionExpired || false }, { status: authResult.status });
        }

        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('category_id');
        const status = searchParams.get('status');
        const location = searchParams.get('location');
        const assignedTo = searchParams.get('assigned_to');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        const conditions = [];
        const params = [];

        if (categoryId) { conditions.push('a.category_id = ?'); params.push(categoryId); }
        if (status) { conditions.push('a.status = ?'); params.push(status); }
        if (location) { conditions.push('a.location LIKE ?'); params.push(`%${location}%`); }

        if (assignedTo) {
            if (assignedTo === 'unassigned') {
                conditions.push("a.status = 'available'");
            } else {
                conditions.push('EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.employee_id = ? AND aa.actual_return_date IS NULL)');
                params.push(assignedTo);
            }
        }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

        const [countRows] = await pool.execute(
            `SELECT COUNT(*) as total FROM assets a ${whereClause}`, params
        );
        const totalRecords = parseInt(countRows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        const [assets] = await pool.execute(
            `SELECT
                a.*,
                ac.name as category_name, ac.depreciation_rate,
                e.first_name, e.last_name, e.employee_id as emp_id,
                (SELECT COUNT(*) FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.actual_return_date IS NULL) as is_assigned,
                (SELECT assigned_date FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.actual_return_date IS NULL ORDER BY assigned_date DESC LIMIT 1) as assigned_date,
                (SELECT COUNT(*) FROM asset_maintenance am WHERE am.asset_id = a.id) as maintenance_count
            FROM assets a
            LEFT JOIN asset_categories ac ON a.category_id = ac.id
            LEFT JOIN asset_assignments aa ON a.id = aa.asset_id AND aa.actual_return_date IS NULL
            LEFT JOIN employees e ON aa.employee_id = e.id
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT ? OFFSET ?`,
            [...params, limit, offset]
        );

        return NextResponse.json({
            assets,
            pagination: { current_page: page, total_pages: totalPages, total_records: totalRecords, per_page: limit }
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/assets - Create a new asset
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
        const {
            asset_code, name, description, category_id, serial_number, model,
            manufacturer, purchase_date, purchase_cost, location,
            condition_status = 'good', warranty_expiry, insurance_expiry, notes
        } = body;

        if (!asset_code || !name) {
            return NextResponse.json({ error: 'Asset code and name are required' }, { status: 400 });
        }

        const [existing] = await pool.execute('SELECT id FROM assets WHERE asset_code = ?', [asset_code]);
        if (existing.length > 0) {
            return NextResponse.json({ error: 'Asset code already exists' }, { status: 400 });
        }

        const [result] = await pool.execute(
            `INSERT INTO assets (
                asset_code, name, description, category_id, serial_number, model,
                manufacturer, purchase_date, purchase_cost, current_value, location,
                condition_status, warranty_expiry, insurance_expiry, notes, created_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                asset_code, name, description || null, category_id || null, serial_number || null,
                model || null, manufacturer || null, purchase_date || null, purchase_cost || null,
                purchase_cost || null, location || null, condition_status,
                warranty_expiry || null, insurance_expiry || null, notes || null, user.id
            ]
        );

        const [newAsset] = await pool.execute('SELECT * FROM assets WHERE id = ?', [result.insertId]);

        return NextResponse.json({ message: 'Asset created successfully', asset: newAsset[0] }, { status: 201 });

    } catch (error) {
        console.error('Error creating asset:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
