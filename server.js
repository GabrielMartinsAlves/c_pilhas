const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Task monitoring system
let taskStats = {
  totalCalculations: 0,
  successfulCalculations: 0,
  failedCalculations: 0,
  startTime: new Date(),
  lastCalculation: null
};

// Auth0 configuration - conditional setup
const hasAuth0Config = process.env.AUTH0_CLIENT_ID && process.env.AUTH0_ISSUER_BASE_URL;
let authMiddleware = null;

if (hasAuth0Config) {
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
  authMiddleware = requiresAuth();
} else {
  console.log('⚠️  Running in development mode without Auth0 authentication');
  // Mock authentication middleware for development - apply to all routes
  app.use((req, res, next) => {
    req.oidc = {
      isAuthenticated: () => true,
      user: { name: 'Development User', email: 'dev@localhost' }
    };
    next();
  });
  // Mock authentication middleware for development
  authMiddleware = (req, res, next) => {
    next();
  };
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Check if user is authenticated
app.get('/', (req, res) => {
  if (req.oidc.isAuthenticated()) {
    res.redirect('/calculator');
  } else if (!hasAuth0Config) {
    // In development mode without Auth0, redirect directly to calculator
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
app.get('/calculator', authMiddleware, (req, res) => {
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
        .monitoring {
          margin-top: 30px;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
        }
        .monitoring-item {
          display: flex;
          justify-content: space-between;
          margin: 10px 0;
          padding: 8px;
          background: rgba(255,255,255,0.05);
          border-radius: 5px;
        }
        .monitoring-label {
          font-weight: bold;
        }
        .monitoring-value {
          color: #28a745;
        }
        .monitoring-refresh-btn {
          background: #17a2b8;
          margin-top: 15px;
          padding: 8px 15px;
          font-size: 14px;
        }
        .monitoring-refresh-btn:hover {
          background: #138496;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧮 RPN Calculator</h1>
        <div class="user-info">
          <span>Bem-vindo, ${req.oidc.user.name || req.oidc.user.email}!</span>
          ${hasAuth0Config ? '<a href="/logout" class="logout-btn">Logout</a>' : '<span style="color: #ffc107;">Modo Dev</span>'}
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
        
        <div class="monitoring">
          <h3>📊 Monitoramento de Tasks:</h3>
          <div id="monitoring-data">
            <div class="monitoring-item">
              <span class="monitoring-label">Status do Servidor:</span>
              <span class="monitoring-value" id="server-status">Carregando...</span>
            </div>
          </div>
          <button onclick="updateMonitoring()" class="monitoring-refresh-btn">🔄 Atualizar</button>
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
        
        // Task monitoring functions
        async function updateMonitoring() {
          try {
            const response = await fetch('/api/monitoring');
            const data = await response.json();
            
            if (data.status) {
              const monitoringData = document.getElementById('monitoring-data');
              monitoringData.innerHTML = \`
                <div class="monitoring-item">
                  <span class="monitoring-label">Status do Servidor:</span>
                  <span class="monitoring-value">\${data.status.toUpperCase()}</span>
                </div>
                <div class="monitoring-item">
                  <span class="monitoring-label">Tempo Online:</span>
                  <span class="monitoring-value">\${data.uptime}</span>
                </div>
                <div class="monitoring-item">
                  <span class="monitoring-label">Total de Cálculos:</span>
                  <span class="monitoring-value">\${data.taskStats.totalCalculations}</span>
                </div>
                <div class="monitoring-item">
                  <span class="monitoring-label">Sucessos:</span>
                  <span class="monitoring-value">\${data.taskStats.successfulCalculations}</span>
                </div>
                <div class="monitoring-item">
                  <span class="monitoring-label">Falhas:</span>
                  <span class="monitoring-value">\${data.taskStats.failedCalculations}</span>
                </div>
                <div class="monitoring-item">
                  <span class="monitoring-label">Taxa de Sucesso:</span>
                  <span class="monitoring-value">\${data.taskStats.successRate}</span>
                </div>
                <div class="monitoring-item">
                  <span class="monitoring-label">Último Cálculo:</span>
                  <span class="monitoring-value">\${data.taskStats.lastCalculation ? new Date(data.taskStats.lastCalculation).toLocaleString('pt-BR') : 'Nenhum'}</span>
                </div>
              \`;
            }
          } catch (error) {
            document.getElementById('monitoring-data').innerHTML = 
              '<div style="color: #dc3545;">❌ Erro ao carregar dados de monitoramento</div>';
          }
        }
        
        // Load monitoring data on page load
        document.addEventListener('DOMContentLoaded', function() {
          updateMonitoring();
          // Auto-refresh monitoring every 30 seconds
          setInterval(updateMonitoring, 30000);
        });
      </script>
    </body>
    </html>
  `);
});

// API endpoint to execute RPN calculator
app.post('/api/calculate', authMiddleware, (req, res) => {
  const { expression, verbose } = req.body;
  
  if (!expression || typeof expression !== 'string') {
    taskStats.totalCalculations++;
    taskStats.failedCalculations++;
    return res.json({ success: false, error: 'Expressão inválida' });
  }
  
  taskStats.totalCalculations++;
  taskStats.lastCalculation = new Date();
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n\n4\n' : '1\n' + expression + '\n\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  // Execute the C program with proper stdin handling
  const child = exec(calculatorPath, { timeout: 3000 }, (error, stdout, stderr) => {
    if (error) {
      // If killed by timeout, try to extract result from partial output
      if (error.killed && error.signal === 'SIGTERM' && stdout) {
        const output = stdout.toString();
        const resultMatch = output.match(/Resultado:\s*([\d.-]+)/);
        if (resultMatch) {
          taskStats.successfulCalculations++;
          return res.json({ success: true, output: `Resultado: ${resultMatch[1]}` });
        }
      }
      console.error('Execution error:', error);
      taskStats.failedCalculations++;
      return res.json({ success: false, error: 'Erro na execução do cálculo' });
    }
    
    if (stderr) {
      console.error('Stderr:', stderr);
      taskStats.failedCalculations++;
      return res.json({ success: false, error: stderr });
    }
    
    // Parse the output to extract the result
    const output = stdout.toString();
    
    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      taskStats.failedCalculations++;
      return res.json({ 
        success: false, 
        error: errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo' 
      });
    }
    
    taskStats.successfulCalculations++;
    res.json({ success: true, output: output });
  });
  
  // Send input to the C program immediately and close stdin
  if (child.stdin) {
    child.stdin.write(inputData);
    child.stdin.end();
  }
});

// Task monitoring endpoint
app.get('/api/monitoring', authMiddleware, (req, res) => {
  const uptime = Math.floor((new Date() - taskStats.startTime) / 1000);
  const successRate = taskStats.totalCalculations > 0 
    ? (taskStats.successfulCalculations / taskStats.totalCalculations * 100).toFixed(2)
    : 0;
  
  res.json({
    status: 'running',
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`,
    taskStats: {
      ...taskStats,
      successRate: `${successRate}%`
    }
  });
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
  
  if (hasAuth0Config) {
    console.log(`   - Base URL: ${process.env.AUTH0_BASE_URL || 'http://localhost:3000'}`);
    console.log(`   - Client ID: ✅ Configured`);
    console.log(`   - Issuer: ✅ Configured`);
    console.log('🔐 Authentication: ENABLED');
  } else {
    console.log('   - Auth0: ❌ Not configured (running in development mode)');
    console.log('🔓 Authentication: DISABLED (Development Mode)');
    console.log('⚠️  To enable Auth0 authentication, configure credentials in .env file');
  }
});

module.exports = app;