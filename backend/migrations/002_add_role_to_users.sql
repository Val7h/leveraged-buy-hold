-- Migration: Add Role Field to Users (Optional)
-- Version: 002
-- Date: 2024-06-05
-- Description: Add role-based access control to users table

-- This migration is OPTIONAL. If you want to implement role-based access control
-- instead of using email-based admin checking, run this migration.

ALTER TABLE users ADD COLUMN role VARCHAR(20) NOT NULL DEFAULT 'user'
    AFTER is_active;

-- Create index for role
CREATE INDEX idx_role ON users(role);

-- Update migration history
INSERT INTO migrations (name) VALUES ('002_add_role_to_users');
