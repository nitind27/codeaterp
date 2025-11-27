-- Migration: Reduce Sick Leave allocation to 4 days

-- Update leave_types master record
UPDATE leave_types
SET max_days = 4
WHERE code = 'SL';

-- Align existing leave_balance records for Sick Leave
UPDATE leave_balance lb
JOIN leave_types lt ON lb.leave_type_id = lt.id
SET lb.total_days = 4
WHERE lt.code = 'SL' AND lb.total_days <> 4;


