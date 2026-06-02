const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Trainer = require('../models/Trainer');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'your_google_client_id_here.apps.googleusercontent.com' ? process.env.GOOGLE_CLIENT_ID : 'placeholder',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET && process.env.GOOGLE_CLIENT_SECRET !== 'your_google_client_secret_here' ? process.env.GOOGLE_CLIENT_SECRET : 'placeholder',
    callbackURL: '/auth/google/callback',
    passReqToCallback: true,
    proxy: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
        // State format: "role|action|redirect"  e.g. "user|login|/dashboard"
        const stateParam = req.query.state || 'user';
        const parts = stateParam.split('|');
        const role   = parts[0] || 'user';
        const action = parts[1] || 'login';   // 'login' or 'register'

        console.log(`[DEBUG] Google OAuth callback. Role: ${role}, Action: ${action}, Email: ${profile.emails[0].value}`);

        let account;
        if (role === 'trainer') {
            // Trainers always find-or-create (they apply first, so register = first-time login)
            account = await Trainer.findOrCreateByGoogle(profile);
        } else if (action === 'register') {
            account = await User.findOrCreateByGoogle(profile);
        } else {
            // Login-only: only find existing users, never auto-create
            account = await User.findByGoogle(profile);
        }

        if (!account) {
            // User tried to login via Google but is not registered yet
            return done(null, false, { message: 'No account found with this Google email. Please register first.' });
        }

        return done(null, { ...account, role });
    } catch (err) {
        console.error('❌ Google Strategy Error:', err);
        return done(err, null);
    }
  }
));

// Check if configured
if (!process.env.GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID === 'your_google_client_id_here.apps.googleusercontent.com') {
    console.warn('⚠️ WARNING: Google OAuth is NOT configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

// We don't really need passport sessions because we use cookie-session manually,
// but passport requires these to be defined if we use passport.initialize()
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
