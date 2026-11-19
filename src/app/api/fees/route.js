import { NextResponse } from 'next/server';
import pool from '../../../../lib/db.js';
import { authorize } from '../../../../lib/auth.js';
import { ensureSchema } from '../../../../lib/ensureSchema.js';

// Get all intern fees (admin) or own fees (intern)
export async function GET(req) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin', 'hr', 'intern')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employeeId');

    let query = `
      SELECT 
        \`if\`.id,
        \`if\`.employee_id,
        \`if\`.total_fees,
        \`if\`.paid_amount,
        \`if\`.remaining_amount,
        \`if\`.notes,
        \`if\`.period_start,
        \`if\`.period_end,
        \`if\`.created_at,
        \`if\`.updated_at,
        e.first_name,
        e.last_name,
        e.employee_id as emp_id,
        u.email,
        u.role
      FROM intern_fees \`if\`
      JOIN employees e ON \`if\`.employee_id = e.id
      JOIN users u ON e.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    // If intern, only show their own fees
    if (user.role === 'intern') {
      const [employeeData] = await pool.execute(
        'SELECT id FROM employees WHERE user_id = ?',
        [user.id]
      );
      if (employeeData.length === 0) {
        return NextResponse.json({ success: true, fees: [] });
      }
      query += ' AND `if`.employee_id = ?';
      params.push(employeeData[0].id);
    } else if (employeeId) {
      // Admin/HR can filter by employee ID
      query += ' AND `if`.employee_id = ?';
      params.push(employeeId);
    }

    query += ' ORDER BY e.first_name, e.last_name';

    const [fees] = await pool.execute(query, params);

    // Get payment history for each fee record
    const feesWithPayments = await Promise.all(
      fees.map(async (fee) => {
        const [payments] = await pool.execute(
          `SELECT 
            id,
            amount,
            payment_date,
            payment_method,
            transaction_id,
            notes,
            receipt_number,
            created_at
          FROM fee_payments
          WHERE intern_fees_id = ?
          ORDER BY payment_date DESC, created_at DESC`,
          [fee.id]
        );

        return {
          id: fee.id,
          employeeId: fee.employee_id,
          employeeName: `${fee.first_name} ${fee.last_name}`,
          employeeCode: fee.emp_id,
          email: fee.email,
          totalFees: parseFloat(fee.total_fees),
          paidAmount: parseFloat(fee.paid_amount),
          remainingAmount: parseFloat(fee.remaining_amount),
          notes: fee.notes,
          periodStart: fee.period_start,
          periodEnd: fee.period_end,
          payments: payments.map(p => ({
            id: p.id,
            amount: parseFloat(p.amount),
            paymentDate: p.payment_date,
            paymentMethod: p.payment_method,
            transactionId: p.transaction_id,
            notes: p.notes,
            receiptNumber: p.receipt_number,
            createdAt: p.created_at
          })),
          createdAt: fee.created_at,
          updatedAt: fee.updated_at
        };
      })
    );

    const asDay = (value) => {
      if (!value) return null;
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return String(value).slice(0, 10);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    };
    const today = asDay(new Date());
    const visibleFees = user.role === 'intern'
      ? feesWithPayments.filter((fee) => !fee.periodStart || asDay(fee.periodStart) <= today)
      : feesWithPayments;

    return NextResponse.json({
      success: true,
      fees: visibleFees
    });
  } catch (error) {
    console.error('Get fees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or update intern fees (admin only)
export async function POST(req) {
  try {
    await ensureSchema();
    const authResult = await authorize('admin', 'hr')(req);
    if (authResult.error) {
      return NextResponse.json(
        { error: authResult.error, sessionExpired: authResult.sessionExpired || false },
        { status: authResult.status }
      );
    }

    const data = await req.json();
    const { employeeId, totalFees, notes, periodStart, periodEnd } = data;

    if (!employeeId || totalFees === undefined || totalFees === null) {
      return NextResponse.json(
        { error: 'Employee ID and total fees are required' },
        { status: 400 }
      );
    }

    if (parseFloat(totalFees) < 0) {
      return NextResponse.json(
        { error: 'Total fees cannot be negative' },
        { status: 400 }
      );
    }

    // Check if employee exists and is an intern
    const [employee] = await pool.execute(
      `SELECT e.id, e.user_id, u.role 
       FROM employees e
       JOIN users u ON e.user_id = u.id
       WHERE e.id = ?`,
      [employeeId]
    );

    if (employee.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    if (employee[0].role !== 'intern') {
      return NextResponse.json(
        { error: 'Fees can only be set for interns' },
        { status: 400 }
      );
    }

    // Check if fees record already exists
    const [existingFees] = await pool.execute(
      'SELECT id, paid_amount FROM intern_fees WHERE employee_id = ?',
      [employeeId]
    );

    let feesId;
    let paidAmount = 0;

    if (existingFees.length > 0) {
      // Update existing fees
      feesId = existingFees[0].id;
      paidAmount = parseFloat(existingFees[0].paid_amount);
      
      await pool.execute(
        `UPDATE intern_fees 
         SET total_fees = ?, 
             remaining_amount = ? - paid_amount,
             notes = ?,
             period_start = ?,
             period_end = ?,
             updated_at = NOW()
         WHERE id = ?`,
        [totalFees, totalFees, notes || null, periodStart || null, periodEnd || null, feesId]
      );
    } else {
      // Create new fees record
      const [result] = await pool.execute(
        `INSERT INTO intern_fees (employee_id, total_fees, paid_amount, remaining_amount, notes, period_start, period_end, created_by)
         VALUES (?, ?, 0, ?, ?, ?, ?, ?)`,
        [employeeId, totalFees, totalFees, notes || null, periodStart || null, periodEnd || null, authResult.user.id]
      );
      feesId = result.insertId;
    }

    return NextResponse.json({
      success: true,
      message: existingFees.length > 0 ? 'Fees updated successfully' : 'Fees created successfully',
      fees: {
        id: feesId,
        employeeId,
        totalFees: parseFloat(totalFees),
        paidAmount,
        remainingAmount: parseFloat(totalFees) - paidAmount
      }
    });
  } catch (error) {
    console.error('Create/update fees error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

