-- Migration: Add more leave types
-- This migration adds additional leave types to the system

INSERT INTO leave_types (name, code, max_days, is_paid, description) VALUES
('Maternity Leave', 'ML', 90, TRUE, 'Maternity leave for expecting mothers'),
('Paternity Leave', 'PL', 15, TRUE, 'Paternity leave for new fathers'),
('Compensatory Off', 'CO', 10, TRUE, 'Compensatory off for working on holidays'),
('Bereavement Leave', 'BL', 5, TRUE, 'Leave for family bereavement'),
('Marriage Leave', 'MR', 3, TRUE, 'Leave for marriage'),
('Emergency Leave', 'EM', 5, TRUE, 'Emergency leave for urgent situations')
ON DUPLICATE KEY UPDATE name=VALUES(name), description=VALUES(description);

