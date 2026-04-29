const express = require('express');
const router = express.Router();
const supabase = require('../database');

// Middleware to check if user or trainer is logged in
const isAuthenticated = (req, res, next) => {
    if ((req.session.userId && req.session.userRole === 'user') || 
        (req.session.trainerId && req.session.userRole === 'trainer')) {
        next();
    } else {
        res.status(401).json({ success: false, error: 'Unauthorized' });
    }
};

// GET messages for a specific booking
router.get('/:bookingId', isAuthenticated, async (req, res) => {
    try {
        const { bookingId } = req.params;
        
        // Ensure the requester is actually part of this booking
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('user_id, trainer_id')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        // Validate access
        if (req.session.userRole === 'user' && Number(booking.user_id) !== Number(req.session.userId)) {
            console.log('User Forbidden:', typeof booking.user_id, booking.user_id, typeof req.session.userId, req.session.userId);
            return res.status(403).json({ success: false, error: 'Forbidden user access' });
        }
        if (req.session.userRole === 'trainer' && Number(booking.trainer_id) !== Number(req.session.trainerId)) {
            console.log('Trainer Forbidden:', booking.trainer_id, req.session.trainerId);
            return res.status(403).json({ success: false, error: 'Forbidden trainer access' });
        }

        // Fetch messages
        const { data: messages, error: msgError } = await supabase
            .from('messages')
            .select('*')
            .eq('booking_id', bookingId)
            .order('created_at', { ascending: true });

        if (msgError) throw msgError;

        res.json({ success: true, messages });
    } catch (err) {
        console.error('Chat GET Error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch messages' });
    }
});

// POST a new message
router.post('/:bookingId', isAuthenticated, async (req, res) => {
    try {
        const { bookingId } = req.params;
        const { content } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ success: false, error: 'Message content is required' });
        }

        // Determine sender details based on session
        const senderId = req.session.userRole === 'user' ? req.session.userId : req.session.trainerId;
        const senderType = req.session.userRole;

        // Verify booking access before sending
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select('user_id, trainer_id')
            .eq('id', bookingId)
            .single();

        if (bookingError || !booking) {
            return res.status(404).json({ success: false, error: 'Booking not found' });
        }

        if (senderType === 'user' && Number(booking.user_id) !== Number(senderId)) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }
        if (senderType === 'trainer' && Number(booking.trainer_id) !== Number(senderId)) {
            return res.status(403).json({ success: false, error: 'Forbidden' });
        }

        const { data, error } = await supabase
            .from('messages')
            .insert([{ 
                booking_id: bookingId, 
                sender_id: senderId, 
                sender_type: senderType, 
                content: content.trim() 
            }])
            .select();

        if (error) throw error;

        res.json({ success: true, message: data[0] });
    } catch (err) {
        console.error('Chat POST Error:', err);
        res.status(500).json({ success: false, error: 'Failed to send message' });
    }
});

module.exports = router;
