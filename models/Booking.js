const supabase = require('../database');

class Booking {
    static async create(bookingData) {
        const { data, error } = await supabase
            .from('bookings')
            .insert([{ 
                client_name: bookingData.client_name, 
                client_phone: bookingData.client_phone, 
                client_email: bookingData.client_email, 
                trainer_id: parseInt(bookingData.trainer_id), 
                user_id: bookingData.user_id ? parseInt(bookingData.user_id) : null, 
                booking_date: bookingData.booking_date, 
                amount: parseFloat(bookingData.amount) || 0,
                payment_method: bookingData.payment_method || 'offline',
                payment_status: bookingData.payment_status || 'pending'
            }])
            .select();
            
        if (error) throw error;
        return data[0].id;
    }

    static async findById(id) {
        const { data, error } = await supabase
            .from('bookings')
            .select('*')
            .eq('id', id)
            .single();
            
        if (error) throw error;
        return data;
    }

    static async findByUserId(userId) {
        // Fetch bookings and join with trainers - optimized query
        const { data, error } = await supabase
            .from('bookings')
            .select('id, client_name, client_phone, client_email, booking_date, amount, status, trainer_suggestion, created_at, payment_method, payment_status, trainers!inner(name)')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(20); // Limit for performance
            
        if (error) throw error;
        
        // Map data to match old sqlite flat structure (trainer_name)
        return data.map(b => ({
            ...b,
            trainer_name: b.trainers.name
        }));
    }

    static async findByTrainerId(trainerId) {
        try {
            // Ensure trainerId is a valid integer
            const id = parseInt(trainerId);
            if (isNaN(id)) {
                console.warn('⚠️ findByTrainerId called with invalid ID:', trainerId);
                return [];
            }

            const { data, error } = await supabase
                .from('bookings')
                .select('*')
                .eq('trainer_id', id)
                .order('created_at', { ascending: false });
                
            if (error) {
                console.error('❌ Supabase error in findByTrainerId:', error);
                throw error;
            }
            return data || [];
        } catch (err) {
            console.error('❌ Error in findByTrainerId:', err.message);
            throw err;
        }
    }

    static async getAll() {
        const { data, error } = await supabase
            .from('bookings')
            .select('id, client_name, client_phone, client_email, booking_date, amount, status, created_at, payment_method, payment_status, trainers(name), users(name)')
            .order('created_at', { ascending: false })
            .limit(100);
            
        if (error) throw error;
        
        return data.map(b => ({
            ...b,
            trainer_name: b.trainers ? b.trainers.name : 'Unknown',
            user_name: b.users ? b.users.name : 'Unknown'
        }));
    }

    static async getOccupiedSlots(trainerId) {
        const { data, error } = await supabase
            .from('bookings')
            .select('booking_date')
            .eq('trainer_id', trainerId)
            .neq('status', 'rejected')
            .neq('status', 'done');
            
        if (error) throw error;
        // Return as array of ISO strings
        return data.map(b => b.booking_date);
    }

    static async updateStatus(bookingId, status) {
        const { data, error } = await supabase
            .from('bookings')
            .update({ status, updated_at: new Date() })
            .eq('id', bookingId)
            .select();
            
        if (error) throw error;
        return data[0];
    }

    static async updatePaymentStatus(bookingId, payment_status) {
        const { data, error } = await supabase
            .from('bookings')
            .update({ payment_status, updated_at: new Date() })
            .eq('id', bookingId)
            .select();
            
        if (error) throw error;
        return data[0];
    }
}

module.exports = Booking;
