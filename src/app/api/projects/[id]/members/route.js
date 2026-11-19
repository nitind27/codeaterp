import { NextResponse } from 'next/server';
import pool from '../../../../../../lib/db.js';
import { authorize } from '../../../../../../lib/auth.js';

export async function POST(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const { employeeId, role } = await req.json();
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee is required' }, { status: 400 });
    }

    const allowed = ['lead', 'developer', 'designer', 'tester', 'other'];
    const memberRole = allowed.includes(role) ? role : 'developer';

    await pool.execute(
      `INSERT INTO project_members (project_id, employee_id, role)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE role = VALUES(role)`,
      [id, employeeId, memberRole]
    );

    return NextResponse.json({ success: true, message: 'Member added to the project group' });
  } catch (error) {
    console.error('Add project member error:', error);
    return NextResponse.json({ error: 'Could not add member' }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const authResult = await authorize('admin', 'hr', 'project_manager')(req);
    if (authResult.error) {
      return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    }

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const employeeId = searchParams.get('employee_id');
    if (!employeeId) {
      return NextResponse.json({ error: 'Employee is required' }, { status: 400 });
    }

    await pool.execute(
      'DELETE FROM project_members WHERE project_id = ? AND employee_id = ?',
      [id, employeeId]
    );

    return NextResponse.json({ success: true, message: 'Member removed' });
  } catch (error) {
    console.error('Remove project member error:', error);
    return NextResponse.json({ error: 'Could not remove member' }, { status: 500 });
  }
}
