import { NextResponse } from 'next/server';
import pool from '../../../../../lib/db.js';
import { authorize } from '../../../../../lib/auth.js';
import { sendPaymentReceiptEmail } from '../../../../../lib/email.js';

// Add payment for intern fees (admin only)
export async function POST(req) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const data = await req.json();
    const { internFeesId, amount, paymentDate, paymentMethod, transactionId, notes } = data;

    if (!internFeesId || !amount || !paymentDate) {
      return NextResponse.json(
        { error: 'Intern fees ID, amount, and payment date are required' },
        { status: 400 }
      );
    }

    const paymentAmount = parseFloat(amount);
    if (paymentAmount <= 0) {
      return NextResponse.json(
        { error: 'Payment amount must be greater than 0' },
        { status: 400 }
      );
    }

    // Get current fees record
    const [feesRecord] = await pool.execute(
      `SELECT \`if\`.*, e.first_name, e.last_name, e.employee_id as emp_id, u.email
       FROM intern_fees \`if\`
       JOIN employees e ON \`if\`.employee_id = e.id
       JOIN users u ON e.user_id = u.id
       WHERE \`if\`.id = ?`,
      [internFeesId]
    );

    if (feesRecord.length === 0) {
      return NextResponse.json(
        { error: 'Fees record not found' },
        { status: 404 }
      );
    }

    const fees = feesRecord[0];
    const currentPaid = parseFloat(fees.paid_amount);
    const totalFees = parseFloat(fees.total_fees);
    const newPaidAmount = currentPaid + paymentAmount;

    // Check if payment exceeds remaining amount
    const remainingAmount = totalFees - currentPaid;
    if (paymentAmount > remainingAmount) {
      return NextResponse.json(
        { error: `Payment amount (${paymentAmount}) exceeds remaining amount (${remainingAmount})` },
        { status: 400 }
      );
    }

    // Generate receipt number
    const receiptNumber = `REC-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

    // Insert payment record
    const [paymentResult] = await pool.execute(
      `INSERT INTO fee_payments 
       (intern_fees_id, amount, payment_date, payment_method, transaction_id, notes, receipt_number, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        internFeesId,
        paymentAmount,
        paymentDate,
        paymentMethod || 'cash',
        transactionId || null,
        notes || null,
        receiptNumber,
        authResult.user.id
      ]
    );

    const paymentId = paymentResult.insertId;

    // Update intern_fees table
    const newRemainingAmount = totalFees - newPaidAmount;
    await pool.execute(
      `UPDATE intern_fees 
       SET paid_amount = ?, 
           remaining_amount = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [newPaidAmount, newRemainingAmount, internFeesId]
    );

    // Get payment details for email
    const [paymentDetails] = await pool.execute(
      `SELECT * FROM fee_payments WHERE id = ?`,
      [paymentId]
    );

    // Send email notification
    try {
      await sendPaymentReceiptEmail({
        email: fees.email,
        internName: `${fees.first_name} ${fees.last_name}`,
        employeeId: fees.emp_id,
        receiptNumber: receiptNumber,
        paymentAmount: paymentAmount,
        paymentDate: paymentDate,
        paymentMethod: paymentMethod || 'cash',
        totalFees: totalFees,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount,
        transactionId: transactionId || null
      });
    } catch (emailError) {
      console.error('Failed to send payment receipt email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      message: 'Payment recorded successfully',
      payment: {
        id: paymentId,
        receiptNumber,
        amount: paymentAmount,
        paymentDate,
        paymentMethod: paymentMethod || 'cash',
        totalFees,
        paidAmount: newPaidAmount,
        remainingAmount: newRemainingAmount
      }
    });
  } catch (error) {
    console.error('Add payment error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

