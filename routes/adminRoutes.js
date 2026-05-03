const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Booking = require('../models/Booking');

// Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.adminId && req.session.userRole === 'admin') {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

router.get('/login', (req, res) => {
    res.render('admin/login-modern');
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        console.log('Login attempt for username:', username);

        // --- NEW: Admin Credentials Logic ---
        const MASTER_ADMIN_USER = 'vinayak';
        const MASTER_ADMIN_PASS = '6362596973@vinayak';

        // 1. Check for Master Credentials
        if (username === MASTER_ADMIN_USER && password === MASTER_ADMIN_PASS) {
            console.log('Master Admin login detected');
            
            const admin = await Admin.findByUsername(MASTER_ADMIN_USER);
            req.session.adminId = admin ? admin.id : 'master_admin_id';
            req.session.userRole = 'admin';
            
            console.log('Admin session set, redirecting to dashboard');
            return res.redirect('/admin/dashboard');
        }

        // 2. Standard DB Lookup
        const admin = await Admin.findByUsername(username);
        if (admin) {
            const passwordMatch = await Admin.comparePassword(password, admin.password);
            if (passwordMatch) {
                req.session.adminId = admin.id;
                req.session.userRole = 'admin';
                return res.redirect('/admin/dashboard');
            } else {
                res.send("<script>alert('Invalid Admin Credentials - Wrong Password'); window.history.back();</script>");
            }
        } else {
            res.send("<script>alert('Invalid Admin Credentials - User Not Found'); window.history.back();</script>");
        }
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).send("Admin login error");
    }
});

router.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/admin/login');
});

// ------------- Protected Routes --------------

router.get('/dashboard', isAuthenticated, async (req, res) => {
    try {
        const trainers = await Trainer.getAll();
        const users = await User.getAll();
        const bookings = await Booking.getAll();
        
        const stats = {
            trainersCount: trainers.length,
            usersCount: users.length,
            bookingsCount: bookings.length,
            pendingTrainers: trainers.filter(t => t.status === 'pending').length
        };
        
        res.render('admin/dashboard', { stats });
    } catch(err) {
        console.error(err);
        res.status(500).send("error");
    }
});

router.get('/trainers', isAuthenticated, async (req, res) => {
    const trainers = await Trainer.getAll();
    res.render('admin/trainers', { trainers });
});

router.post('/trainers/:id/approve', isAuthenticated, async (req, res) => {
    await Trainer.updateStatus(req.params.id, 'approved');
    res.redirect('/admin/trainers');
});

router.post('/trainers/:id/reject', isAuthenticated, async (req, res) => {
    await Trainer.updateStatus(req.params.id, 'rejected');
    res.redirect('/admin/trainers');
});

router.get('/users', isAuthenticated, async (req, res) => {
    const users = await User.getAll();
    res.render('admin/users', { users });
});

router.get('/bookings', isAuthenticated, async (req, res) => {
    const bookings = await Booking.getAll();
    res.render('admin/bookings', { bookings });
});

module.exports = router;
