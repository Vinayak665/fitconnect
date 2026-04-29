-- ============================================================
-- OTP Migration Script — Run in Supabase SQL Editor
-- Adds OTP columns to users and trainers tables for 
-- the Forgot Password feature.
-- ============================================================

-- 1. Add OTP columns to users table
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS otp_code TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP WITH TIME ZONE;

-- 2. Add OTP columns to trainers table
ALTER TABLE trainers
    ADD COLUMN IF NOT EXISTS otp_code TEXT,
    ADD COLUMN IF NOT EXISTS otp_expires TIMESTAMP WITH TIME ZONE;

-- 3. (Optional) Index for faster OTP lookups by email
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_trainers_email ON trainers(email);
