import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authorize } from '../../../../lib/auth.js';
import { logActivity } from '../../../../lib/logger.js';
import { sendLeaveApprovalEmail } from '../../../../lib/email.js';

// Approve/Reject leave
export async function PUT(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const { id } = params;
    const { status, rejectionReason } = await req.json();

    if (!status || !['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status. Must be approved or rejected' },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: 'Leave application not found' },
        { status: 404 }
      );
    }

    const leave = leaves[0];

    if (leave.status !== 'pending') {
      return NextResponse.json(
        { error: 'Leave application already processed' },
        { status: 400 }
      );
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
      await pool.execute(
        `UPDATE leave_balance 
         SET pending_days = pending_days - ?, used_days = used_days + ?
         WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [leave.total_days, leave.total_days, leave.employee_id, leave.leave_type_id, currentYear]
      );

      // Send email
      await sendLeaveApprovalEmail(
        { first_name: leave.first_name, last_name: leave.last_name, user_id: leave.user_id },
        { ...leave, status: 'approved' }
      );
    } else {
      // Reject leave
      await pool.execute(
        `UPDATE leave_applications 
         SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
         WHERE id = ?`,
        [authResult.user.id, rejectionReason || 'Rejected by HR', id]
      );

      // Update leave balance (remove pending days)
      await pool.execute(
        `UPDATE leave_balance 
         SET pending_days = pending_days - ?
         WHERE employee_id = ? AND leave_type_id = ? AND year = ?`,
        [leave.total_days, leave.employee_id, leave.leave_type_id, currentYear]
      );

      // Send email
      await sendLeaveApprovalEmail(
        { first_name: leave.first_name, last_name: leave.last_name, user_id: leave.user_id },
        { ...leave, status: 'rejected', rejection_reason: rejectionReason }
      );
    }

    await logActivity(authResult.user.id, `${status}_leave`, 'leave', id, 
      `${status.charAt(0).toUpperCase() + status.slice(1)} leave application`, req);

    return NextResponse.json({
      success: true,
      message: `Leave application ${status} successfully`
    });
  } catch (error) {
    console.error('Update leave error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}


