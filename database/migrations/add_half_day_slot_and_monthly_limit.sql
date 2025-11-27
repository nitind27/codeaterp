-- Migration: Add half-day slot tracking and indexes for monthly limits
-- Adds half_day_slot column to leave applications and an index to speed up monthly checks

ALTER TABLE leave_applications
ADD COLUMN half_day_slot ENUM('before_lunch', 'after_lunch') NULL AFTER duration_type,
MODIFY COLUMN total_days DECIMAL(5,2) NOT NULL;

-- Optional: ensure any existing half-day leaves default to before lunch
UPDATE leave_applications
SET half_day_slot = 'before_lunch'
WHERE duration_type = 'half_day' AND half_day_slot IS NULL;

-- Allow fractional days in leave balance as well
ALTER TABLE leave_balance
MODIFY COLUMN total_days DECIMAL(5,2) DEFAULT 0.00,
MODIFY COLUMN used_days DECIMAL(5,2) DEFAULT 0.00,
MODIFY COLUMN pending_days DECIMAL(5,2) DEFAULT 0.00;

-- Add a composite index to speed up monthly leave checks
CREATE INDEX idx_leave_month ON leave_applications (employee_id, start_date);


