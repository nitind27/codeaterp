import { NextResponse } from 'next/server';
import { query, getServerSession } from '@/lib/db';

// GET /api/assets - Get all assets
export async function GET(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('category_id');
        const status = searchParams.get('status');
        const location = searchParams.get('location');
        const assignedTo = searchParams.get('assigned_to');
        const page = parseInt(searchParams.get('page')) || 1;
        const limit = parseInt(searchParams.get('limit')) || 10;
        const offset = (page - 1) * limit;

        let whereClause = '';
        let params = [];
        let paramIndex = 1;

        // Build WHERE clause based on filters
        const conditions = [];

        if (categoryId) {
            conditions.push(`a.category_id = $${paramIndex}`);
            params.push(categoryId);
            paramIndex++;
        }

        if (status) {
            conditions.push(`a.status = $${paramIndex}`);
            params.push(status);
            paramIndex++;
        }

        if (location) {
            conditions.push(`a.location LIKE $${paramIndex}`);
            params.push(`%${location}%`);
            paramIndex++;
        }

        if (assignedTo) {
            if (assignedTo === 'unassigned') {
                conditions.push(`a.status = 'available'`);
            } else {
                conditions.push(`EXISTS (
                    SELECT 1 FROM asset_assignments aa
                    WHERE aa.asset_id = a.id AND aa.employee_id = $${paramIndex} AND aa.actual_return_date IS NULL
                )`);
                params.push(assignedTo);
                paramIndex++;
            }
        }

        if (conditions.length > 0) {
            whereClause = 'WHERE ' + conditions.join(' AND ');
        }

        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM assets a
            ${whereClause}
        `;

        const countResult = await query(countQuery, params);
        const totalRecords = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalRecords / limit);

        // Get assets with related data
        const assetsQuery = `
            SELECT
                a.*,
                ac.name as category_name,
                ac.depreciation_rate,
                e.first_name,
                e.last_name,
                e.employee_id as emp_id,
                (
                    SELECT COUNT(*) FROM asset_assignments aa
                    WHERE aa.asset_id = a.id AND aa.actual_return_date IS NULL
                ) as is_assigned,
                (
                    SELECT assigned_date FROM asset_assignments aa
                    WHERE aa.asset_id = a.id AND aa.actual_return_date IS NULL
                    ORDER BY assigned_date DESC LIMIT 1
                ) as assigned_date,
                (
                    SELECT COUNT(*) FROM asset_maintenance am
                    WHERE am.asset_id = a.id
                ) as maintenance_count
            FROM assets a
            LEFT JOIN asset_categories ac ON a.category_id = ac.id
            LEFT JOIN asset_assignments aa ON a.id = aa.asset_id AND aa.actual_return_date IS NULL
            LEFT JOIN employees e ON aa.employee_id = e.id
            ${whereClause}
            ORDER BY a.created_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
        `;

        params.push(limit, offset);

        const assetsResult = await query(assetsQuery, params);

        return NextResponse.json({
            assets: assetsResult.rows,
            pagination: {
                current_page: page,
                total_pages: totalPages,
                total_records: totalRecords,
                per_page: limit
            }
        });

    } catch (error) {
        console.error('Error fetching assets:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}

// POST /api/assets - Create a new asset
export async function POST(request) {
    try {
        const session = await getServerSession();
        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Only Admin and HR can create assets
        if (!['admin', 'hr'].includes(session.user.role)) {
            return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
        }

        const body = await request.json();
        const {
            asset_code,
            name,
            description,
            category_id,
            serial_number,
            model,
            manufacturer,
            purchase_date,
            purchase_cost,
            location,
            condition_status = 'good',
            warranty_expiry,
            insurance_expiry,
            notes
        } = body;

        // Validate required fields
        if (!asset_code || !name) {
            return NextResponse.json(
                { error: 'Asset code and name are required' },
                { status: 400 }
            );
        }

        // Check if asset code already exists
        const existingAsset = await query(
            'SELECT id FROM assets WHERE asset_code = $1',
            [asset_code]
        );

        if (existingAsset.rows.length > 0) {
            return NextResponse.json(
                { error: 'Asset code already exists' },
                { status: 400 }
            );
        }

        // Calculate current value (initially same as purchase cost)
        const current_value = purchase_cost;

        // Insert new asset
        const insertQuery = `
            INSERT INTO assets (
                asset_code, name, description, category_id, serial_number, model,
                manufacturer, purchase_date, purchase_cost, current_value, location,
                condition_status, warranty_expiry, insurance_expiry, notes, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING *
        `;

        const values = [
            asset_code, name, description, category_id, serial_number, model,
            manufacturer, purchase_date, purchase_cost, current_value, location,
            condition_status, warranty_expiry, insurance_expiry, notes, session.user.id
        ];

        const result = await query(insertQuery, values);

        return NextResponse.json({
            message: 'Asset created successfully',
            asset: result.rows[0]
        }, { status: 201 });

    } catch (error) {
        console.error('Error creating asset:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
