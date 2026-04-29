-- Run this entire script in your Supabase SQL Editor

-- 1. Create Admins Table
CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    city TEXT,
    password TEXT NOT NULL,
    profile_image TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create Trainers Table
CREATE TABLE trainers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    specialization TEXT NOT NULL,
    experience INTEGER,
    contact_number TEXT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    profile_image TEXT,
    booking_amount NUMERIC(10, 2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Create Bookings Table
CREATE TABLE bookings (
    id SERIAL PRIMARY KEY,
    client_name TEXT NOT NULL,
    client_phone TEXT,
    client_email TEXT,
    trainer_id INTEGER REFERENCES trainers(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    booking_date TIMESTAMP WITH TIME ZONE NOT NULL,
    amount NUMERIC(10, 2),
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Insert the default Admin Account (Password: admin123 is hashed below using bcrypt)
-- Using a pre-hashed bcrypt string for 'admin123'
INSERT INTO admins (username, password) 
VALUES ('admin', '$2a$10$C82HofS8w7rUS/ZlDkZbxu4J89D9.P2T2.G31gB67H8xH4s3kE61.');
