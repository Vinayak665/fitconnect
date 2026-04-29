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
        console.log('Login attempt for username:', req.body.username);
        const admin = await Admin.findByUsername(req.body.username);
        console.log('Admin found:', admin ? 'Yes' : 'No');
        
        if (admin) {
            console.log('Comparing password...');
            const passwordMatch = await Admin.comparePassword(req.body.password, admin.password);
            console.log('Password match:', passwordMatch ? 'Yes' : 'No');
            
            if (passwordMatch) {
                req.session.adminId = admin.id;
                req.session.userRole = 'admin';
                console.log('Session set, redirecting to dashboard');
                res.redirect('/admin/dashboard');
            } else {
                console.log('Password does not match');
                res.send("<script>alert('Invalid Admin Credentials - Wrong Password'); window.history.back();</script>");
            }
        } else {
            console.log('Admin not found');
            res.send("<script>alert('Invalid Admin Credentials - User Not Found'); window.history.back();</script>");
        }
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).send("Admin login error");
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy();
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
