# RPN Calculator with JWT Authentication

A complete web-based Reverse Polish Notation (RPN) calculator with JWT authentication and security middleware.

## 🚀 Features

### Authentication System
- **JWT-based authentication** with secure token generation
- **User registration** with password hashing (bcrypt)
- **User login** with email or username support
- **Protected routes** with middleware authentication
- **Secure password requirements** with validation

### Security Middleware
- **Rate limiting** to prevent abuse
- **CORS protection** with configurable origins
- **Helmet security headers** (CSP, XSS protection, etc.)
- **Input validation** with express-validator
- **Error handling** with proper HTTP status codes

### Calculator Features
- **RPN expression evaluation** (supports +, -, *, /, ^)
- **Step-by-step verbose mode** for educational purposes
- **Input validation** and error handling
- **Real-time calculation** via REST API
- **Web-based frontend** for easy testing

## 📋 Requirements

- Node.js 16+ 
- npm 7+
- Modern web browser

## 🔧 Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd c_pilhas
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
```bash
cp .env.example .env
# Edit .env file with your settings
```

4. Start the server:
```bash
# Development mode
npm run dev

# Production mode
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## 🔐 Environment Configuration

```bash
# Server Configuration
NODE_ENV=development
PORT=3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRE=24h
BCRYPT_ROUNDS=12

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Security
CORS_ORIGIN=http://localhost:3000
```

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "string (3-20 chars, alphanumeric + underscore)",
  "email": "string (valid email)",
  "password": "string (8+ chars, uppercase, lowercase, number, special char)"
}
```

**Response:**
```json
{
  "message": "User registered successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "datetime"
  },
  "token": "jwt_token_string"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string (username or email)",
  "password": "string"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "lastLogin": "datetime"
  },
  "token": "jwt_token_string"
}
```

#### Get User Profile
```http
GET /api/auth/profile
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "message": "Profile retrieved successfully",
  "user": {
    "id": "string",
    "username": "string",
    "email": "string",
    "createdAt": "datetime",
    "lastLogin": "datetime"
  }
}
```

### Calculator Endpoints

#### Get Calculator Info
```http
GET /api/calculator/info
```

**Response:**
```json
{
  "name": "RPN Calculator Service",
  "version": "1.0.0",
  "supportedOperators": ["+", "-", "*", "/", "^"],
  "description": "Reverse Polish Notation calculator with JWT authentication",
  "features": [
    "Basic arithmetic operations",
    "Exponentiation",
    "Step-by-step verbose mode",
    "Input validation",
    "Error handling"
  ]
}
```

#### Calculate RPN Expression
```http
POST /api/calculator/calculate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "expression": "string (RPN expression)",
  "verbose": boolean (optional, default: false)
}
```

**Response:**
```json
{
  "message": "Calculation completed successfully",
  "user": "string (username)",
  "expression": "string",
  "result": number,
  "timestamp": "datetime",
  "steps": [
    {
      "action": "push|operation",
      "token": "string",
      "value": number,
      "stack": [numbers]
    }
  ]
}
```

### Utility Endpoints

#### Health Check
```http
GET /health
```

#### API Information
```http
GET /api
```

## 🧮 RPN Calculator Usage

### RPN (Reverse Polish Notation) Basics

RPN is a mathematical notation where operators follow their operands. For example:
- Infix: `(3 + 4) * 5`
- RPN: `3 4 + 5 *`

### Supported Operations

| Operator | Description | Example |
|----------|-------------|---------|
| `+` | Addition | `3 4 +` = 7 |
| `-` | Subtraction | `5 3 -` = 2 |
| `*` | Multiplication | `3 4 *` = 12 |
| `/` | Division | `8 2 /` = 4 |
| `^` | Exponentiation | `2 3 ^` = 8 |

### Example Expressions

```
Simple Addition:         3 4 +                    = 7
Complex Expression:      5 1 2 + 4 * + 3 -        = 14
With Decimals:          3.14159 2 *              = 6.283180
Exponentiation:         2 3 ^                    = 8
Nested Operations:      15 7 1 1 + - / 3 * 2 1 1 + + -  = 5
```

## 🧪 Testing

Run the complete test suite:

```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

### Test Coverage

- **Authentication System**: Registration, login, profile access, validation
- **Calculator API**: Expression evaluation, error handling, verbose mode
- **Security Middleware**: Rate limiting, CORS, input validation, error handling

## 🔒 Security Features

### Authentication Security
- **Password hashing** with bcrypt (configurable rounds)
- **JWT tokens** with configurable expiration
- **Secure token storage** recommendations
- **User input validation** and sanitization

### API Security
- **Rate limiting** (100 requests per 15 minutes by default)
- **CORS protection** with configurable origins
- **Helmet security headers**:
  - Content Security Policy (CSP)
  - X-Frame-Options
  - X-Content-Type-Options
  - XSS Protection
  - Strict Transport Security

### Input Validation
- **Express-validator** for request validation
- **RPN expression validation** before evaluation
- **JSON parsing** error handling
- **SQL injection** prevention (no database queries)

## 🌐 Frontend

The application includes a responsive web frontend with:

- **User-friendly authentication** forms
- **Real-time calculator** interface
- **Step-by-step calculation** display
- **Error handling** and user feedback
- **Mobile-responsive** design

## 🚀 Deployment

### Production Configuration

1. Set environment variables:
```bash
NODE_ENV=production
JWT_SECRET=<secure-random-secret-key>
PORT=3000
```

2. Use a process manager:
```bash
# Using PM2
npm install -g pm2
pm2 start server.js --name rpn-calculator

# Using systemd
sudo systemctl start rpn-calculator
```

3. Use a reverse proxy (nginx/Apache)
4. Enable HTTPS with SSL certificates
5. Configure proper logging and monitoring

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔧 Development

### File Structure

```
├── server.js              # Main Express server
├── auth.js                # Authentication middleware
├── calculator.js          # RPN calculator service
├── public/
│   └── index.html         # Frontend interface
├── tests/
│   ├── auth.test.js       # Authentication tests
│   ├── calculator.test.js # Calculator tests
│   ├── security.test.js   # Security tests
│   └── setup.js           # Test configuration
├── package.json           # Dependencies and scripts
├── .env.example          # Environment variables template
└── README.md             # This file
```

### Adding New Features

1. **New Operators**: Add to `calculator.js` validation and evaluation
2. **New Endpoints**: Add to `server.js` with proper validation
3. **New Tests**: Add to appropriate test files
4. **Frontend Updates**: Modify `public/index.html`

## 🐛 Troubleshooting

### Common Issues

1. **Port already in use**: Change PORT in .env file
2. **JWT errors**: Verify JWT_SECRET is set correctly
3. **Rate limiting**: Adjust limits in .env for development
4. **CORS errors**: Configure CORS_ORIGIN properly

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm start
```

## 📝 License

MIT License - see LICENSE file for details.

## 👥 Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## 🔗 API Examples with curl

### Register a new user
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "password": "TestPass123!"
  }'
```

### Calculate RPN expression
```bash
curl -X POST http://localhost:3000/api/calculator/calculate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "expression": "3 4 + 5 *",
    "verbose": true
  }'
```