const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Trainer = require('../models/Trainer');
const Booking = require('../models/Booking');
const multer = require('multer');
const path = require('path');
const { sendEmail } = require('../utils/mailer');

// Configure Multer - use memoryStorage for Vercel (read-only filesystem)
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const { getCachedData, setCachedData, cache } = require('../utils/cache');

// Middleware to check if user is logged in
const isAuthenticated = (req, res, next) => {
    if (req.session.userId && req.session.userRole === 'user') {
        next();
    } else {
        res.redirect('/user-login');
    }
};

// ---------------- Public Routes ----------------

router.get('/', (req, res) => {
    res.render('index');
});

router.get('/search', async (req, res) => {
    try {
        const cacheKey = 'trainers_all';
        let trainers = getCachedData(cacheKey);
        
        if (!trainers) {
            trainers = await Trainer.search('', '');
            setCachedData(cacheKey, trainers);
        }
        
        res.render('search', { trainers, city: '', specialization: '' });
    } catch (err) {
        console.error('❌ Search Route Error:', err);
        const fs = require('fs');
        const path = require('path');
        const logMessage = `\n[${new Date().toISOString()}] SEARCH ERROR: ${err.message}\nSTACK: ${err.stack}\n`;
        fs.appendFileSync(path.join(__dirname, '../error_log.txt'), logMessage);
        res.status(500).send("Error fetching trainers: " + err.message);
    }
});

router.post('/search', async (req, res) => {
    const { city, specialization } = req.body;
    try {
        const cacheKey = `trainers_search_${city}_${specialization}`;
        let trainers = getCachedData(cacheKey);
        
        if (!trainers) {
            trainers = await Trainer.search(city, specialization);
            setCachedData(cacheKey, trainers);
        }
        
        res.render('search', { trainers, city, specialization });
    } catch (err) {
        console.error('❌ Search Filter Error:', err);
        const fs = require('fs');
        const path = require('path');
        const logMessage = `\n[${new Date().toISOString()}] SEARCH FILTER ERROR: ${err.message}\nSTACK: ${err.stack}\n`;
        fs.appendFileSync(path.join(__dirname, '../error_log.txt'), logMessage);
        res.status(500).send("Error filtering trainers: " + err.message);
    }
});

router.get('/book/:trainerId', async (req, res) => {
    try {
        const [trainer, occupiedSlots] = await Promise.all([
            Trainer.findById(req.params.trainerId),
            Booking.getOccupiedSlots(req.params.trainerId)
        ]);
        
        if (!trainer) return res.status(404).send("Trainer not found");
        
        res.render('book', { 
            trainer, 
            user: req.session.userId ? { id: req.session.userId } : null,
            occupiedSlots: JSON.stringify(occupiedSlots) // Pass as JSON for JS usage
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading booking page.");
    }
});

router.post('/book/:trainerId', async (req, res) => {
    try {
        const data = {
            client_name: req.body.client_name,
            client_phone: req.body.client_phone,
            client_email: req.body.client_email,
            booking_date: req.body.booking_date,
            amount: req.body.amount,
            trainer_id: req.params.trainerId,
            user_id: req.session.userId || null 
        };

        // Fetch occupied slots to check for collisions
        const occupied = await Booking.getOccupiedSlots(req.params.trainerId);

        // Normalize input date to UTC if it doesn't have a timezone specified
        let normalizedBookingDate = data.booking_date;
        if (!normalizedBookingDate.includes('Z') && !normalizedBookingDate.includes('+')) {
            normalizedBookingDate += ':00Z';
        }
        data.booking_date = normalizedBookingDate;

        const isOccupied = occupied.some(occDate => {
            const d1 = new Date(occDate).getTime();
            const d2 = new Date(normalizedBookingDate).getTime();
            // FORWARD-ONLY BLOCKING:
            // A new booking (d2) is blocked ONLY if it starts AT or AFTER an existing one (d1)
            // and within the 2-hour duration (7200000ms).
            return d2 >= d1 && d2 < d1 + 7200000;
        });

        if (isOccupied) {
            return res.send("<script>alert('Sorry, this slot was just taken by another user. Please choose a different time.'); window.history.back();</script>");
        }

        await Booking.create(data);
        
        // Invalidate dashboard cache for this user so they see the new booking immediately
        if (req.session.userId) {
            const cacheKey = `user_dashboard_${req.session.userId}`;
            cache.delete(cacheKey);
            console.log(`[DEBUG] Cache cleared for user ${req.session.userId}`);
        }

        res.send("<script>alert('Booking successful!'); window.location.href='/dashboard';</script>");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating booking.");
    }
});

// ---------------- Auth Routes ----------------

router.get('/user-login', (req, res) => {
    res.render('user/login-modern');
});

router.post('/user/register', async (req, res) => {
    try {
        await User.create(req.body);
        res.send("<script>alert('Registration successful! Please login.'); window.location.href='/user-login';</script>");
    } catch (err) {
        console.error(err);
        if (err.code === '23505') {
            res.send("<script>alert('Email already registered! Please use a different email or login.'); window.history.back();</script>");
        } else {
            res.status(500).send("<script>alert('Error during registration. Please try again later.'); window.history.back();</script>");
        }
    }
});

router.post('/user/login', async (req, res) => {
    try {
        const user = await User.findByEmail(req.body.email);
        if (user && await User.comparePassword(req.body.password, user.password)) {
            req.session.userId = user.id;
            req.session.userRole = 'user';
            res.redirect('/dashboard');
        } else {
            res.send("<script>alert('Invalid Credentials'); window.history.back();</script>");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error during login.");
    }
});

router.get('/user/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/');
});

// ---------------- Forgot Password (OTP) Routes ----------------

// Helper to send OTP email using the shared mailer utility
async function sendOTPEmail(email, otp) {
    console.log(`\n--- OTP GENERATED ---\nRecipient: ${email}\nOTP Code: ${otp}\n---------------------\n`);
    return sendEmail({
        to: email,
        subject: '🔐 Your FitConnect Password Reset Code',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background: #f8fafc;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 40px 30px; text-align: center; border-radius: 16px 16px 0 0;">
                    <h1 style="color: #38bdf8; margin: 0; font-size: 28px; letter-spacing: -0.5px;">FitConnect</h1>
                    <p style="color: rgba(255,255,255,0.5); margin: 6px 0 0; font-size: 13px;">Secure Password Reset</p>
                </div>
                <!-- Body -->
                <div style="background: #ffffff; padding: 40px 36px; border-left: 1px solid #e2e8f0; border-right: 1px solid #e2e8f0;">
                    <p style="color: #334155; font-size: 15px; line-height: 1.6; margin-top:0;">Hello,</p>
                    <p style="color: #334155; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Use the verification code below to continue. <strong>This code expires in 10 minutes.</strong></p>
                    
                    <div style="background: #f1f5f9; border: 2px dashed #cbd5e1; border-radius: 16px; padding: 30px; text-align: center; margin: 32px 0;">
                        <p style="margin: 0 0 8px; font-size: 12px; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 600;">Your One-Time Password</p>
                        <span style="font-size: 42px; font-weight: 900; letter-spacing: 12px; color: #0f172a; font-family: 'Courier New', monospace;">${otp}</span>
                    </div>

                    <div style="background: #fff7ed; border-left: 4px solid #fb923c; padding: 14px 18px; border-radius: 0 8px 8px 0; margin-top: 24px;">
                        <p style="margin: 0; color: #9a3412; font-size: 13px;">⚠️ <strong>Security tip:</strong> Never share this code with anyone. FitConnect will never ask for it.</p>
                    </div>

                    <p style="color: #64748b; font-size: 13px; margin-top: 28px;">If you didn't request a password reset, you can safely ignore this email. Your password won't change.</p>
                </div>
                <!-- Footer -->
                <div style="background: #f8fafc; padding: 24px; text-align: center; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 16px 16px;">
                    <p style="margin: 0; color: #94a3b8; font-size: 12px;">&copy; ${new Date().getFullYear()} FitConnect. All rights reserved.</p>
                </div>
            </div>
        `
    });
}

router.get('/forgot-password', (req, res) => {
    const role = req.query.role || 'user';
    res.render('user/forgot-password', { role });
});

router.post('/forgot-password', async (req, res) => {
    const { email, role } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    try {
        let userFound = false;
        if (role === 'user') {
            const user = await User.findByEmail(email);
            if (user) {
                await User.saveOTP(email, otp, expires);
                userFound = true;
            }
        } else {
            const trainer = await Trainer.findByEmail(email);
            if (trainer) {
                await Trainer.saveOTP(email, otp, expires);
                userFound = true;
            }
        }

        if (userFound) {
            const emailSent = await sendOTPEmail(email, otp);
            res.render('user/forgot-password', { 
                step: 2, 
                email, 
                role, 
                emailError: !emailSent 
            });
        } else {
            res.send("<script>alert('No account found with that email.'); window.history.back();</script>");
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error during forgot password process.");
    }
});

router.post('/verify-otp', async (req, res) => {
    const { email, role, otp } = req.body;

    try {
        let result;
        if (role === 'user') {
            result = await User.verifyOTP(email, otp);
        } else {
            result = await Trainer.verifyOTP(email, otp);
        }

        if (result.valid) {
            // Set temporary session for reset
            req.session.resetEmail = email;
            req.session.resetRole = role;
            req.session.resetUserId = result.userId || result.trainerId;
            req.session.otpVerified = true;
            
            res.render('user/forgot-password', { step: 3, role: req.session.resetRole || 'user' });
        } else {
            res.send(`<script>alert('${result.message}'); window.history.back();</script>`);
        }
    } catch (err) {
        console.error(err);
        res.status(500).send("Error verifying OTP.");
    }
});

router.post('/reset-password', async (req, res) => {
    const { password, confirmPassword } = req.body;
    const { resetEmail, resetRole, resetUserId, otpVerified } = req.session;

    if (!otpVerified) {
        return res.status(403).send("Unauthorized. Please verify OTP first.");
    }

    if (password !== confirmPassword) {
        return res.send("<script>alert('Passwords do not match.'); window.history.back();</script>");
    }

    try {
        if (resetRole === 'user') {
            await User.updatePassword(resetUserId, password);
        } else {
            await Trainer.updatePassword(resetUserId, password);
        }

        // Clear reset session
        delete req.session.resetEmail;
        delete req.session.resetRole;
        delete req.session.resetUserId;
        delete req.session.otpVerified;

        const loginUrl = resetRole === 'trainer' ? '/trainer/login' : '/user-login';
        res.send(`<script>alert('Password updated successfully! Please login with your new password.'); window.location.href='${loginUrl}';</script>`);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating password.");
    }
});

// ---------------- Protected User Routes ----------------

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const cacheKey = `user_dashboard_${req.session.userId}`;
        let cachedData = getCachedData(cacheKey);
        
        // Force fresh data to troubleshoot visibility issues
        if (true) {
            const [user, bookings] = await Promise.all([
                User.findById(req.session.userId),
                Booking.findByUserId(req.session.userId)
            ]);
            cachedData = { user, bookings };
        } else if (!cachedData) {
            const [user, bookings] = await Promise.all([
                User.findById(req.session.userId),
                Booking.findByUserId(req.session.userId)
            ]);
            cachedData = { user, bookings };
            setCachedData(cacheKey, cachedData);
        }
        
        res.render('user/dashboard', cachedData);
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading dashboard.");
    }
});

router.get('/edit-profile', isAuthenticated, async (req, res) => {
    try {
        const user = await User.findById(req.session.userId);
        res.render('user/edit-profile', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading profile.");
    }
});

router.post('/edit-profile', isAuthenticated, upload.single('profile_image'), async (req, res) => {
    try {
        const userData = { ...req.body };
        // Note: File uploads are stored in memory on Vercel (no persistent disk)
        // Profile image saved as base64 or skipped if no Supabase Storage bucket configured
        if (req.file) {
            // Store filename as placeholder - in production use Supabase Storage
            userData.profile_image = 'user-' + Date.now() + path.extname(req.file.originalname);
        }
        await User.updateProfile(req.session.userId, userData);
        cache.delete(`user_dashboard_${req.session.userId}`);
        res.redirect('/dashboard');
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating profile.");
    }
});

module.exports = router;
