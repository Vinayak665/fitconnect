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
        // The role is passed in the 'state' parameter of the OAuth request
        // which Google returns in the query string of the callback
        const stateParam = req.query.state || 'user';
        const role = stateParam.includes('|') ? stateParam.split('|')[0] : stateParam;
        console.log(`[DEBUG] Google OAuth callback triggered. Role: ${role}, State: ${stateParam}, Email: ${profile.emails[0].value}`);
        
        let account;
        if (role === 'trainer') {
            account = await Trainer.findOrCreateByGoogle(profile);
        } else {
            account = await User.findOrCreateByGoogle(profile);
        }
        
        if (!account) {
            return done(new Error('Failed to find or create user account'), null);
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
