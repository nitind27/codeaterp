-- Migration: Add date_of_birth field to employees table
-- Run this if your database was created before the date_of_birth field was added

USE codeat_erp;

-- Check if column exists, if not add it
-- Note: MySQL doesn't support IF NOT EXISTS for ALTER TABLE ADD COLUMN
-- So we'll use a procedure or just run the ALTER statement
-- If column already exists, it will show an error which you can ignore

-- Add date_of_birth column if it doesn't exist
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS date_of_birth DATE 
AFTER phone;

-- If the above doesn't work (older MySQL versions), use this instead:
-- First check manually if column exists, then run:
-- ALTER TABLE employees ADD COLUMN date_of_birth DATE AFTER phone;

-- Add index for birthday queries (optional but recommended for performance)
-- CREATE INDEX idx_date_of_birth ON employees(date_of_birth);

-- Verify the column was added
-- DESCRIBE employees;

