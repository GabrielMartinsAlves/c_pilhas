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
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
};

// Auth router attaches /login, /logout, and /callback routes to the baseURL
app.use(auth(config));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Check if user is authenticated or in demo mode
app.get('/', (req, res) => {
  const isDemoMode = process.env.NODE_ENV === 'development' && req.query.demo === 'true';
  
  if (req.oidc.isAuthenticated() || isDemoMode) {
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
          <a href="/login" class="login-btn">🔐 Fazer Login</a>
        </div>
      </body>
      </html>
    `);
  }
});

// Protected calculator route
app.get('/calculator', (req, res) => {
  const isDemoMode = process.env.NODE_ENV === 'development' && req.query.demo === 'true';
  
  if (!req.oidc.isAuthenticated() && !isDemoMode) {
    return res.redirect('/');
  }
  
  const user = isDemoMode ? {
    name: 'Demo User',
    email: 'demo@example.com',
    nickname: 'demo'
  } : req.oidc.user;
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
        .profile-btn {
          background: #17a2b8;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
          margin-right: 10px;
        }
        .profile-btn:hover {
          background: #138496;
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
          <span>Bem-vindo, ${user.name || user.email}!</span>
          <a href="/profile?demo=true" class="profile-btn">👤 Perfil</a>
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

// Profile management route
app.get('/profile', (req, res) => {
  const isDemoMode = process.env.NODE_ENV === 'development' && req.query.demo === 'true';
  
  if (!req.oidc.isAuthenticated() && !isDemoMode) {
    return res.redirect('/');
  }
  
  const user = isDemoMode ? {
    name: 'Demo User',
    email: 'demo@example.com',
    nickname: 'demo',
    locale: 'pt-BR'
  } : req.oidc.user;
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RPN Calculator - Perfil do Usuário</title>
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
        .back-btn {
          background: #6c757d;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
          margin-right: 10px;
        }
        .back-btn:hover {
          background: #545b62;
          text-decoration: none;
          color: white;
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
        .profile-container {
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
          color: #fff;
        }
        input[type="text"], input[type="email"] {
          width: 100%;
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          background: rgba(255,255,255,0.9);
          color: #333;
          box-sizing: border-box;
        }
        input:disabled {
          background: rgba(255,255,255,0.5);
          color: #666;
        }
        .btn-group {
          display: flex;
          gap: 15px;
          margin-top: 30px;
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
        button:disabled {
          background: #6c757d;
          cursor: not-allowed;
        }
        .save-btn {
          background: #28a745;
        }
        .save-btn:hover {
          background: #218838;
        }
        .cancel-btn {
          background: #6c757d;
        }
        .cancel-btn:hover {
          background: #545b62;
        }
        .message {
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-weight: bold;
        }
        .message.success {
          background: rgba(40, 167, 69, 0.2);
          border: 1px solid #28a745;
          color: #28a745;
        }
        .message.error {
          background: rgba(220, 53, 69, 0.2);
          border: 1px solid #dc3545;
          color: #dc3545;
        }
        .loading {
          display: none;
          color: #ffc107;
          text-align: center;
          margin: 20px 0;
        }
        .info-section {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          margin-bottom: 30px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>👤 Perfil do Usuário</h1>
        <div class="user-info">
          <a href="/calculator?demo=true" class="back-btn">⬅ Voltar à Calculadora</a>
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </div>
      
      <div class="profile-container">
        <div class="info-section">
          <h3>Informações da Conta</h3>
          <p>Gerencie suas informações pessoais e preferências da conta.</p>
        </div>

        <div id="message"></div>
        <div class="loading" id="loading">🔄 Salvando informações...</div>
        
        <form id="profileForm">
          <div class="form-group">
            <label for="name">Nome Completo:</label>
            <input 
              type="text" 
              id="name" 
              name="name"
              value="${user.name || ''}"
              placeholder="Digite seu nome completo"
              required
            >
          </div>
          
          <div class="form-group">
            <label for="email">Email:</label>
            <input 
              type="email" 
              id="email" 
              name="email"
              value="${user.email || ''}"
              placeholder="Digite seu email"
              disabled
              title="Email é gerenciado pelo Auth0 e não pode ser alterado aqui"
            >
          </div>
          
          <div class="form-group">
            <label for="nickname">Apelido:</label>
            <input 
              type="text" 
              id="nickname" 
              name="nickname"
              value="${user.nickname || ''}"
              placeholder="Digite seu apelido"
            >
          </div>

          <div class="form-group">
            <label for="locale">Idioma Preferido:</label>
            <input 
              type="text" 
              id="locale" 
              name="locale"
              value="${user.locale || 'pt-BR'}"
              placeholder="ex: pt-BR, en-US"
            >
          </div>
          
          <div class="btn-group">
            <button type="submit" class="save-btn" id="saveBtn">💾 Salvar</button>
            <button type="button" class="cancel-btn" id="cancelBtn">❌ Cancelar</button>
          </div>
        </form>
      </div>
      
      <script>
        const form = document.getElementById('profileForm');
        const saveBtn = document.getElementById('saveBtn');
        const cancelBtn = document.getElementById('cancelBtn');
        const messageDiv = document.getElementById('message');
        const loadingDiv = document.getElementById('loading');
        
        // Store original values for cancel functionality
        const originalValues = {
          name: document.getElementById('name').value,
          nickname: document.getElementById('nickname').value,
          locale: document.getElementById('locale').value
        };
        
        function showMessage(text, type) {
          messageDiv.innerHTML = \`<div class="message \${type}">\${text}</div>\`;
          setTimeout(() => {
            messageDiv.innerHTML = '';
          }, 5000);
        }
        
        function setLoading(loading) {
          loadingDiv.style.display = loading ? 'block' : 'none';
          saveBtn.disabled = loading;
          cancelBtn.disabled = loading;
          
          // Disable form inputs during loading
          const inputs = form.querySelectorAll('input:not([disabled])');
          inputs.forEach(input => input.disabled = loading);
        }
        
        // Cancel button functionality
        cancelBtn.addEventListener('click', function(e) {
          e.preventDefault();
          
          // Reset form to original values
          document.getElementById('name').value = originalValues.name;
          document.getElementById('nickname').value = originalValues.nickname;
          document.getElementById('locale').value = originalValues.locale;
          
          showMessage('✅ Alterações canceladas. Dados foram restaurados aos valores originais.', 'success');
        });
        
        // Form submission
        form.addEventListener('submit', async function(e) {
          e.preventDefault();
          
          const formData = new FormData(form);
          const data = Object.fromEntries(formData.entries());
          
          // Basic validation
          if (!data.name.trim()) {
            showMessage('❌ Nome é obrigatório!', 'error');
            return;
          }
          
          setLoading(true);
          
          try {
            const response = await fetch('/api/profile', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(data)
            });
            
            const result = await response.json();
            
            if (result.success) {
              showMessage('✅ Perfil salvo com sucesso!', 'success');
              
              // Update original values for future cancel operations
              originalValues.name = data.name;
              originalValues.nickname = data.nickname;
              originalValues.locale = data.locale;
              
            } else {
              showMessage(\`❌ Erro ao salvar: \${result.error}\`, 'error');
            }
          } catch (error) {
            showMessage(\`❌ Erro de conexão: \${error.message}\`, 'error');
          } finally {
            setLoading(false);
          }
        });
        
        // Enable form inputs after page load
        window.addEventListener('load', function() {
          setLoading(false);
        });
      </script>
    </body>
    </html>
  `);
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

// API endpoint to update user profile
app.post('/api/profile', (req, res) => {
  const isDemoMode = process.env.NODE_ENV === 'development';
  
  if (!req.oidc.isAuthenticated() && !isDemoMode) {
    return res.status(401).json({ success: false, error: 'Não autenticado' });
  }
  const { name, nickname, locale } = req.body;
  
  // Basic validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.json({ success: false, error: 'Nome é obrigatório' });
  }
  
  // Validate locale format if provided
  if (locale && typeof locale === 'string' && locale.trim().length > 0) {
    const localePattern = /^[a-z]{2}(-[A-Z]{2})?$/;
    if (!localePattern.test(locale.trim())) {
      return res.json({ 
        success: false, 
        error: 'Formato de idioma inválido. Use formato como pt-BR ou en-US' 
      });
    }
  }
  
  // In a real application, you would save this to a database
  // For this demo, we'll simulate a successful save
  try {
    // Here you would typically:
    // 1. Validate the user has permission to update this profile
    // 2. Save the data to your database
    // 3. Update the Auth0 user metadata if needed
    
    // Simulate processing time and success response
    res.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso',
      data: {
        name: name.trim(),
        nickname: nickname ? nickname.trim() : '',
        locale: locale ? locale.trim() : 'pt-BR'
      }
    });
    
  } catch (error) {
    console.error('Profile update error:', error);
    res.json({ 
      success: false, 
      error: 'Erro interno. Tente novamente em alguns momentos.' 
    });
  }
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