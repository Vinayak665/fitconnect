const supabase = require('../database');
const bcrypt = require('bcryptjs');

class Admin {
    static async create(username, password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        const { data, error } = await supabase
            .from('admins')
            .insert([{ username, password: hashedPassword }])
            .select();
        
        if (error) throw error;
        return data[0].id;
    }

    static async findByUsername(username) {
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('username', username)
            .maybeSingle();

        if (error) throw error;
        return data; // returns null if no rows exactly
    }

    static async comparePassword(plainText, hashedPassword) {
        return bcrypt.compare(plainText, hashedPassword);
    }
}

module.exports = Admin;
