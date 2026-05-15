import { NextResponse } from 'next/server';
import pool from '../../../../../../lib/db.js';
import { authorize } from '../../../../../../lib/auth.js';

// DELETE /api/fees/payments/[id] - Delete a payment and reverse the balance
export async function DELETE(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const { id } = await params;

    // Get the payment record
    const [payments] = await pool.execute(
      `SELECT fp.*, \`if\`.total_fees, \`if\`.paid_amount, \`if\`.remaining_amount
       FROM fee_payments fp
       JOIN intern_fees \`if\` ON fp.intern_fees_id = \`if\`.id
       WHERE fp.id = ?`,
      [id]
    );

    if (payments.length === 0) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    const payment = payments[0];
    const paymentAmount = parseFloat(payment.amount);
    const currentPaid = parseFloat(payment.paid_amount);
    const totalFees = parseFloat(payment.total_fees);

    const newPaidAmount = Math.max(0, currentPaid - paymentAmount);
    const newRemainingAmount = totalFees - newPaidAmount;

    // Delete the payment
    await pool.execute('DELETE FROM fee_payments WHERE id = ?', [id]);

    // Update the intern_fees totals
    await pool.execute(
      `UPDATE intern_fees SET paid_amount = ?, remaining_amount = ?, updated_at = NOW() WHERE id = ?`,
      [newPaidAmount, newRemainingAmount, payment.intern_fees_id]
    );

    return NextResponse.json({
      success: true,
      message: 'Payment deleted and balance reversed successfully',
      updated: { paidAmount: newPaidAmount, remainingAmount: newRemainingAmount }
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
