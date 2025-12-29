-- Fees Management Tables
-- Add fees tables for intern fee management

-- Intern Fees Table (stores total fees for each intern)
CREATE TABLE IF NOT EXISTS intern_fees (
    id INT PRIMARY KEY AUTO_INCREMENT,
    employee_id INT NOT NULL,
    total_fees DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    remaining_amount DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
    notes TEXT,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_employee_fees (employee_id),
    INDEX idx_employee (employee_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fee Payments Table (stores individual payment transactions)
CREATE TABLE IF NOT EXISTS fee_payments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    intern_fees_id INT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method ENUM('cash', 'bank_transfer', 'online', 'cheque', 'other') DEFAULT 'cash',
    transaction_id VARCHAR(255),
    notes TEXT,
    receipt_number VARCHAR(100) UNIQUE,
    created_by INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (intern_fees_id) REFERENCES intern_fees(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_intern_fees (intern_fees_id),
    INDEX idx_payment_date (payment_date),
    INDEX idx_receipt_number (receipt_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

