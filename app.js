require('dotenv').config();

const express = require('express');
const path = require('path');
const session = require('cookie-session');
const compression = require('compression');
const db = require('./database'); // Initialize DB

const app = express();
const PORT = process.env.PORT || 3003;

// Enable trust proxy for secure sessions on Vercel
app.set('trust proxy', 1);

// Middleware
app.use(compression()); // Enable gzip compression
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.json({ limit: '10mb' }));

// Static file caching
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d', // Cache static files for 1 day
    etag: true
}));
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    maxAge: '1d',
    etag: true
}));
app.use('/uploads/certifications', express.static(path.join(__dirname, 'uploads/certifications'), {
    maxAge: '1d',
    etag: true
}));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// Session Setup with cookie-session (Persistent on Vercel)
app.use(session({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'fitconnect_secret_key'],
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
}));

const passport = require('./utils/auth');
app.use(passport.initialize());
app.use(passport.session());

// Make session available to all views
app.use((req, res, next) => {
    res.locals.session = req.session || {};
    next();
});

// Prevent browser from caching dynamic HTML to avoid outdated DOM on back-button navigation
app.use((req, res, next) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    next();
});

// View Engine Setup with caching
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
app.set('view cache', process.env.NODE_ENV === 'production'); // Enable cache in production


// Routes Setup
const userRoutes = require('./routes/userRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const adminRoutes = require('./routes/adminRoutes');
const chatRoutes = require('./routes/chatRoutes');

app.use('/', userRoutes);
app.use('/trainer', trainerRoutes);
app.use('/admin', adminRoutes);
app.use('/chat', chatRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
    // Only log to console (no file writes - Vercel filesystem is read-only)
    console.error('❌ Global Error:', err.stack);
    
    // Check if the request expects JSON
    const isJson = req.xhr || (req.headers.accept && req.headers.accept.includes('application/json'));
    
    if (isJson) {
        return res.status(500).json({ 
            success: false, 
            error: 'Server error: ' + err.message,
            stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
        });
    }
    
    res.status(500).send('Something broke! Error: ' + err.message);
});

// Start Server (local dev only)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export for Vercel serverless
module.exports = app;
