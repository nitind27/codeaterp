import { NextResponse } from 'next/server';
import pool from '../../../../../../lib/db.js';
import { authorize } from '../../../../../../lib/auth.js';

// Get receipt data for download
export async function GET(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr', 'intern')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    // Handle params - might be a Promise in Next.js 15+
    const resolvedParams = params instanceof Promise ? await params : params;
    const paymentId = resolvedParams.id;

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Payment ID is required' },
        { status: 400 }
      );
    }

    // Get payment details with intern and fees information
    const [payments] = await pool.execute(
      `SELECT 
        fp.id,
        fp.amount,
        fp.payment_date,
        fp.payment_method,
        fp.transaction_id,
        fp.notes,
        fp.receipt_number,
        fp.created_at,
        \`if\`.id as intern_fees_id,
        \`if\`.employee_id,
        \`if\`.total_fees,
        \`if\`.paid_amount,
        \`if\`.remaining_amount,
        e.first_name,
        e.last_name,
        e.employee_id as emp_id,
        e.phone,
        e.address,
        e.city,
        e.state,
        u.email
      FROM fee_payments fp
      JOIN intern_fees \`if\` ON fp.intern_fees_id = \`if\`.id
      JOIN employees e ON \`if\`.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE fp.id = ?`,
      [paymentId]
    );

    if (payments.length === 0) {
      return NextResponse.json(
        { error: 'Payment receipt not found' },
        { status: 404 }
      );
    }

    const payment = payments[0];

    // If intern, verify they own this payment
    if (authResult.user.role === 'intern') {
      const [employeeData] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [authResult.user.id]
      );
      if (employeeData.length === 0 || employeeData[0].id !== payment.employee_id) {
        return NextResponse.json(
          { error: 'Unauthorized access to this receipt' },
          { status: 403 }
        );
      }
    }

    // Get all payments for this intern to show payment history
    const [allPayments] = await pool.execute(
      `SELECT 
        id,
        amount,
        payment_date,
        payment_method,
        receipt_number
      FROM fee_payments
      WHERE intern_fees_id = (
        SELECT intern_fees_id FROM fee_payments WHERE id = ?
      )
      ORDER BY payment_date DESC, created_at DESC`,
      [paymentId]
    );

    // Validate required fields
    if (!payment.receipt_number || !payment.payment_date || !payment.amount) {
      console.error('Missing required payment fields:', payment);
      return NextResponse.json(
        { error: 'Invalid payment data - missing required fields' },
        { status: 500 }
      );
    }

    const receiptData = {
      receiptNumber: payment.receipt_number || 'N/A',
      paymentDate: payment.payment_date,
      paymentId: payment.id,
      intern: {
        name: `${payment.first_name || ''} ${payment.last_name || ''}`.trim() || 'N/A',
        employeeId: payment.emp_id || 'N/A',
        email: payment.email || '',
        phone: payment.phone || '',
        address: payment.address || '',
        city: payment.city || '',
        state: payment.state || ''
      },
      payment: {
        amount: parseFloat(payment.amount) || 0,
        paymentMethod: payment.payment_method || 'cash',
        transactionId: payment.transaction_id || null,
        notes: payment.notes || null,
        createdAt: payment.created_at
      },
      fees: {
        totalFees: parseFloat(payment.total_fees) || 0,
        paidAmount: parseFloat(payment.paid_amount) || 0,
        remainingAmount: parseFloat(payment.remaining_amount) || 0
      },
      paymentHistory: (allPayments || []).map(p => ({
        id: p.id,
        amount: parseFloat(p.amount) || 0,
        paymentDate: p.payment_date || '',
        paymentMethod: p.payment_method || 'cash',
        receiptNumber: p.receipt_number || 'N/A'
      }))
    };

    return NextResponse.json({
      success: true,
      receipt: receiptData
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

