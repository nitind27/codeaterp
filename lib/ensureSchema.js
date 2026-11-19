import pool from './db.js';

let ready = null;

async function hasColumn(table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function run() {
  if (!(await hasColumn('employees', 'remote_attendance'))) {
    await pool.execute(
      'ALTER TABLE employees ADD COLUMN remote_attendance TINYINT(1) NOT NULL DEFAULT 0'
    );
  }

  if (!(await hasColumn('intern_fees', 'period_start'))) {
    await pool.execute(
      'ALTER TABLE intern_fees ADD COLUMN period_start DATE NULL, ADD COLUMN period_end DATE NULL'
    );
  }

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS task_submissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      task_id INT NULL,
      title VARCHAR(255) NOT NULL,
      submission_link VARCHAR(800) NULL,
      notes TEXT NULL,
      status ENUM('submitted','reviewed','accepted','revision') NOT NULL DEFAULT 'submitted',
      admin_note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_sub_employee (employee_id),
      INDEX idx_sub_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await ensureHolidayColumns();

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS portal_requests (
      id INT PRIMARY KEY AUTO_INCREMENT,
      employee_id INT NOT NULL,
      request_type VARCHAR(50) NOT NULL,
      subject VARCHAR(255) NOT NULL,
      details TEXT NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      admin_note TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_req_employee (employee_id),
      INDEX idx_req_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureHolidayColumns() {
  const [tables] = await pool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'holidays' LIMIT 1`
  );
  if (!tables.length) return;

  const add = async (column, definition) => {
    if (!(await hasColumn('holidays', column))) {
      await pool.execute(`ALTER TABLE holidays ADD COLUMN ${definition}`);
    }
  };

  await add('title', 'title VARCHAR(150) NULL');
  await add('description', 'description TEXT NULL');
  await add('start_date', 'start_date DATE NULL');
  await add('end_date', 'end_date DATE NULL');
  await add('total_days', 'total_days DECIMAL(5,2) NULL');
  await add('is_optional', 'is_optional TINYINT(1) NOT NULL DEFAULT 0');
  await add('created_by', 'created_by INT NULL');
  await add('updated_at', 'updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  const [legacy] = await pool.execute(
    `SELECT COLUMN_NAME, IS_NULLABLE, COLUMN_TYPE
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'holidays'
       AND COLUMN_NAME IN ('name', 'date')`
  );
  for (const column of legacy) {
    if (column.IS_NULLABLE === 'YES') continue;
    if (column.COLUMN_NAME === 'name') {
      await pool.execute('ALTER TABLE holidays MODIFY name VARCHAR(255) NULL');
    }
    if (column.COLUMN_NAME === 'date') {
      await pool.execute('ALTER TABLE holidays MODIFY `date` DATE NULL');
    }
  }
}

export function ensureSchema() {
  if (!ready) {
    ready = run().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}
