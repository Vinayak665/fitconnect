-- Run this in your Supabase SQL Editor to create the messages table

CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id INT REFERENCES bookings(id) ON DELETE CASCADE,
    sender_id INT NOT NULL,
    sender_type VARCHAR(20) CHECK (sender_type IN ('user', 'trainer')) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Note: Ensure 'messages' has RLS disabled or appropriately configured. 
-- For a standard Express.js backend where the DB is accessed via service key or backend logic, 
-- policies are not strictly necessary, but good practice.
