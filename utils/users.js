const bcrypt = require('bcryptjs');

// In-memory user storage (for demo purposes)
// In production, you'd use a database like MongoDB, PostgreSQL, etc.
const users = [];

// Initialize with a demo user
async function initializeDemoUser() {
    const demoUserExists = users.find(u => u.email === 'demo@inspedia.com');

    if (!demoUserExists) {
        const hashedPassword = await bcrypt.hash('demo123', 10);
        users.push({
            id: 'demo-user-id',
            email: 'demo@inspedia.com',
            password: hashedPassword,
            name: 'Demo User',
            createdAt: new Date()
        });
    }
}

// Find user by email
const findUserByEmail = (email) => {
    return users.find(user => user.email === email);
};

// Find user by ID
const findUserById = (id) => {
    return users.find(user => user.id === id);
};

// Create new user
const createUser = async (userData) => {
    const { email, password, name } = userData;

    // Check if user already exists
    const existingUser = findUserByEmail(email);
    if (existingUser) {
        throw new Error('User already exists with this email');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
        id: 'user-' + Date.now(),
        email,
        password: hashedPassword,
        name: name || email.split('@')[0],
        createdAt: new Date()
    };

    users.push(newUser);
    return newUser;
};

// Validate password
const validatePassword = async (user, password) => {
    return await bcrypt.compare(password, user.password);
};

module.exports = {
    initializeDemoUser,
    findUserByEmail,
    findUserById,
    createUser,
    validatePassword,
    users // Expose for demo purposes
};