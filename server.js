const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Worker monitoring state
const workerMonitoring = {
  tasksExecuted: 0,
  tasksSuccessful: 0,
  tasksFailed: 0,
  averageExecutionTime: 0,
  lastTaskTime: null,
  workerStatus: 'idle',
  executionTimes: []
};

// Task monitoring function
function logTask(expression, success, executionTime, error = null) {
  workerMonitoring.tasksExecuted++;
  workerMonitoring.lastTaskTime = new Date().toISOString();
  
  if (success) {
    workerMonitoring.tasksSuccessful++;
    workerMonitoring.executionTimes.push(executionTime);
    
    // Keep only last 50 execution times for average calculation
    if (workerMonitoring.executionTimes.length > 50) {
      workerMonitoring.executionTimes.shift();
    }
    
    // Calculate average execution time
    workerMonitoring.averageExecutionTime = 
      workerMonitoring.executionTimes.reduce((a, b) => a + b, 0) / 
      workerMonitoring.executionTimes.length;
  } else {
    workerMonitoring.tasksFailed++;
  }
  
  // Log to console for monitoring
  const logEntry = {
    timestamp: workerMonitoring.lastTaskTime,
    expression: expression,
    success: success,
    executionTime: executionTime,
    error: error
  };
  
  console.log('Task Log:', JSON.stringify(logEntry));
}

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
          <a href="/login" class="login-btn">🔐 Fazer Login</a>
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
        .test-btn {
          background: #ffc107;
          color: #212529;
        }
        .test-btn:hover {
          background: #e0a800;
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
          <a href="/monitoring" class="logout-btn" style="background: #17a2b8; margin-right: 10px;">📊 Monitor</a>
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
          <button onclick="testWorker()" class="test-btn">🧪 Testar Worker</button>
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
        
        async function testWorker() {
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          
          try {
            const response = await fetch('/api/test-worker', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({})
            });
            
            const data = await response.json();
            loadingDiv.style.display = 'none';
            
            let resultHtml = \`<span style="color: #17a2b8;">🧪 Teste do Worker Concluído</span>\\n\\n\`;
            resultHtml += \`<strong>Resumo:</strong>\\n\`;
            resultHtml += \`✅ Testes aprovados: \${data.passed}/\${data.totalTests}\\n\`;
            resultHtml += \`❌ Testes falharam: \${data.failed}\\n\`;
            resultHtml += \`⏱️ Tempo médio de execução: \${data.averageExecutionTime.toFixed(2)}ms\\n\\n\`;
            
            resultHtml += \`<strong>Detalhes dos Testes:</strong>\\n\`;
            data.results.forEach((test, index) => {
              const status = test.passed ? '✅' : '❌';
              resultHtml += \`\${index + 1}. \${status} \${test.description}\\n\`;
              resultHtml += \`   Expressão: \${test.expression}\\n\`;
              resultHtml += \`   Esperado: \${test.expected}, Resultado: \${test.actual !== null ? test.actual : 'Erro'}\\n\`;
              resultHtml += \`   Tempo: \${test.executionTime}ms\\n\`;
              if (test.error) {
                resultHtml += \`   Erro: \${test.error}\\n\`;
              }
              resultHtml += \`\\n\`;
            });
            
            resultDiv.innerHTML = resultHtml;
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro no teste:</span>\\n\${error.message}\`;
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

// API endpoint to execute RPN calculator
app.post('/api/calculate', requiresAuth(), (req, res) => {
  const { expression, verbose } = req.body;
  const startTime = Date.now();
  
  workerMonitoring.workerStatus = 'busy';
  
  if (!expression || typeof expression !== 'string') {
    const executionTime = Date.now() - startTime;
    logTask(expression, false, executionTime, 'Invalid expression');
    workerMonitoring.workerStatus = 'idle';
    return res.json({ success: false, error: 'Expressão inválida' });
  }

  const calculatorPath = path.join(__dirname, 'rpn_calculator_cli');
  const args = [expression];
  if (verbose) args.push('--verbose');

  // Execute the C program using the CLI version
  const child = exec(`"${calculatorPath}" "${expression}"${verbose ? ' --verbose' : ''}`, 
    { timeout: 10000 }, (error, stdout, stderr) => {
    const executionTime = Date.now() - startTime;
    workerMonitoring.workerStatus = 'idle';
    
    if (error) {
      console.error('Execution error:', error);
      logTask(expression, false, executionTime, error.message);
      return res.json({ success: false, error: 'Erro na execução do cálculo' });
    }

    if (stderr) {
      console.error('Stderr:', stderr);
      logTask(expression, false, executionTime, stderr);
      return res.json({ success: false, error: stderr });
    }

    // Parse the output to extract the result
    const output = stdout.toString();

    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      const errorMsg = errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo';
      logTask(expression, false, executionTime, errorMsg);
      return res.json({ 
        success: false, 
        error: errorMsg
      });
    }

    logTask(expression, true, executionTime);
    res.json({ success: true, output: output });
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  const calculatorCliPath = path.join(__dirname, 'rpn_calculator_cli');
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    worker: {
      executable: fs.existsSync(calculatorPath),
      executableCli: fs.existsSync(calculatorCliPath),
      status: workerMonitoring.workerStatus
    },
    monitoring: workerMonitoring
  };
  
  if (!healthStatus.worker.executableCli) {
    healthStatus.status = 'unhealthy';
    healthStatus.error = 'Worker CLI executable not found';
  }
  
  res.json(healthStatus);
});

// Worker testing endpoint
app.post('/api/test-worker', requiresAuth(), async (req, res) => {
  const testCases = [
    { expression: '3 4 +', expected: 7, description: 'Simple addition' },
    { expression: '5 1 2 + 4 * + 3 -', expected: 14, description: 'Complex expression' },
    { expression: '2 3 ^', expected: 8, description: 'Exponentiation' },
    { expression: '10 2 /', expected: 5, description: 'Division' },
    { expression: '15 7 1 1 + - / 3 * 2 1 1 + + -', expected: 5, description: 'Advanced expression' }
  ];

  const results = [];
  
  for (const testCase of testCases) {
    const startTime = Date.now();
    
    try {
      const result = await new Promise((resolve, reject) => {
        const calculatorPath = path.join(__dirname, 'rpn_calculator_cli');
        
        const child = exec(`"${calculatorPath}" "${testCase.expression}"`, 
          { timeout: 5000 }, (error, stdout, stderr) => {
          const executionTime = Date.now() - startTime;
          
          if (error) {
            reject({ error: error.message, executionTime });
            return;
          }
          
          if (stderr) {
            reject({ error: stderr, executionTime });
            return;
          }
          
          // Parse result from output
          const output = stdout.toString();
          const resultMatch = output.match(/Resultado:\s*([\d.-]+)/);
          
          if (resultMatch) {
            const actualResult = parseFloat(resultMatch[1]);
            resolve({ result: actualResult, executionTime, output });
          } else {
            reject({ error: 'Could not parse result', executionTime, output });
          }
        });
      });
      
      const passed = Math.abs(result.result - testCase.expected) < 0.000001;
      
      results.push({
        description: testCase.description,
        expression: testCase.expression,
        expected: testCase.expected,
        actual: result.result,
        passed: passed,
        executionTime: result.executionTime
      });
      
      logTask(testCase.expression, passed, result.executionTime, 
              passed ? null : `Expected ${testCase.expected}, got ${result.result}`);
      
    } catch (error) {
      results.push({
        description: testCase.description,
        expression: testCase.expression,
        expected: testCase.expected,
        actual: null,
        passed: false,
        executionTime: error.executionTime || 0,
        error: error.error
      });
      
      logTask(testCase.expression, false, error.executionTime || 0, error.error);
    }
  }
  
  const summary = {
    totalTests: results.length,
    passed: results.filter(r => r.passed).length,
    failed: results.filter(r => !r.passed).length,
    averageExecutionTime: results.reduce((sum, r) => sum + r.executionTime, 0) / results.length,
    results: results
  };
  
  res.json(summary);
});

// Task monitoring endpoint
app.get('/api/monitoring', requiresAuth(), (req, res) => {
  const monitoring = {
    ...workerMonitoring,
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    timestamp: new Date().toISOString()
  };
  
  res.json(monitoring);
});

// Monitoring dashboard page
app.get('/monitoring', requiresAuth(), (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RPN Calculator - Monitoring</title>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1">
      <style>
        body { 
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
          max-width: 1200px; 
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
        .nav-btn {
          background: #007bff;
          color: white;
          padding: 10px 20px;
          text-decoration: none;
          border-radius: 5px;
          transition: background 0.3s;
          margin-right: 10px;
        }
        .nav-btn:hover {
          background: #0056b3;
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
        .dashboard-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 20px;
          margin-bottom: 30px;
        }
        .card {
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .metric {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 10px 0;
          padding: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 8px;
        }
        .metric-value {
          font-size: 1.2em;
          font-weight: bold;
        }
        .status-healthy {
          color: #28a745;
        }
        .status-warning {
          color: #ffc107;
        }
        .status-error {
          color: #dc3545;
        }
        .refresh-btn {
          background: #28a745;
          color: white;
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.3s;
        }
        .refresh-btn:hover {
          background: #218838;
        }
        .auto-refresh {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 20px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>📊 RPN Calculator - Monitoring</h1>
        <div>
          <a href="/calculator" class="nav-btn">🧮 Calculator</a>
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </div>
      
      <div class="auto-refresh">
        <button onclick="refreshData()" class="refresh-btn">🔄 Atualizar</button>
        <label>
          <input type="checkbox" id="autoRefresh" onchange="toggleAutoRefresh()"> 
          Auto-atualizar (5s)
        </label>
        <span id="lastUpdate"></span>
      </div>
      
      <div class="dashboard-grid">
        <div class="card">
          <h3>📈 Estatísticas de Tarefas</h3>
          <div class="metric">
            <span>Total de Tarefas:</span>
            <span class="metric-value" id="totalTasks">-</span>
          </div>
          <div class="metric">
            <span>Tarefas Bem-sucedidas:</span>
            <span class="metric-value status-healthy" id="successTasks">-</span>
          </div>
          <div class="metric">
            <span>Tarefas Falharam:</span>
            <span class="metric-value status-error" id="failedTasks">-</span>
          </div>
          <div class="metric">
            <span>Taxa de Sucesso:</span>
            <span class="metric-value" id="successRate">-</span>
          </div>
        </div>
        
        <div class="card">
          <h3>⚡ Performance</h3>
          <div class="metric">
            <span>Tempo Médio de Execução:</span>
            <span class="metric-value" id="avgExecution">-</span>
          </div>
          <div class="metric">
            <span>Status do Worker:</span>
            <span class="metric-value" id="workerStatus">-</span>
          </div>
          <div class="metric">
            <span>Última Tarefa:</span>
            <span class="metric-value" id="lastTask">-</span>
          </div>
        </div>
        
        <div class="card">
          <h3>🖥️ Sistema</h3>
          <div class="metric">
            <span>Uptime do Servidor:</span>
            <span class="metric-value" id="uptime">-</span>
          </div>
          <div class="metric">
            <span>Uso de Memória:</span>
            <span class="metric-value" id="memoryUsage">-</span>
          </div>
          <div class="metric">
            <span>Worker Executável:</span>
            <span class="metric-value" id="workerExecutable">-</span>
          </div>
        </div>
      </div>
      
      <div class="card">
        <h3>🏥 Health Check</h3>
        <div id="healthStatus">Carregando...</div>
      </div>
      
      <script>
        let autoRefreshInterval = null;
        
        function formatUptime(seconds) {
          const hours = Math.floor(seconds / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = Math.floor(seconds % 60);
          return \`\${hours}h \${minutes}m \${secs}s\`;
        }
        
        function formatBytes(bytes) {
          const sizes = ['Bytes', 'KB', 'MB', 'GB'];
          if (bytes === 0) return '0 Byte';
          const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
          return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
        
        async function refreshData() {
          try {
            // Get monitoring data
            const monitoringResponse = await fetch('/api/monitoring');
            const monitoring = await monitoringResponse.json();
            
            // Get health data
            const healthResponse = await fetch('/api/health');
            const health = await healthResponse.json();
            
            // Update task statistics
            document.getElementById('totalTasks').textContent = monitoring.tasksExecuted;
            document.getElementById('successTasks').textContent = monitoring.tasksSuccessful;
            document.getElementById('failedTasks').textContent = monitoring.tasksFailed;
            
            const successRate = monitoring.tasksExecuted > 0 ? 
              ((monitoring.tasksSuccessful / monitoring.tasksExecuted) * 100).toFixed(1) + '%' : 
              '0%';
            document.getElementById('successRate').textContent = successRate;
            
            // Update performance
            const avgTime = monitoring.averageExecutionTime > 0 ? 
              monitoring.averageExecutionTime.toFixed(2) + 'ms' : 
              'N/A';
            document.getElementById('avgExecution').textContent = avgTime;
            
            const statusElement = document.getElementById('workerStatus');
            statusElement.textContent = monitoring.workerStatus;
            statusElement.className = 'metric-value ' + 
              (monitoring.workerStatus === 'idle' ? 'status-healthy' : 'status-warning');
            
            const lastTaskTime = monitoring.lastTaskTime ? 
              new Date(monitoring.lastTaskTime).toLocaleString() : 
              'Nenhuma';
            document.getElementById('lastTask').textContent = lastTaskTime;
            
            // Update system info
            document.getElementById('uptime').textContent = formatUptime(monitoring.uptime);
            document.getElementById('memoryUsage').textContent = formatBytes(monitoring.memoryUsage.rss);
            
            const executableElement = document.getElementById('workerExecutable');
            executableElement.textContent = health.worker.executable ? 'OK' : 'Não encontrado';
            executableElement.className = 'metric-value ' + 
              (health.worker.executable ? 'status-healthy' : 'status-error');
            
            // Update health status
            const healthElement = document.getElementById('healthStatus');
            const healthClass = health.status === 'healthy' ? 'status-healthy' : 'status-error';
            healthElement.innerHTML = \`
              <div class="metric">
                <span>Status Geral:</span>
                <span class="metric-value \${healthClass}">\${health.status.toUpperCase()}</span>
              </div>
              \${health.error ? \`<div class="metric"><span>Erro:</span><span class="status-error">\${health.error}</span></div>\` : ''}
            \`;
            
            document.getElementById('lastUpdate').textContent = 
              'Última atualização: ' + new Date().toLocaleTimeString();
              
          } catch (error) {
            console.error('Erro ao carregar dados:', error);
            document.getElementById('healthStatus').innerHTML = 
              '<div class="status-error">Erro ao carregar dados de monitoramento</div>';
          }
        }
        
        function toggleAutoRefresh() {
          const checkbox = document.getElementById('autoRefresh');
          if (checkbox.checked) {
            autoRefreshInterval = setInterval(refreshData, 5000);
          } else {
            if (autoRefreshInterval) {
              clearInterval(autoRefreshInterval);
              autoRefreshInterval = null;
            }
          }
        }
        
        // Initial load
        refreshData();
      </script>
    </body>
    </html>
  `);
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