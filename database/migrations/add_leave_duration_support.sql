-- Migration: Add support for hourly and half-day leaves
-- This migration adds duration_type, time fields, and hours support to leave system

-- Add columns to leave_applications table
ALTER TABLE leave_applications 
ADD COLUMN duration_type ENUM('full_day', 'half_day', 'hourly') DEFAULT 'full_day' AFTER leave_type_id,
ADD COLUMN start_time TIME NULL AFTER start_date,
ADD COLUMN end_time TIME NULL AFTER end_date,
ADD COLUMN total_hours DECIMAL(5,2) DEFAULT 0.00 AFTER total_days;

-- Add hours support to leave_balance table
ALTER TABLE leave_balance
ADD COLUMN total_hours DECIMAL(5,2) DEFAULT 0.00 AFTER total_days,
ADD COLUMN used_hours DECIMAL(5,2) DEFAULT 0.00 AFTER used_days,
ADD COLUMN pending_hours DECIMAL(5,2) DEFAULT 0.00 AFTER pending_days;

-- Update existing records to have full_day as default
UPDATE leave_applications SET duration_type = 'full_day' WHERE duration_type IS NULL;

-- Add index for duration_type
CREATE INDEX idx_duration_type ON leave_applications(duration_type);

