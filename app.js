require('dotenv').config();
// Server Restart Triggered: 2026-04-11 (Clear Test Data)
const express = require('express');
const path = require('path');
const session = require('express-session');
const compression = require('compression');
const db = require('./database'); // Initialize DB

const app = express();
const PORT = process.env.PORT || 3003;

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
app.use('/components', express.static(path.join(__dirname, 'components')));
app.use('/lib', express.static(path.join(__dirname, 'lib')));

// Session Setup with optimized settings
app.use(session({
    secret: process.env.SESSION_SECRET || 'fitconnect_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production', // Auto HTTPS on Vercel
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        httpOnly: true
    }
}));

// Make session available to all views
app.use((req, res, next) => {
    res.locals.session = req.session || {};
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
    const fs = require('fs');
    const logMessage = `\n[${new Date().toISOString()}] GLOBAL ERROR: ${err.message}\nSTACK: ${err.stack}\n`;
    try {
        fs.appendFileSync(path.join(__dirname, 'error_log.txt'), logMessage);
    } catch (e) {
        console.error('Failed to write to error_log.txt:', e);
    }
    
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
    
    res.status(500).send('Something broke! Check error_log.txt for details.');
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
