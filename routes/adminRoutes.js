const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Trainer = require('../models/Trainer');
const User = require('../models/User');
const Booking = require('../models/Booking');
const { sendTrainerApprovalEmail, sendTrainerRejectionEmail } = require('../utils/mailer');

// Middleware
const isAuthenticated = (req, res, next) => {
    if (req.session.adminId && req.session.userRole === 'admin') {
        next();
    } else {
        res.redirect('/login');
    }
};

router.get('/login', (req, res) => {
    res.redirect('/login');
});

router.post('/login', async (req, res) => {
    res.redirect('/login');
});

router.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/login');
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
    try {
        await Trainer.updateStatus(req.params.id, 'approved');
        const trainer = await Trainer.findById(req.params.id);
        if (trainer && trainer.email) {
            const loginUrl = `${req.protocol}://${req.get('host')}/trainer/login`;
            await sendTrainerApprovalEmail(trainer.email, trainer.name, loginUrl);
        }
    } catch (err) {
        console.error("Error sending trainer approval email:", err);
    }
    res.redirect('/admin/trainers');
});

router.post('/trainers/:id/reject', isAuthenticated, async (req, res) => {
    try {
        await Trainer.updateStatus(req.params.id, 'rejected');
        const trainer = await Trainer.findById(req.params.id);
        if (trainer && trainer.email) {
            await sendTrainerRejectionEmail(trainer.email, trainer.name);
        }
    } catch (err) {
        console.error("Error sending trainer rejection email:", err);
    }
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
