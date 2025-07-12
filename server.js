require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');
const { body, validationResult } = require('express-validator');

const { registerUser, loginUser, generateToken, authenticateToken } = require('./auth');
const RPNCalculatorService = require('./calculator');

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize calculator service
const calculator = new RPNCalculatorService();

// ========== SECURITY MIDDLEWARE ==========

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"], // Allow inline scripts for the frontend
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: {
    error: 'Too many requests',
    message: 'Rate limit exceeded. Please try again later.',
    retryAfter: '15 minutes'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in tests
});

// Strict rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit auth attempts
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again after 15 minutes.',
  },
  skipSuccessfulRequests: true,
  skip: (req) => process.env.NODE_ENV === 'test', // Skip rate limiting in tests
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Body parsing and logging
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('combined'));

// ========== VALIDATION MIDDLEWARE ==========

const validateRegistration = [
  body('username')
    .isLength({ min: 3, max: 20 })
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username must be 3-20 characters and contain only letters, numbers, and underscores'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .isLength({ min: 8 })
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
];

const validateLogin = [
  body('username')
    .notEmpty()
    .withMessage('Username or email is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

const validateCalculation = [
  body('expression')
    .notEmpty()
    .isString()
    .trim()
    .withMessage('Expression is required and must be a string'),
  body('verbose')
    .optional()
    .isBoolean()
    .withMessage('Verbose must be a boolean'),
];

// Error handling middleware for validation
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// ========== PUBLIC ROUTES ==========

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API information
app.get('/api', (req, res) => {
  res.json({
    name: 'RPN Calculator API',
    version: '1.0.0',
    description: 'Reverse Polish Notation calculator with JWT authentication',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (requires auth)'
      },
      calculator: {
        info: 'GET /api/calculator/info',
        calculate: 'POST /api/calculator/calculate (requires auth)'
      }
    },
    documentation: 'See README.md for detailed API documentation'
  });
});

// ========== AUTHENTICATION ROUTES ==========

// Register endpoint
app.post('/api/auth/register', validateRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    const user = await registerUser(username, email, password);
    const token = generateToken(user.id);

    res.status(201).json({
      message: 'User registered successfully',
      user: user.toJSON(),
      token: token
    });
  } catch (error) {
    res.status(400).json({
      error: 'Registration failed',
      message: error.message
    });
  }
});

// Login endpoint
app.post('/api/auth/login', validateLogin, handleValidationErrors, async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const user = await loginUser(username, password);
    const token = generateToken(user.id);

    res.json({
      message: 'Login successful',
      user: user.toJSON(),
      token: token
    });
  } catch (error) {
    res.status(401).json({
      error: 'Authentication failed',
      message: error.message
    });
  }
});

// Profile endpoint (protected)
app.get('/api/auth/profile', authenticateToken, (req, res) => {
  res.json({
    message: 'Profile retrieved successfully',
    user: req.user.toJSON()
  });
});

// ========== CALCULATOR ROUTES ==========

// Calculator info (public)
app.get('/api/calculator/info', (req, res) => {
  res.json(calculator.getInfo());
});

// Calculate expression (protected)
app.post('/api/calculator/calculate', authenticateToken, validateCalculation, handleValidationErrors, async (req, res) => {
  try {
    const { expression, verbose = false } = req.body;
    
    const result = await calculator.calculate(expression, verbose);
    
    res.json({
      message: 'Calculation completed successfully',
      user: req.user.username,
      ...result
    });
  } catch (error) {
    res.status(400).json({
      error: 'Calculation failed',
      message: error.message,
      user: req.user.username
    });
  }
});

// ========== STATIC FILE SERVING ==========

// Serve static files (for the frontend)
app.use(express.static('public'));

// Serve the frontend HTML
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// ========== ERROR HANDLING ==========

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableRoutes: [
      'GET /health',
      'GET /api',
      'POST /api/auth/register',
      'POST /api/auth/login',
      'GET /api/auth/profile',
      'GET /api/calculator/info',
      'POST /api/calculator/calculate'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  // Only log errors in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Server Error:', error);
  }
  
  res.status(error.status || 500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// ========== SERVER STARTUP ==========

// Graceful shutdown
const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Only start server if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 RPN Calculator API Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔒 JWT authentication enabled`);
    console.log(`🛡️  Security middleware active`);
    console.log(`📡 API available at http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
  });
}

module.exports = app;