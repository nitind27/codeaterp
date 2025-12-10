-- Migration: Add session_token to users table for single device login enforcement
-- Run this migration: mysql -u root -p codeat_erp < database/migrations/add_session_token.sql

USE codeat_erp;

-- Add session_token column to users table
ALTER TABLE users 
ADD COLUMN session_token VARCHAR(255) NULL AFTER last_login,
ADD INDEX idx_session_token (session_token);

-- Update existing users with NULL session_token (they will get a new token on next login)
UPDATE users SET session_token = NULL WHERE session_token IS NULL;

