import pool from '../../../../../lib/db.js';
import { authenticate } from '../../../../../lib/auth.js';
import { handleOptions, errorResponse, successResponse } from '../../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

export async function GET(req) {
  try {
    const authResult = await authenticate(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const [types] = await pool.execute(
      'SELECT * FROM leave_types WHERE is_active = TRUE ORDER BY name'
    );

    return successResponse({
      types: types.map(type => ({
        id: type.id,
        name: type.name,
        code: type.code,
        maxDays: type.max_days,
        fixedDays: type.max_days,
        isPaid: type.is_paid,
        description: type.description,
        isActive: type.is_active
      }))
    });
  } catch (error) {
    console.error('Flutter Get leave types error:', error);
    return errorResponse('Internal server error', 500);
  }
}

