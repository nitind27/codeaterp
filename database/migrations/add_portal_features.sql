-- Remote attendance permission, fee period, task submissions, portal requests

ALTER TABLE employees
  ADD COLUMN IF NOT EXISTS remote_attendance TINYINT(1) NOT NULL DEFAULT 0;

ALTER TABLE intern_fees
  ADD COLUMN IF NOT EXISTS period_start DATE NULL,
  ADD COLUMN IF NOT EXISTS period_end DATE NULL;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
