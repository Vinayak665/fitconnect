require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("⚠️ WARNING: Missing SUPABASE_URL or SUPABASE_KEY environment variables!");
    console.error("SUPABASE_URL:", supabaseUrl ? "SET" : "MISSING");
    console.error("SUPABASE_KEY:", supabaseKey ? "SET" : "MISSING");
}

let supabase;
try {
    // createClient throws if URL/KEY are undefined
    supabase = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseKey || 'placeholder-key',
        {
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
        }
    );
    console.log('Supabase client created. URL configured:', !!supabaseUrl);
} catch (err) {
    console.error('Failed to create Supabase client:', err.message);
    // Create a dummy client that returns errors instead of crashing
    supabase = {
        from: () => ({ select: () => ({ data: null, error: new Error('Supabase not configured') }) })
    };
}

module.exports = supabase;
