import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { logActivity } from '../../../../../lib/logger.js';
import { sendLeaveApprovalEmail } from '../../../../../lib/email.js';
import { handleOptions, errorResponse, successResponse } from '../../cors.js';

// Handle OPTIONS preflight request
export async function OPTIONS() {
  return handleOptions();
}

// Approve/Reject leave
export async function PUT(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return errorResponse(authResult.error, authResult.status);
    }

    const { id } = params;
    const { status, rejectionReason } = await req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return errorResponse('Invalid status. Must be approved or rejected', 400);
    }

    // Get leave application
    const [leaves] = await pool.execute(
      `SELECT la.*, e.user_id, e.first_name, e.last_name
       FROM leave_applications la
       JOIN employees e ON la.employee_id = e.id
       WHERE la.id = ?`,
      [id]
    );

    if (leaves.length === 0) {
      return errorResponse('Leave application not found', 404);
    }

    const leave = leaves[0];

    if (leave.status !== 'pending') {
      return errorResponse('Leave application already processed', 400);
    }

    const currentYear = new Date().getFullYear();

    if (status === 'approved') {
      // Update leave application
      await pool.execute(
        `UPDATE leave_applications 
         SET status = 'approved', approved_by = ?, approved_at = NOW()
         WHERE id = ?`,
        [authResult.user.id, id]
      );

      // Update leave balance
      if (leave.duration_type === 'hourly' && leave.total_hours > 0) {
        await pool.execute(
          `UPDATE leave_balance 
           SET pending_days = pending_days - ?, 
               pending_hours = COALESCE(pending_hours, 0) - ?,
               used_days = used_days + ?,
               used_hours = COALESCE(used_hours, 0) + ?
           WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
          [
            leave.total_days, 
            leave.total_hours,
            leave.total_days, 
            leave.total_hours,
            leave.employee_id, 
            leave.leave_type_id, 
            currentYear
          ]
        );
      } else {
        await pool.execute(
          `UPDATE leave_balance 
           SET pending_days = pending_days - ?, used_days = used_days + ?
           WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
          [leave.total_days, leave.total_days, leave.employee_id, leave.leave_type_id, currentYear]
        );
      }

      // Send email
      try {
        await sendLeaveApprovalEmail(
          { first_name: leave.first_name, last_name: leave.last_name, user_id: leave.user_id },
          { ...leave, status: 'approved' }
        );
      } catch (e) {
        console.error('Email error:', e);
      }
    } else {
      // Reject leave
      await pool.execute(
        `UPDATE leave_applications 
         SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
         WHERE id = ?`,
        [authResult.user.id, rejectionReason || 'Rejected by HR', id]
      );

      // Update leave balance
      if (leave.duration_type === 'hourly' && leave.total_hours > 0) {
        await pool.execute(
          `UPDATE leave_balance 
           SET pending_days = pending_days - ?,
               pending_hours = COALESCE(pending_hours, 0) - ?
           WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
          [leave.total_days, leave.total_hours, leave.employee_id, leave.leave_type_id, currentYear]
        );
      } else {
        await pool.execute(
          `UPDATE leave_balance 
           SET pending_days = pending_days - ?
           WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
          [leave.total_days, leave.employee_id, leave.leave_type_id, currentYear]
        );
      }

      // Send email
      try {
        await sendLeaveApprovalEmail(
          { first_name: leave.first_name, last_name: leave.last_name, user_id: leave.user_id },
          { ...leave, status: 'rejected', rejection_reason: rejectionReason }
        );
      } catch (e) {
        console.error('Email error:', e);
      }
    }

    await logActivity(authResult.user.id, `${status}_leave`, 'leave', id, 
      `${status.charAt(0).toUpperCase() + status.slice(1)} leave application via Flutter`, req);

    return successResponse({
      message: `Leave application ${status} successfully`
    });
  } catch (error) {
    console.error('Flutter Update leave error:', error);
    return errorResponse('Internal server error', 500);
  }
}

