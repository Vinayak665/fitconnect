const express = require('express');
const router = express.Router();
const Trainer = require('../models/Trainer');
const Booking = require('../models/Booking');
const multer = require('multer');
const path = require('path');
const { sendBookingStatusEmail } = require('../utils/mailer');
const fs = require('fs');
const supabase = require('../database'); // Added this
const { cache } = require('../utils/cache'); 

// Configure Multer - use memoryStorage for Vercel (read-only filesystem)
const upload = multer({ 
    storage: multer.memoryStorage(),
    fileFilter: (req, file, cb) => {
        if (file.fieldname === 'certifications') {
            const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
            const ext = path.extname(file.originalname).toLowerCase();
            if (allowedTypes.includes(ext)) {
                cb(null, true);
            } else {
                cb(new Error('Only PDF, JPG, and PNG files are allowed for certifications'));
            }
        } else {
            cb(null, true);
        }
    },
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    }
});

// Middleware for authentication
const isAuthenticated = (req, res, next) => {
    console.log('🔐 Trainer Auth Check:', {
        hasTrainerId: !!req.session.trainerId,
        trainerId: req.session.trainerId,
        userRole: req.session.userRole,
        path: req.path,
        method: req.method
    });
    
    if (req.session.trainerId && req.session.userRole === 'trainer') {
        console.log('✅ Trainer authenticated, proceeding to dashboard');
        next();
    } else {
        console.log('❌ Trainer not authenticated');
        
        // Return 401 JSON for ALL non-GET requests or requests explicitly asking for JSON
        const isApiRequest = req.method !== 'GET' || 
                            req.xhr || 
                            (req.headers.accept && req.headers.accept.includes('application/json'));

        if (isApiRequest) {
            return res.status(401).json({ 
                success: false, 
                error: 'Session expired. Please log in again.', 
                redirect: '/trainer/login' 
            });
        }
        res.redirect('/trainer/login');
    }
}

// ---------------- Public/Auth Routes ----------------

router.get('/login', (req, res) => {
    res.render('trainer/login-modern', { mode: req.query.mode });
});

router.post('/login', async (req, res) => {
    try {
        console.log('=== Trainer Login Attempt ===');
        console.log('Login data:', {
            email: req.body.email,
            hasPassword: !!req.body.password
        });
        
        const trainer = await Trainer.findByEmail(req.body.email);
        console.log('Trainer lookup result:', trainer ? 'Found' : 'Not found');
        
        if (trainer) {
            console.log('Trainer details:', {
                id: trainer.id,
                name: trainer.name,
                status: trainer.status,
                email: trainer.email
            });
            
            const passwordMatch = await Trainer.comparePassword(req.body.password, trainer.password);
            console.log('Password match:', passwordMatch ? 'Yes' : 'No');
            
            if (passwordMatch) {
                if (trainer.status !== 'approved') {
                    console.log('❌ Trainer not approved:', trainer.status);
                    return res.send("<script>alert('Your account is pending admin approval or rejected.'); window.history.back();</script>");
                }
                
                // Set session data
                req.session.trainerId = trainer.id;
                req.session.userRole = 'trainer';
                
                console.log('✅ Session set:', {
                    trainerId: req.session.trainerId,
                    userRole: req.session.userRole,
                    sessionId: req.sessionID
                });
                
                console.log('🎯 Redirecting to dashboard...');
                res.redirect('/trainer/dashboard');
            } else {
                console.log('❌ Password incorrect');
                res.send("<script>alert('Invalid Credentials'); window.history.back();</script>");
            }
        } else {
            console.log('❌ Trainer not found');
            res.send("<script>alert('Invalid Credentials'); window.history.back();</script>");
        }
    } catch (err) {
        console.error('❌ Login error:', err);
        res.status(500).send("Login error.");
    }
});

router.get('/request', (req, res) => {
    res.render('trainer/request');
});

router.post('/request', upload.fields([{name: 'profile_image', maxCount: 1}, {name: 'certifications', maxCount: 5}]), async (req, res) => {
    try {
        const data = {
            ...req.body,
            // Use originalname as placeholder (memoryStorage on Vercel has no disk path)
            profile_image: req.files && req.files.profile_image ? 
                'trainer-' + Date.now() + path.extname(req.files.profile_image[0].originalname) : null,
            booking_amount: req.body.booking_amount || 0
        };
        await Trainer.create(data);
        res.send("<script>alert('Application submitted successfully! Please wait for Admin approval.'); window.location.href='/';</script>");
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.send("<script>alert('Email already registered! Please use a different email or login.'); window.history.back();</script>");
        } else {
            res.status(500).send("<script>alert('Error submitting application. Please try again later.'); window.history.back();</script>");
        }
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});


// ---------------- Protected Routes ----------------

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const trainerId = req.session.trainerId;
        console.log('=== Trainer Dashboard Request ===');
        console.log('Session data:', {
            trainerId: trainerId,
            userRole: req.session.userRole,
            sessionId: req.sessionID
        });
        
        if (!trainerId) {
            console.log('❌ No trainerId in session');
            return res.redirect('/trainer/login');
        }

        console.log('Loading data for trainer ID:', trainerId);
        
        // Fetch trainer and bookings in parallel for better performance
        const [trainer, bookings] = await Promise.all([
            Trainer.findById(trainerId),
            Booking.findByTrainerId(trainerId)
        ]);

        console.log('Trainer found:', trainer ? 'Yes' : 'No');
        console.log('Bookings count:', bookings ? bookings.length : 0);
        
        if (!trainer) {
            console.log('❌ Trainer record not found in database, destroying session');
            req.session.destroy();
            return res.redirect('/trainer/login');
        }
        
        console.log('🎯 Rendering dashboard...');
        res.render('trainer/dashboard', { trainer, bookings });
        console.log('✅ Dashboard rendered successfully');
        
    } catch (err) {
        console.error('❌ Dashboard route error:', err);
        console.error('Stack trace:', err.stack);
        
        // Provide more helpful error message in UI
        let userMessage = "Unable to load dashboard data. Please try again later.";
        if (err.code === '22P02') {
            userMessage = "Session data mismatch. Please logout and login again.";
        } else if (err.message) {
            userMessage = "Dashboard error: " + err.message;
        }

        res.status(500).send(`
            <html>
                <body style="font-family: sans-serif; text-align: center; padding-top: 50px;">
                    <h2 style="color: #e74c3c;">Oops! Something went wrong.</h2>
                    <p>${userMessage}</p>
                    <a href="/trainer/logout" style="display: inline-block; padding: 10px 20px; background: #2c3e50; color: white; text-decoration: none; border-radius: 5px;">Return to Login</a>
                </body>
            </html>
        `);
    }
});

router.get('/profile', isAuthenticated, (req, res) => {
    res.redirect('/trainer/dashboard');
});

router.post('/profile', isAuthenticated, upload.fields([{name: 'profile_image', maxCount: 1}, {name: 'certifications', maxCount: 5}]), async (req, res) => {
    try {
        const trainer = await Trainer.findById(req.session.trainerId);
        const data = {
            ...req.body,
            profile_image: req.files.profile_image ? req.files.profile_image[0].filename : trainer.profile_image,
        };
        
        // Handle new certifications - temporarily disabled until database column is added
        // if (req.files.certifications && req.files.certifications.length > 0) {
        //     const newCerts = req.files.certifications.map(file => file.filename);
        //     const existingCerts = trainer.certifications || [];
        //     data.certifications = [...existingCerts, ...newCerts];
        // }
        
        await Trainer.updateProfile(req.session.trainerId, data);
        res.redirect('/trainer/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Update error.");
    }
});

router.post('/booking/:id/status', async (req, res) => {
    // Manual auth check to keep it all in one block for debugging
    if (!req.session || !req.session.trainerId) {
        return res.status(401).json({ success: false, error: 'Not logged in' });
    }

    try {
        const { id } = req.params;
        const { status, suggestion } = req.body;
        
        console.log(`[DEBUG] Status Update: ID=${id}, Status=${status}, Suggestion=${suggestion}`);

        // 1. Immediate DB Update
        const { data, error } = await supabase
            .from('bookings')
            .update({ 
                status: status, 
                trainer_suggestion: suggestion, // Save the suggestion to DB
                updated_at: new Date().toISOString() 
            })
            .eq('id', id)
            .select();

        if (error) {
            console.error('[DEBUG] DB Error:', error);
            return res.status(500).json({ success: false, error: error.message });
        }

        // 1.5 Invalidate User Cache so they see the update immediately
        if (data && data.length > 0 && data[0].user_id) {
            const userId = data[0].user_id;
            cache.delete(`user_dashboard_${userId}`);
            console.log(`[DEBUG] Invalidated dashboard cache for user ${userId}`);
        }

        // 2. Success Response
        res.json({ success: true, updated: data });

        // 3. Background Email - Fetch full details including trainer name for a professional email
        try {
            const fullBooking = await Booking.findById(id);
            if (fullBooking) {
                const trainerName = fullBooking.trainers ? fullBooking.trainers.name : 'Your FitConnect Trainer';
                
                sendBookingStatusEmail(
                    fullBooking.client_email, 
                    trainerName, 
                    status, 
                    fullBooking.booking_date,
                    suggestion
                ).then(sent => {
                    if (sent) console.log(`[DEBUG] Status email sent to ${fullBooking.client_email}`);
                    else console.warn(`[DEBUG] Status email failed to send to ${fullBooking.client_email}`);
                });
            }
        } catch (e) {
            console.error('[DEBUG] Background fetch/email error:', e);
        }

    } catch (err) {
        console.error('[DEBUG] Catch Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
