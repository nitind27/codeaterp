import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';
import { calculateDaysBetween } from '../../../../../lib/utils.js';
import { handleOptions, errorResponse, successResponse } from '../../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Update holiday
export async function PUT(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { id } = params;
    const data = await req.json();
    const { title, description, startDate, endDate, isOptional } = data;

    const [existing] = await pool.execute(
      'SELECT * FROM holidays WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return errorResponse('Holiday not found', 404);
    }

    const updateFields = [];
    const updateValues = [];

    if (title) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description);
    }

    if (startDate) {
      updateFields.push('start_date = ?');
      updateValues.push(startDate);
    }

    if (endDate) {
      updateFields.push('end_date = ?');
      updateValues.push(endDate);
    }

    if (isOptional !== undefined) {
      updateFields.push('is_optional = ?');
      updateValues.push(Boolean(isOptional));
    }

    // Recalculate total days if dates changed
    const newStartDate = startDate || existing[0].start_date;
    const newEndDate = endDate || existing[0].end_date;
    const totalDays = calculateDaysBetween(newStartDate, newEndDate);
    updateFields.push('total_days = ?');
    updateValues.push(totalDays);

    updateFields.push('updated_at = NOW()');
    updateValues.push(id);

    await pool.execute(
      `UPDATE holidays SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    await logActivity(authResult.user.id, 'update_holiday', 'holiday', id, 
      `Updated holiday via Flutter`, req);

    return successResponse({
      message: 'Holiday updated successfully'
    });
  } catch (error) {
    console.error('Flutter Update holiday error:', error);
    return errorResponse('Internal server error', 500);
  }
}

// Delete holiday
export async function DELETE(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { id } = params;

    const [existing] = await pool.execute(
      'SELECT title FROM holidays WHERE id = ?',
      [id]
    );

    if (existing.length === 0) {
      return errorResponse('Holiday not found', 404);
    }

    await pool.execute('DELETE FROM holidays WHERE id = ?', [id]);

    await logActivity(authResult.user.id, 'delete_holiday', 'holiday', id, 
      `Deleted holiday via Flutter: ${existing[0].title}`, req);

    return successResponse({
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    console.error('Flutter Delete holiday error:', error);
    return errorResponse('Internal server error', 500);
  }
}

