const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
const Trainer = require('../models/Trainer');

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'your-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'your-client-secret',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3003/auth/google/callback',
    passReqToCallback: true
  },
  async (req, accessToken, refreshToken, profile, done) => {
    try {
        const role = req.query.state || 'user'; // We'll pass the role in the state parameter
        console.log(`OAuth callback for role: ${role}`);
        
        let account;
        if (role === 'trainer') {
            account = await Trainer.findOrCreateByGoogle(profile);
        } else {
            account = await User.findOrCreateByGoogle(profile);
        }
        
        return done(null, { ...account, role });
    } catch (err) {
        return done(err, null);
    }
  }
));

// We don't really need passport sessions because we use cookie-session manually,
// but passport requires these to be defined if we use passport.initialize()
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;
