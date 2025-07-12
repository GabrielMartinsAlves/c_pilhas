const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * In-memory user storage for demonstration
 * In production, this would be replaced with a database
 */
const users = new Map();

/**
 * User model class
 */
class User {
  constructor(username, email, password) {
    this.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    this.username = username;
    this.email = email;
    this.password = password;
    this.createdAt = new Date();
    this.lastLogin = null;
  }

  /**
   * Remove password from user object for API responses
   */
  toJSON() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}

/**
 * Hash password using bcrypt
 */
const hashPassword = async (password) => {
  const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare password with hash
 */
const comparePassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '24h' }
  );
};

/**
 * Register new user
 */
const registerUser = async (username, email, password) => {
  // Check if user already exists
  for (const user of users.values()) {
    if (user.username === username || user.email === email) {
      throw new Error('User already exists');
    }
  }

  // Hash password and create user
  const hashedPassword = await hashPassword(password);
  const user = new User(username, email, hashedPassword);
  users.set(user.id, user);

  return user;
};

/**
 * Login user
 */
const loginUser = async (username, password) => {
  // Find user by username or email
  let user = null;
  for (const u of users.values()) {
    if (u.username === username || u.email === username) {
      user = u;
      break;
    }
  }

  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check password
  const isValidPassword = await comparePassword(password, user.password);
  if (!isValidPassword) {
    throw new Error('Invalid credentials');
  }

  // Update last login
  user.lastLogin = new Date();

  return user;
};

/**
 * Get user by ID
 */
const getUserById = (userId) => {
  return users.get(userId);
};

/**
 * JWT Authentication middleware
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authorization token'
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or expired'
      });
    }

    // Get user from storage
    const user = getUserById(decoded.userId);
    if (!user) {
      return res.status(403).json({ 
        error: 'User not found',
        message: 'The user associated with this token no longer exists'
      });
    }

    req.user = user;
    next();
  });
};

module.exports = {
  User,
  registerUser,
  loginUser,
  getUserById,
  generateToken,
  authenticateToken,
  users // Export for testing purposes
};