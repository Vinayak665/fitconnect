const supabase = require('../database');
const bcrypt = require('bcryptjs');

class User {
    static async create(userData) {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const { data, error } = await supabase
            .from('users')
            .insert([{ 
                name: userData.name, 
                email: userData.email, 
                phone: userData.phone, 
                city: userData.city, 
                password: hashedPassword 
            }])
            .select();
            
        if (error) throw error;
        return data[0].id;
    }

    static async findByEmail(email) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .maybeSingle();
            
        if (error) throw error;
        return data;
    }

    static async findById(id) {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .maybeSingle();
            
        if (error) throw error;
        return data;
    }

    static async updateProfile(id, userData) {
        const updateData = { 
            name: userData.name, 
            phone: userData.phone, 
            city: userData.city,
            updated_at: new Date()
        };
        if (userData.profile_image) {
            updateData.profile_image = userData.profile_image;
        }
        
        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', id);
            
        if (error) throw error;
        return true;
    }

    static async getAll() {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
            
        if (error) throw error;
        return data;
    }

    static async comparePassword(plainText, hashedPassword) {
        return bcrypt.compare(plainText, hashedPassword);
    }

    static async saveOTP(email, otp, expires) {
        const { error } = await supabase
            .from('users')
            .update({ 
                otp_code: otp, 
                otp_expires: expires,
                updated_at: new Date()
            })
            .eq('email', email);
            
        if (error) throw error;
        return true;
    }

    static async verifyOTP(email, otp) {
        const { data, error } = await supabase
            .from('users')
            .select('id, otp_code, otp_expires')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { valid: false, message: 'User not found' };

        const now = new Date();
        const expires = new Date(data.otp_expires);

        if (data.otp_code === otp && now < expires) {
            return { valid: true, userId: data.id };
        } else if (now >= expires) {
            return { valid: false, message: 'OTP has expired' };
        } else {
            return { valid: false, message: 'Invalid OTP' };
        }
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase
            .from('users')
            .update({ 
                password: hashedPassword,
                otp_code: null,
                otp_expires: null,
                updated_at: new Date()
            })
            .eq('id', id);
            
        if (error) throw error;
        return true;
    }
}

module.exports = User;
