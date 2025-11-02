const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        // For development, allow requests without token
        // In production, you might want to redirect to login
        req.user = { id: 'demo-user', email: 'demo@example.com' };
        return next();
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Token is invalid
            // For development, create a demo user
            req.user = { id: 'demo-user', email: 'demo@example.com' };
            return next();
        }
        req.user = user;
        next();
    });
};

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        // Check for session cookie as fallback
        if (req.session && req.session.user) {
            req.user = req.session.user;
            return next();
        }

        // For development, allow access
        req.user = { id: 'demo-user', email: 'demo@example.com' };
        return next();

        // In production, you would redirect to login or return 401
        // return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            // Check session as fallback
            if (req.session && req.session.user) {
                req.user = req.session.user;
                return next();
            }

            // For development, allow access
            req.user = { id: 'demo-user', email: 'demo@example.com' };
            return next();

            // In production:
            // return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Generate JWT token
const generateToken = (user) => {
    return jwt.sign(
        {
            id: user.id,
            email: user.email,
            name: user.name
        },
        JWT_SECRET,
        { expiresIn: '7d' }
    );
};

module.exports = {
    authenticateToken,
    requireAuth,
    generateToken,
    JWT_SECRET
};