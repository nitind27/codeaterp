-- Check if date_of_birth column exists in employees table
-- Run this first to verify if you need to run the migration

USE codeat_erp;

-- Check if column exists
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN 'Column date_of_birth EXISTS ✓'
        ELSE 'Column date_of_birth DOES NOT EXIST ✗ - Run migration script'
    END AS status
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'codeat_erp'
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME = 'date_of_birth';

-- Show column details if it exists
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_TYPE
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'codeat_erp'
  AND TABLE_NAME = 'employees'
  AND COLUMN_NAME = 'date_of_birth';

