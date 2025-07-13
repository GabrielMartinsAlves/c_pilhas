const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || 'a-long-random-secret',
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID || 'test-client-id',
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL || 'https://test-domain.auth0.com',
};

// Auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Registration form route
app.get('/register', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RPN Calculator - Cadastro</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          max-width: 600px; 
          margin: 0 auto; 
          padding: 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }
        .container {
          background: rgba(255,255,255,0.1);
          padding: 40px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        h1 { 
          margin-bottom: 30px; 
          font-size: 2.5em;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          text-align: center;
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
        }
        .required {
          color: #ff6b6b;
        }
        input[type="text"], input[type="email"], input[type="password"] {
          width: 100%;
          padding: 12px;
          border: 2px solid transparent;
          border-radius: 8px;
          font-size: 16px;
          background: rgba(255,255,255,0.9);
          color: #333;
          box-sizing: border-box;
          transition: border-color 0.3s;
        }
        input:focus {
          outline: none;
          border-color: #007bff;
        }
        input.error {
          border-color: #dc3545;
          background: rgba(255,255,255,0.95);
        }
        input.valid {
          border-color: #28a745;
        }
        .error-message {
          color: #ff6b6b;
          font-size: 14px;
          margin-top: 5px;
          display: none;
        }
        .error-message.show {
          display: block;
        }
        .submit-btn {
          background: #28a745;
          color: white;
          padding: 15px 30px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 1.1em;
          width: 100%;
          transition: background 0.3s;
          margin-top: 20px;
        }
        .submit-btn:hover:not(:disabled) {
          background: #218838;
        }
        .submit-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        .login-link {
          text-align: center;
          margin-top: 20px;
        }
        .login-link a {
          color: #87ceeb;
          text-decoration: none;
        }
        .login-link a:hover {
          text-decoration: underline;
        }
        .success-message {
          background: rgba(40, 167, 69, 0.2);
          border: 1px solid #28a745;
          color: #28a745;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: none;
        }
        .success-message.show {
          display: block;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>📝 Cadastro</h1>
        
        <div id="successMessage" class="success-message">
          ✅ Cadastro realizado com sucesso!
        </div>
        
        <form id="registerForm" novalidate>
          <div class="form-group">
            <label for="name">Nome Completo <span class="required">*</span></label>
            <input type="text" id="name" name="name" required>
            <div class="error-message" id="nameError">Nome é obrigatório</div>
          </div>
          
          <div class="form-group">
            <label for="email">E-mail <span class="required">*</span></label>
            <input type="email" id="email" name="email" required>
            <div class="error-message" id="emailError">Digite um e-mail válido</div>
          </div>
          
          <div class="form-group">
            <label for="password">Senha <span class="required">*</span></label>
            <input type="password" id="password" name="password" required minlength="8">
            <div class="error-message" id="passwordError">Senha deve ter no mínimo 8 caracteres</div>
          </div>
          
          <div class="form-group">
            <label for="confirmPassword">Confirmar Senha <span class="required">*</span></label>
            <input type="password" id="confirmPassword" name="confirmPassword" required>
            <div class="error-message" id="confirmPasswordError">Senhas não coincidem</div>
          </div>
          
          <button type="submit" class="submit-btn" id="submitBtn">Cadastrar</button>
        </form>
        
        <div class="login-link">
          <p>Já tem uma conta? <a href="/login">Fazer Login</a></p>
        </div>
      </div>
      
      <script>
        class FormValidator {
          constructor() {
            this.form = document.getElementById('registerForm');
            this.initializeValidation();
          }
          
          initializeValidation() {
            // Add real-time validation to all inputs
            const inputs = this.form.querySelectorAll('input');
            inputs.forEach(input => {
              input.addEventListener('blur', () => this.validateField(input));
              input.addEventListener('input', () => this.clearErrors(input));
            });
            
            // Handle form submission
            this.form.addEventListener('submit', (e) => this.handleSubmit(e));
          }
          
          validateField(input) {
            const value = input.value.trim();
            const fieldName = input.name;
            let isValid = true;
            let errorMessage = '';
            
            // Required field validation
            if (input.hasAttribute('required') && !value) {
              isValid = false;
              errorMessage = this.getRequiredMessage(fieldName);
            }
            // Email validation
            else if (fieldName === 'email' && value) {
              const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
              if (!emailRegex.test(value)) {
                isValid = false;
                errorMessage = 'Digite um e-mail válido';
              }
            }
            // Password validation
            else if (fieldName === 'password' && value) {
              if (value.length < 8) {
                isValid = false;
                errorMessage = 'Senha deve ter no mínimo 8 caracteres';
              }
            }
            // Confirm password validation
            else if (fieldName === 'confirmPassword' && value) {
              const password = document.getElementById('password').value;
              if (value !== password) {
                isValid = false;
                errorMessage = 'Senhas não coincidem';
              }
            }
            
            this.showFieldValidation(input, isValid, errorMessage);
            return isValid;
          }
          
          getRequiredMessage(fieldName) {
            const messages = {
              'name': 'Nome é obrigatório',
              'email': 'E-mail é obrigatório',
              'password': 'Senha é obrigatória',
              'confirmPassword': 'Confirmação de senha é obrigatória'
            };
            return messages[fieldName] || 'Campo obrigatório';
          }
          
          showFieldValidation(input, isValid, errorMessage) {
            const errorElement = document.getElementById(input.name + 'Error');
            
            if (isValid) {
              input.classList.remove('error');
              input.classList.add('valid');
              errorElement.classList.remove('show');
            } else {
              input.classList.add('error');
              input.classList.remove('valid');
              errorElement.textContent = errorMessage;
              errorElement.classList.add('show');
            }
          }
          
          clearErrors(input) {
            input.classList.remove('error');
            const errorElement = document.getElementById(input.name + 'Error');
            if (errorElement) {
              errorElement.classList.remove('show');
            }
          }
          
          validateForm() {
            const inputs = this.form.querySelectorAll('input[required]');
            let isFormValid = true;
            
            inputs.forEach(input => {
              const isFieldValid = this.validateField(input);
              if (!isFieldValid) {
                isFormValid = false;
              }
            });
            
            return isFormValid;
          }
          
          async handleSubmit(e) {
            e.preventDefault();
            
            if (!this.validateForm()) {
              return;
            }
            
            const submitBtn = document.getElementById('submitBtn');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Cadastrando...';
            
            try {
              const formData = new FormData(this.form);
              const data = Object.fromEntries(formData.entries());
              
              const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
              });
              
              const result = await response.json();
              
              if (result.success) {
                document.getElementById('successMessage').classList.add('show');
                this.form.reset();
                // Remove validation classes
                this.form.querySelectorAll('input').forEach(input => {
                  input.classList.remove('valid', 'error');
                });
                setTimeout(() => {
                  window.location.href = '/login';
                }, 2000);
              } else {
                // Show server-side validation errors
                if (result.errors) {
                  Object.keys(result.errors).forEach(field => {
                    const input = document.getElementById(field);
                    if (input) {
                      this.showFieldValidation(input, false, result.errors[field]);
                    }
                  });
                } else {
                  alert('Erro no cadastro: ' + result.message);
                }
              }
            } catch (error) {
              alert('Erro de conexão: ' + error.message);
            } finally {
              submitBtn.disabled = false;
              submitBtn.textContent = originalText;
            }
          }
        }
        
        // Initialize form validation when DOM is loaded
        document.addEventListener('DOMContentLoaded', () => {
          new FormValidator();
        });
      </script>
    </body>
    </html>
  `);
});

// Check if user is authenticated
app.get('/', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.redirect('/calculator');
  } else {
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>RPN Calculator - Login Required</title>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            max-width: 800px; 
            margin: 0 auto; 
            padding: 20px; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
          }
          .container {
            background: rgba(255,255,255,0.1);
            padding: 40px;
            border-radius: 15px;
            text-align: center;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
          }
          h1 { 
            margin-bottom: 30px; 
            font-size: 2.5em;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
          }
          .login-btn {
            background: #28a745;
            color: white;
            padding: 15px 30px;
            text-decoration: none;
            border-radius: 8px;
            font-size: 1.2em;
            transition: background 0.3s;
            display: inline-block;
            margin-top: 20px;
          }
          .login-btn:hover {
            background: #218838;
            text-decoration: none;
            color: white;
          }
          .description {
            margin: 20px 0;
            font-size: 1.1em;
            line-height: 1.6;
          }
          .features {
            text-align: left;
            margin: 30px 0;
            background: rgba(255,255,255,0.1);
            padding: 20px;
            border-radius: 10px;
          }
          .features ul {
            list-style-type: none;
            padding: 0;
          }
          .features li {
            margin: 10px 0;
            padding-left: 20px;
            position: relative;
          }
          .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: #28a745;
            font-weight: bold;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>🧮 RPN Calculator</h1>
          <div class="description">
            Calculadora de Notação Polonesa Reversa com autenticação segura
          </div>
          
          <div class="features">
            <h3>Recursos disponíveis:</h3>
            <ul>
              <li>Avaliação de expressões RPN</li>
              <li>Operações matemáticas básicas (+, -, *, /, ^)</li>
              <li>Modo verbose para análise passo-a-passo</li>
              <li>Interface web intuitiva</li>
              <li>Autenticação segura com Auth0</li>
            </ul>
          </div>
          
          <p>Para acessar a calculadora, você precisa fazer login:</p>
          <div style="display: flex; gap: 15px; justify-content: center; flex-wrap: wrap;">
            <a href="/login" class="login-btn">🔐 Fazer Login</a>
            <a href="/register" class="login-btn" style="background: #17a2b8;">📝 Cadastrar</a>
          </div>
        </div>
      </body>
      </html>
    `);
  }
});

// Protected calculator route
app.get('/calculator', requiresAuth(), (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RPN Calculator</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          max-width: 1000px; 
          margin: 0 auto; 
          padding: 20px; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
        }
        .user-info {
          display: flex;
          align-items: center;
          gap: 15px;
        }
        .logout-btn {
          background: #dc3545;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
        }
        .logout-btn:hover {
          background: #c82333;
          text-decoration: none;
          color: white;
        }
        .calculator-container {
          background: rgba(255,255,255,0.1);
          padding: 30px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .form-group {
          margin-bottom: 20px;
        }
        label {
          display: block;
          margin-bottom: 8px;
          font-weight: bold;
        }
        input[type="text"] {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          background: rgba(255,255,255,0.9);
          color: #333;
        }
        .btn-group {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }
        button {
          background: #007bff;
          color: white;
          padding: 12px 25px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.3s;
          flex: 1;
        }
        button:hover {
          background: #0056b3;
        }
        .verbose-btn {
          background: #17a2b8;
        }
        .verbose-btn:hover {
          background: #138496;
        }
        .clear-btn {
          background: #6c757d;
        }
        .clear-btn:hover {
          background: #545b62;
        }
        #result {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
          min-height: 100px;
          white-space: pre-wrap;
          font-family: 'Courier New', monospace;
          border-left: 4px solid #28a745;
        }
        .examples {
          margin-top: 30px;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
        }
        .example {
          margin: 10px 0;
          padding: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 5px;
          cursor: pointer;
          transition: background 0.3s;
        }
        .example:hover {
          background: rgba(255,255,255,0.2);
        }
        .loading {
          display: none;
          color: #ffc107;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧮 RPN Calculator</h1>
        <div class="user-info">
          <span>Bem-vindo, ${req.oidc.user.name || req.oidc.user.email}!</span>
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </div>
      
      <div class="calculator-container">
        <div class="form-group">
          <label for="expression">Expressão RPN:</label>
          <input 
            type="text" 
            id="expression" 
            placeholder="Ex: 3 4 + 5 *" 
            autocomplete="off"
          >
        </div>
        
        <div class="btn-group">
          <button onclick="calculate(false)">Calcular</button>
          <button onclick="calculate(true)" class="verbose-btn">Calcular (Verbose)</button>
          <button onclick="clearAll()" class="clear-btn">Limpar</button>
        </div>
        
        <div class="loading" id="loading">🔄 Calculando...</div>
        <div id="result"></div>
        
        <div class="examples">
          <h3>Exemplos (clique para usar):</h3>
          <div class="example" onclick="useExample('3 4 +')">
            <strong>3 4 +</strong> → Soma simples (7)
          </div>
          <div class="example" onclick="useExample('5 1 2 + 4 * + 3 -')">
            <strong>5 1 2 + 4 * + 3 -</strong> → Expressão complexa (14)
          </div>
          <div class="example" onclick="useExample('2 3 ^')">
            <strong>2 3 ^</strong> → Exponenciação (8)
          </div>
          <div class="example" onclick="useExample('15 7 1 1 + - / 3 * 2 1 1 + + -')">
            <strong>15 7 1 1 + - / 3 * 2 1 1 + + -</strong> → Exemplo avançado (5)
          </div>
        </div>
      </div>
      
      <script>
        function useExample(expression) {
          document.getElementById('expression').value = expression;
        }
        
        function clearAll() {
          document.getElementById('expression').value = '';
          document.getElementById('result').innerHTML = '';
        }
        
        async function calculate(verbose) {
          const expression = document.getElementById('expression').value.trim();
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          
          if (!expression) {
            resultDiv.innerHTML = '<span style="color: #dc3545;">❌ Por favor, digite uma expressão!</span>';
            return;
          }
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          
          try {
            const response = await fetch('/api/calculate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ expression, verbose })
            });
            
            const data = await response.json();
            loadingDiv.style.display = 'none';
            
            if (data.success) {
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Resultado:</span>\\n\${data.output}\`;
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro:</span>\\n\${data.error}\`;
            }
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro de conexão:</span>\\n\${error.message}\`;
          }
        }
        
        // Allow Enter key to calculate
        document.getElementById('expression').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            calculate(false);
          }
        });
      </script>
    </body>
    </html>
  `);
});

// API endpoint for user registration
app.post('/api/register', (req, res) => {
  const { name, email, password, confirmPassword } = req.body;
  
  // Server-side validation
  const errors = {};
  
  // Required fields validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.name = 'Nome é obrigatório';
  }
  
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.email = 'E-mail é obrigatório';
  } else {
    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.email = 'Digite um e-mail válido';
    }
  }
  
  if (!password || typeof password !== 'string') {
    errors.password = 'Senha é obrigatória';
  } else {
    // Password length validation
    if (password.length < 8) {
      errors.password = 'Senha deve ter no mínimo 8 caracteres';
    }
  }
  
  if (!confirmPassword || typeof confirmPassword !== 'string') {
    errors.confirmPassword = 'Confirmação de senha é obrigatória';
  } else if (password !== confirmPassword) {
    errors.confirmPassword = 'Senhas não coincidem';
  }
  
  // If there are validation errors, return them
  if (Object.keys(errors).length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Dados inválidos',
      errors: errors
    });
  }
  
  // Here you would typically save the user to a database
  // For this demo, we'll just simulate a successful registration
  console.log('New user registration:', {
    name: name.trim(),
    email: email.trim().toLowerCase(),
    // Never log passwords in production
    registrationTime: new Date().toISOString()
  });
  
  // Simulate processing time
  setTimeout(() => {
    res.json({
      success: true,
      message: 'Cadastro realizado com sucesso',
      data: {
        name: name.trim(),
        email: email.trim().toLowerCase()
      }
    });
  }, 500);
});

// API endpoint to execute RPN calculator
app.post('/api/calculate', requiresAuth(), (req, res) => {
  const { expression, verbose } = req.body;
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n4\n' : '1\n' + expression + '\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  // Execute the C program
  const child = exec(calculatorPath, { timeout: 10000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Execution error:', error);
      return res.json({ success: false, error: 'Erro na execução do cálculo' });
    }
    
    if (stderr) {
      console.error('Stderr:', stderr);
      return res.json({ success: false, error: stderr });
    }
    
    // Parse the output to extract the result
    const output = stdout.toString();
    
    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      return res.json({ 
        success: false, 
        error: errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo' 
      });
    }
    
    res.json({ success: true, output: output });
  });
  
  // Send input to the C program
  child.stdin.write(inputData);
  child.stdin.end();
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Erro interno do servidor');
});

// Start server
app.listen(port, () => {
  console.log(`🚀 RPN Calculator server running at http://localhost:${port}`);
  console.log('📝 Auth0 configuration:');
  console.log(`   - Base URL: ${config.baseURL}`);
  console.log(`   - Client ID: ${config.clientID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   - Issuer: ${config.issuerBaseURL ? '✅ Configured' : '❌ Missing'}`);
  
  if (!config.clientID || !config.issuerBaseURL) {
    console.log('⚠️  Please configure Auth0 credentials in .env file');
  }
});

module.exports = app;