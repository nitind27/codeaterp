import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { sendFeesReminderEmail } from '../../../../../lib/email.js';

// POST /api/fees/reminder — send fees reminder email to an intern
export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { feesId, requestAmount, notes, dueDate } = await req.json();

    if (!feesId || !requestAmount || parseFloat(requestAmount) <= 0) {
      return NextResponse.json({ error: 'feesId and a valid requestAmount are required' }, { status: 400 });
    }

    // Fetch fees record with intern details
    const [rows] = await pool.execute(
      `SELECT
         \`if\`.id,
         \`if\`.total_fees,
         \`if\`.paid_amount,
         \`if\`.remaining_amount,
         \`if\`.notes AS fee_notes,
         e.first_name,
         e.last_name,
         e.employee_id AS emp_id,
         u.email
       FROM intern_fees \`if\`
       JOIN employees e ON \`if\`.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE \`if\`.id = ?`,
      [feesId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ error: 'Fees record not found' }, { status: 404 });
    }

    const fee = rows[0];

    // Get admin name
    const [adminRows] = await pool.execute(
      `SELECT COALESCE(CONCAT(e.first_name,' ',e.last_name), u.email) AS name
       FROM users u LEFT JOIN employees e ON u.id = e.user_id
       WHERE u.id = ?`,
      [authResult.user.id]
    );
    const adminName = adminRows[0]?.name || 'Codeat Infotech Finance Team';

    const result = await sendFeesReminderEmail({
      email:           fee.email,
      internName:      `${fee.first_name} ${fee.last_name}`,
      employeeId:      fee.emp_id,
      totalFees:       parseFloat(fee.total_fees),
      paidAmount:      parseFloat(fee.paid_amount),
      remainingAmount: parseFloat(fee.remaining_amount),
      requestAmount:   parseFloat(requestAmount),
      dueDate:         dueDate || null,
      notes:           notes   || null,
      adminName,
    });

    if (!result.success) {
      return NextResponse.json({ error: 'Failed to send reminder email: ' + result.error }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Reminder sent to ${fee.email}`,
    });
  } catch (error) {
    console.error('Fees reminder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
