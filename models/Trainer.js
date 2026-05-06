const supabase = require('../database');
const bcrypt = require('bcryptjs');

class Trainer {
    static async create(trainerData) {
        const hashedPassword = await bcrypt.hash(trainerData.password, 10);
        
        const { data, error } = await supabase
            .from('trainers')
            .insert([{ 
                name: trainerData.name, 
                city: trainerData.city, 
                specialization: trainerData.specialization, 
                experience: trainerData.experience, 
                contact_number: trainerData.contact_number, 
                email: trainerData.email, 
                password: hashedPassword, 
                profile_image: trainerData.profile_image, 
                booking_amount: trainerData.booking_amount,
                certifications: trainerData.certifications || []
            }])
            .select();
            
        if (error) throw error;
        return data[0].id;
    }

    static async findByEmail(email) {
        const { data, error } = await supabase
            .from('trainers')
            .select('*')
            .eq('email', email)
            .maybeSingle();
            
        if (error) throw error;
        return data;
    }

    static async findById(id) {
        try {
            const numericId = parseInt(id);
            if (isNaN(numericId)) {
                console.warn('⚠️ Trainer.findById called with invalid ID:', id);
                return null;
            }

            const { data, error } = await supabase
                .from('trainers')
                .select('id, name, city, specialization, experience, contact_number, email, profile_image, booking_amount, status, created_at, upi_id, qr_code, certifications')
                .eq('id', numericId)
                .maybeSingle();
                
            if (error) {
                console.error('❌ Supabase error in Trainer.findById:', error);
                throw error;
            }
            return data;
        } catch (err) {
            console.error('❌ Error in Trainer.findById:', err.message);
            throw err;
        }
    }

    static async updateProfile(id, trainerData) {
        const updateData = { 
            name: trainerData.name, 
            city: trainerData.city, 
            specialization: trainerData.specialization, 
            experience: trainerData.experience ? parseInt(trainerData.experience) : 0, 
            contact_number: trainerData.contact_number, 
            booking_amount: trainerData.booking_amount ? parseFloat(trainerData.booking_amount) : 0, 
            profile_image: trainerData.profile_image,
            upi_id: trainerData.upi_id,
            qr_code: trainerData.qr_code,
            certifications: trainerData.certifications,
            updated_at: new Date().toISOString()
        };
        
        const numericId = parseInt(id);
        if (isNaN(numericId)) {
            console.error(`[ERROR] Trainer.updateProfile received invalid ID: ${id}`);
            throw new Error('Invalid Trainer ID');
        }

        const { data, error } = await supabase
            .from('trainers')
            .update(updateData)
            .eq('id', numericId)
            .select();

        if (error) {
            console.error('❌ Supabase Update Error:', error);
            throw error;
        }
        
        console.log(`[DEBUG] Update successful. Rows updated:`, data?.length);
        return data;
    }

    static async updateStatus(id, status) {
         const { error } = await supabase
            .from('trainers')
            .update({ status: status, updated_at: new Date() })
            .eq('id', id);
            
         if (error) throw error;
         return true;
    }

    static async getAll() {
        const { data, error } = await supabase
            .from('trainers')
            .select('id, name, city, specialization, experience, contact_number, email, profile_image, booking_amount, status, created_at, upi_id, qr_code, certifications')
            .order('created_at', { ascending: false })
            .limit(100); // Limit for performance
            
        if (error) throw error;
        return data;
    }

    static async search(city, specialization) {
        let query = supabase
            .from('trainers')
            .select('id, name, city, specialization, experience, contact_number, email, profile_image, booking_amount, status, created_at, upi_id, qr_code, certifications')
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(50); // Limit results for better performance

        if (city) {
            query = query.ilike('city', `%${city}%`);
        }
        if (specialization) {
            query = query.ilike('specialization', `%${specialization}%`);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    }

    static async comparePassword(plainText, hashedPassword) {
        return bcrypt.compare(plainText, hashedPassword);
    }

    static async saveOTP(email, otp, expires) {
        const { error } = await supabase
            .from('trainers')
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
            .from('trainers')
            .select('id, otp_code, otp_expires')
            .eq('email', email)
            .maybeSingle();

        if (error) throw error;
        if (!data) return { valid: false, message: 'Trainer not found' };

        const now = new Date();
        const expires = new Date(data.otp_expires);

        if (data.otp_code === otp && now < expires) {
            return { valid: true, trainerId: data.id };
        } else if (now >= expires) {
            return { valid: false, message: 'OTP has expired' };
        } else {
            return { valid: false, message: 'Invalid OTP' };
        }
    }

    static async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const { error } = await supabase
            .from('trainers')
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
        
        // 1. Try to find trainer by google_id or email
        let { data: trainer, error } = await supabase
            .from('trainers')
            .select('*')
            .or(`google_id.eq.${googleId},email.eq.${email}`)
            .maybeSingle();
            
        if (error) throw error;
        
        if (trainer) {
            // Update google_id if it's missing
            if (!trainer.google_id) {
                await supabase
                    .from('trainers')
                    .update({ google_id: googleId })
                    .eq('id', trainer.id);
            }
            return trainer;
        }
        
        // 2. Create new trainer if not found (default to approved for Google)
        const { data: newTrainer, error: createError } = await supabase
            .from('trainers')
            .insert([{
                name: profile.displayName,
                email: email,
                google_id: googleId,
                profile_image: profile.photos && profile.photos[0] ? profile.photos[0].value : null,
                status: 'approved' // Automatically approve Google logins for now
            }])
            .select()
            .single();
            
        if (createError) throw createError;
        return newTrainer;
    }
}

module.exports = Trainer;
