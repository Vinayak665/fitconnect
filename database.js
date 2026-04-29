require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase URL or Key in .env file");
}

// Create Supabase client with optimized settings
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    },
    db: {
        schema: 'public'
    },
    global: {
        headers: {
            'Connection': 'keep-alive'
        }
    }
});

console.log('Connected to Supabase successfully.');

module.exports = supabase;
