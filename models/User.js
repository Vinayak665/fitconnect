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
            updated_at: new Date().toISOString()
        };
        if (userData.profile_image) {
            updateData.profile_image = userData.profile_image;
        }
        
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
            console.error(`[ERROR] User.updateProfile received invalid ID: ${id}`);
            throw new Error('Invalid User ID');
        }

        const { error } = await supabase
            .from('users')
            .update(updateData)
            .eq('id', numericId);
            
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

    static async findOrCreateByGoogle(profile) {
        const email = profile.emails[0].value;
        const googleId = profile.id;
        
        // 1. Try to find user by google_id or email
        let { data: user, error } = await supabase
            .from('users')
            .select('*')
            .or(`google_id.eq.${googleId},email.eq.${email}`)
            .maybeSingle();
            
        if (error) throw error;
        
        if (user) {
            // Update google_id if it's missing (user was registered via email before)
            if (!user.google_id) {
                await supabase
                    .from('users')
                    .update({ google_id: googleId })
                    .eq('id', user.id);
            }
            return user;
        }
        
        // 2. Create new user if not found
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert([{
                name: profile.displayName,
                email: email,
                google_id: googleId,
                profile_image: profile.photos && profile.photos[0] ? profile.photos[0].value : null
            }])
            .select()
            .single();
            
        if (createError) throw createError;
        return newUser;
    }
}

module.exports = User;
