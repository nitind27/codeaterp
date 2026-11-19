import pool from './db.js';

export async function loadEmployeeAccess(user, employeeId) {
  const [rows] = await pool.execute(
    'SELECT id, user_id FROM employees WHERE id = ?',
    [employeeId]
  );
  if (!rows.length) return { error: 'Employee not found', status: 404 };

  const isAdmin = user.role === 'admin';
  const isHr = user.role === 'hr';
  if (!isAdmin && !isHr) {
    const [own] = await pool.execute('SELECT id FROM employees WHERE user_id = ?', [user.id]);
    if (!own.length || Number(own[0].id) !== Number(employeeId)) {
      return { error: 'Insufficient permissions', status: 403 };
    }
  }

  return { employee: rows[0], isAdmin, isHr };
}
