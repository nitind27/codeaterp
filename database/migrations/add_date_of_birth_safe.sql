-- Safe Migration: Add date_of_birth field to employees table
-- This version checks if the column exists before adding it
-- Works with MySQL 5.7+ and MariaDB

USE codeat_erp;

-- Procedure to safely add column if it doesn't exist
DELIMITER $$

DROP PROCEDURE IF EXISTS AddDateOfBirthColumn$$

CREATE PROCEDURE AddDateOfBirthColumn()
BEGIN
    DECLARE column_exists INT DEFAULT 0;
    
    -- Check if column exists
    SELECT COUNT(*) INTO column_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = 'codeat_erp'
      AND TABLE_NAME = 'employees'
      AND COLUMN_NAME = 'date_of_birth';
    
    -- Add column if it doesn't exist
    IF column_exists = 0 THEN
        ALTER TABLE employees 
        ADD COLUMN date_of_birth DATE 
        AFTER phone;
        
        SELECT 'Column date_of_birth added successfully' AS result;
    ELSE
        SELECT 'Column date_of_birth already exists' AS result;
    END IF;
END$$

DELIMITER ;

-- Execute the procedure
CALL AddDateOfBirthColumn();

-- Drop the procedure after use
DROP PROCEDURE IF EXISTS AddDateOfBirthColumn;

-- Optional: Add index for better query performance on birthday searches
-- Uncomment the line below if you want to add an index
-- CREATE INDEX idx_date_of_birth ON employees(date_of_birth);

-- Verify
SELECT 
    COLUMN_NAME, 
    DATA_TYPE, 
    IS_NULLABLE,
    COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'codeat_erp'
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME = 'date_of_birth';

