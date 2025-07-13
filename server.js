const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Task monitoring system
const activeTasks = new Map();
const taskHistory = [];
const MAX_HISTORY_SIZE = 100;

// Task status constants
const TASK_STATUS = {
  CREATED: 'created',
  RUNNING: 'running', 
  COMPLETED: 'completed',
  FAILED: 'failed',
  TIMEOUT: 'timeout'
};

// Helper function to generate unique task ID
function generateTaskId() {
  return crypto.randomBytes(8).toString('hex');
}

// Helper function to log task event
function logTaskEvent(taskId, event, data = {}) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Task ${taskId}: ${event}`, data);
}

// Helper function to update task status
function updateTaskStatus(taskId, status, data = {}) {
  if (activeTasks.has(taskId)) {
    const task = activeTasks.get(taskId);
    task.status = status;
    task.lastUpdate = Date.now();
    if (data.result) task.result = data.result;
    if (data.error) task.error = data.error;
    if (data.pid) task.pid = data.pid;
    
    logTaskEvent(taskId, `Status changed to ${status}`, data);
    
    // Move completed/failed tasks to history
    if (status === TASK_STATUS.COMPLETED || status === TASK_STATUS.FAILED || status === TASK_STATUS.TIMEOUT) {
      task.endTime = Date.now();
      task.duration = task.endTime - task.startTime;
      
      // Add to history and remove from active tasks
      taskHistory.unshift(task);
      if (taskHistory.length > MAX_HISTORY_SIZE) {
        taskHistory.pop();
      }
      activeTasks.delete(taskId);
    }
  }
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

// Only use auth if properly configured
const useAuth = config.clientID && config.issuerBaseURL;

if (useAuth) {
  // Auth router attaches /login, /logout, and /callback routes to the baseURL
  app.use(auth(config));
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Check if user is authenticated
app.get('/', (req, res) => {
  if (useAuth && req.oidc && req.oidc.isAuthenticated()) {
    res.redirect('/calculator');
  } else if (!useAuth) {
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

// API endpoint for task monitoring
app.get('/api/tasks', useAuth ? requiresAuth() : (req, res, next) => next(), (req, res) => {
  const currentTime = Date.now();
  
  // Convert active tasks to array with additional info
  const activeTasksList = Array.from(activeTasks.values()).map(task => ({
    ...task,
    runningTime: currentTime - task.startTime
  }));
  
  res.json({
    active: activeTasksList,
    history: taskHistory.slice(0, 20), // Last 20 completed tasks
    stats: {
      totalActive: activeTasks.size,
      totalHistory: taskHistory.length,
      avgDuration: taskHistory.length > 0 ? 
        taskHistory.reduce((sum, task) => sum + (task.duration || 0), 0) / taskHistory.length : 0
    }
  });
});

// Enhanced calculator route with task monitoring info
app.get('/calculator', useAuth ? requiresAuth() : (req, res, next) => next(), (req, res) => {
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
          <span>Bem-vindo, ${useAuth && req.oidc ? (req.oidc.user.name || req.oidc.user.email) : 'Usuário de Teste'}!</span>
          ${useAuth ? '<a href="/logout" class="logout-btn">Logout</a>' : '<span style="color: #ffc107;">Modo de Teste</span>'}
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
        
        <div class="monitoring-container" style="margin-top: 30px; background: rgba(255,255,255,0.1); padding: 20px; border-radius: 10px;">
          <h3>🔍 Monitoramento de Tasks</h3>
          <div style="display: flex; gap: 15px; margin-bottom: 15px;">
            <button onclick="refreshTasks()" style="background: #17a2b8; padding: 8px 16px; font-size: 14px;">Atualizar Status</button>
            <button onclick="toggleMonitoring()" id="monitoringToggle" style="background: #6c757d; padding: 8px 16px; font-size: 14px;">Mostrar Detalhes</button>
          </div>
          <div id="taskStats" style="margin-bottom: 15px; font-family: monospace; font-size: 14px;"></div>
          <div id="taskDetails" style="display: none; max-height: 300px; overflow-y: auto; background: rgba(0,0,0,0.2); padding: 15px; border-radius: 5px; font-family: monospace; font-size: 12px;"></div>
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
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Resultado:</span>\\n\${data.output}\\n<small style="opacity: 0.7;">Task ID: \${data.taskId || 'N/A'}</small>\`;
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro:</span>\\n\${data.error}\\n<small style="opacity: 0.7;">Task ID: \${data.taskId || 'N/A'}</small>\`;
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
        let monitoringVisible = false;
        let monitoringInterval = null;
        
        function refreshTasks() {
          fetch('/api/tasks')
            .then(response => response.json())
            .then(data => {
              updateTaskStats(data);
              if (monitoringVisible) {
                updateTaskDetails(data);
              }
            })
            .catch(error => {
              console.error('Error fetching tasks:', error);
            });
        }
        
        function updateTaskStats(data) {
          const statsDiv = document.getElementById('taskStats');
          statsDiv.innerHTML = \`
            📊 Tasks Ativas: \${data.active.length} | 
            📈 Histórico: \${data.stats.totalHistory} | 
            ⏱️ Tempo Médio: \${data.stats.avgDuration.toFixed(0)}ms
          \`;
        }
        
        function updateTaskDetails(data) {
          const detailsDiv = document.getElementById('taskDetails');
          let html = '<strong>🔄 TASKS ATIVAS:</strong>\\n';
          
          if (data.active.length === 0) {
            html += 'Nenhuma task ativa\\n';
          } else {
            data.active.forEach(task => {
              html += \`[\${task.id}] \${task.expression} - \${task.status} (\${task.runningTime}ms)\\n\`;
              if (task.pid) html += \`  PID: \${task.pid}\\n\`;
            });
          }
          
          html += '\\n<strong>📋 HISTÓRICO RECENTE:</strong>\\n';
          data.history.slice(0, 5).forEach(task => {
            const statusIcon = task.status === 'completed' ? '✅' : 
                             task.status === 'failed' ? '❌' : 
                             task.status === 'timeout' ? '⏰' : '❓';
            html += \`\${statusIcon} [\${task.id}] \${task.expression} - \${task.duration}ms\\n\`;
          });
          
          detailsDiv.innerHTML = html;
        }
        
        function toggleMonitoring() {
          const detailsDiv = document.getElementById('taskDetails');
          const toggleBtn = document.getElementById('monitoringToggle');
          
          monitoringVisible = !monitoringVisible;
          
          if (monitoringVisible) {
            detailsDiv.style.display = 'block';
            toggleBtn.textContent = 'Ocultar Detalhes';
            toggleBtn.style.background = '#28a745';
            
            // Start auto-refresh every 2 seconds
            monitoringInterval = setInterval(refreshTasks, 2000);
            refreshTasks(); // Initial load
          } else {
            detailsDiv.style.display = 'none';
            toggleBtn.textContent = 'Mostrar Detalhes';
            toggleBtn.style.background = '#6c757d';
            
            // Stop auto-refresh
            if (monitoringInterval) {
              clearInterval(monitoringInterval);
              monitoringInterval = null;
            }
          }
        }
        
        // Initialize with basic stats
        refreshTasks();
      </script>
    </body>
    </html>
  `);
});

// API endpoint to execute RPN calculator
app.post('/api/calculate', useAuth ? requiresAuth() : (req, res, next) => next(), (req, res) => {
  const { expression, verbose } = req.body;
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }

  // Create unique task ID and track the task
  const taskId = generateTaskId();
  const task = {
    id: taskId,
    expression: expression,
    verbose: verbose || false,
    status: TASK_STATUS.CREATED,
    startTime: Date.now(),
    user: (useAuth && req.oidc && req.oidc.user) ? (req.oidc.user.email || req.oidc.user.name || 'unknown') : 'test-user'
  };
  
  activeTasks.set(taskId, task);
  logTaskEvent(taskId, 'Task created', { expression, verbose, user: task.user });
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n\n4\n' : '1\n' + expression + '\n\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  // Update task status to running
  updateTaskStatus(taskId, TASK_STATUS.RUNNING);
  
  // Execute the C program
  const child = exec(calculatorPath, { timeout: 10000 }, (error, stdout, stderr) => {
    if (error) {
      const errorMsg = error.code === 'ETIMEDOUT' ? 'Timeout na execução do cálculo' : 'Erro na execução do cálculo';
      const status = error.code === 'ETIMEDOUT' ? TASK_STATUS.TIMEOUT : TASK_STATUS.FAILED;
      
      logTaskEvent(taskId, 'Execution error', { error: error.message, code: error.code });
      updateTaskStatus(taskId, status, { error: errorMsg });
      return res.json({ success: false, error: errorMsg, taskId });
    }
    
    if (stderr) {
      logTaskEvent(taskId, 'Stderr output', { stderr });
      updateTaskStatus(taskId, TASK_STATUS.FAILED, { error: stderr });
      return res.json({ success: false, error: stderr, taskId });
    }
    
    // Parse the output to extract the result
    const output = stdout.toString();
    
    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      const errorMsg = errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo';
      
      logTaskEvent(taskId, 'Calculation error in output', { errorMsg });
      updateTaskStatus(taskId, TASK_STATUS.FAILED, { error: errorMsg });
      return res.json({ 
        success: false, 
        error: errorMsg,
        taskId
      });
    }
    
    logTaskEvent(taskId, 'Calculation completed successfully');
    updateTaskStatus(taskId, TASK_STATUS.COMPLETED, { result: output });
    res.json({ success: true, output: output, taskId });
  });
  
  // Track the process PID
  if (child.pid) {
    updateTaskStatus(taskId, TASK_STATUS.RUNNING, { pid: child.pid });
  }
  
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