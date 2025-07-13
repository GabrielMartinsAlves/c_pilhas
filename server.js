const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

// Task monitoring system
class TaskMonitor {
  constructor() {
    this.tasks = new Map();
    this.taskCounter = 0;
  }

  createTask(taskType, userId) {
    const taskId = `TASK_${++this.taskCounter}_${Date.now()}`;
    const task = {
      id: taskId,
      type: taskType,
      userId: userId,
      startTime: Date.now(),
      endTime: null,
      status: 'running', // running, completed, failed
      result: null,
      error: null,
      executionTime: null
    };
    
    this.tasks.set(taskId, task);
    return taskId;
  }

  completeTask(taskId, result) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.endTime = Date.now();
      task.status = 'completed';
      task.result = result;
      task.executionTime = task.endTime - task.startTime;
    }
  }

  failTask(taskId, error) {
    const task = this.tasks.get(taskId);
    if (task) {
      task.endTime = Date.now();
      task.status = 'failed';
      task.error = error;
      task.executionTime = task.endTime - task.startTime;
    }
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  getUserTasks(userId) {
    return Array.from(this.tasks.values()).filter(task => task.userId === userId);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getTaskStats() {
    const tasks = this.getAllTasks();
    const stats = {
      total: tasks.length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      running: tasks.filter(t => t.status === 'running').length,
      avgExecutionTime: 0
    };

    const completedTasks = tasks.filter(t => t.status === 'completed' && t.executionTime);
    if (completedTasks.length > 0) {
      stats.avgExecutionTime = completedTasks.reduce((sum, t) => sum + t.executionTime, 0) / completedTasks.length;
    }

    return stats;
  }
}

// Global task monitor instance
const taskMonitor = new TaskMonitor();

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
          background: #6f42c1;
        }
        .test-btn:hover {
          background: #5a2d91;
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
          <a href="/monitor" style="color: white; text-decoration: none; margin-right: 15px;">📊 Monitor</a>
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
          <button onclick="runWorkerTests()" class="test-btn">🔧 Testes</button>
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
        
        async function runWorkerTests() {
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          
          try {
            const response = await fetch('/api/run-worker-tests', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            const data = await response.json();
            loadingDiv.style.display = 'none';
            
            if (data.success) {
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Testes Concluídos:</span>\\n\${data.output}\`;
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro nos Testes:</span>\\n\${data.error}\`;
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

// Task monitoring dashboard route
app.get('/monitor', requiresAuth(), (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Task Monitor - RPN Calculator</title>
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
        .nav-links a {
          color: white;
          text-decoration: none;
          margin-right: 15px;
          padding: 8px 16px;
          border-radius: 5px;
          background: rgba(255,255,255,0.1);
          transition: background 0.3s;
        }
        .nav-links a:hover {
          background: rgba(255,255,255,0.2);
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
        .dashboard-container {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .stats-card, .tasks-card {
          background: rgba(255,255,255,0.1);
          padding: 25px;
          border-radius: 15px;
          backdrop-filter: blur(10px);
          box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .stats-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-top: 15px;
        }
        .stat-item {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 10px;
          text-align: center;
        }
        .stat-number {
          font-size: 2em;
          font-weight: bold;
          display: block;
          margin-bottom: 5px;
        }
        .tasks-list {
          max-height: 400px;
          overflow-y: auto;
          margin-top: 15px;
        }
        .task-item {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 10px;
          margin-bottom: 10px;
          border-left: 4px solid #28a745;
        }
        .task-item.failed {
          border-left-color: #dc3545;
        }
        .task-item.running {
          border-left-color: #ffc107;
        }
        .task-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .task-id {
          font-family: 'Courier New', monospace;
          font-size: 0.9em;
          color: #ccc;
        }
        .task-status {
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 0.8em;
          font-weight: bold;
        }
        .status-completed { background: #28a745; }
        .status-failed { background: #dc3545; }
        .status-running { background: #ffc107; color: #000; }
        .refresh-btn {
          background: #17a2b8;
          color: white;
          padding: 12px 25px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 16px;
          transition: background 0.3s;
          margin-bottom: 20px;
        }
        .refresh-btn:hover {
          background: #138496;
        }
        @media (max-width: 768px) {
          .dashboard-container {
            grid-template-columns: 1fr;
          }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>📊 Task Monitor</h1>
        </div>
        <div class="nav-links">
          <a href="/calculator">🧮 Calculator</a>
        </div>
        <div class="user-info">
          <span>Bem-vindo, ${req.oidc.user.name || req.oidc.user.email}!</span>
          <a href="/logout" class="logout-btn">Logout</a>
        </div>
      </div>
      
      <button onclick="refreshData()" class="refresh-btn">🔄 Refresh Data</button>
      
      <div class="dashboard-container">
        <div class="stats-card">
          <h3>📈 Task Statistics</h3>
          <div class="stats-grid" id="stats-grid">
            <div class="stat-item">
              <span class="stat-number" id="total-tasks">-</span>
              <span>Total Tasks</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" id="completed-tasks">-</span>
              <span>Completed</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" id="failed-tasks">-</span>
              <span>Failed</span>
            </div>
            <div class="stat-item">
              <span class="stat-number" id="avg-time">-</span>
              <span>Avg Time (ms)</span>
            </div>
          </div>
        </div>
        
        <div class="tasks-card">
          <h3>📋 Recent Tasks</h3>
          <div class="tasks-list" id="tasks-list">
            <div style="text-align: center; color: #ccc; padding: 20px;">
              Loading tasks...
            </div>
          </div>
        </div>
      </div>
      
      <script>
        async function loadStats() {
          try {
            const response = await fetch('/api/task-stats');
            const data = await response.json();
            
            if (data.success) {
              document.getElementById('total-tasks').textContent = data.stats.total;
              document.getElementById('completed-tasks').textContent = data.stats.completed;
              document.getElementById('failed-tasks').textContent = data.stats.failed;
              document.getElementById('avg-time').textContent = data.stats.avgExecutionTime.toFixed(1);
            }
          } catch (error) {
            console.error('Error loading stats:', error);
          }
        }
        
        async function loadTasks() {
          try {
            const response = await fetch('/api/tasks');
            const data = await response.json();
            
            if (data.success) {
              const tasksList = document.getElementById('tasks-list');
              
              if (data.tasks.length === 0) {
                tasksList.innerHTML = '<div style="text-align: center; color: #ccc; padding: 20px;">No tasks found</div>';
                return;
              }
              
              // Sort tasks by start time (newest first)
              const sortedTasks = data.tasks.sort((a, b) => b.startTime - a.startTime);
              
              tasksList.innerHTML = sortedTasks.map(task => {
                const startTime = new Date(task.startTime).toLocaleString();
                const statusClass = task.status === 'completed' ? 'status-completed' : 
                                   task.status === 'failed' ? 'status-failed' : 'status-running';
                
                return \`
                  <div class="task-item \${task.status}">
                    <div class="task-header">
                      <span class="task-id">\${task.id}</span>
                      <span class="task-status \${statusClass}">\${task.status.toUpperCase()}</span>
                    </div>
                    <div>
                      <strong>Type:</strong> \${task.type}<br>
                      <strong>Started:</strong> \${startTime}<br>
                      \${task.executionTime ? \`<strong>Duration:</strong> \${task.executionTime}ms<br>\` : ''}
                      \${task.result ? \`<strong>Result:</strong> \${task.result}<br>\` : ''}
                      \${task.error ? \`<strong>Error:</strong> \${task.error}\` : ''}
                    </div>
                  </div>
                \`;
              }).join('');
            }
          } catch (error) {
            console.error('Error loading tasks:', error);
            document.getElementById('tasks-list').innerHTML = 
              '<div style="text-align: center; color: #dc3545; padding: 20px;">Error loading tasks</div>';
          }
        }
        
        function refreshData() {
          loadStats();
          loadTasks();
        }
        
        // Load data on page load
        document.addEventListener('DOMContentLoaded', function() {
          refreshData();
          
          // Auto-refresh every 30 seconds
          setInterval(refreshData, 30000);
        });
      </script>
    </body>
    </html>
  `);
});

// API endpoint to execute RPN calculator with task monitoring
app.post('/api/calculate', requiresAuth(), (req, res) => {
  const { expression, verbose } = req.body;
  const userId = req.oidc.user.sub || req.oidc.user.email;
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }
  
  // Create monitored task
  const taskId = taskMonitor.createTask('RPN_CALCULATION', userId);
  console.log(`[TASK MONITOR] Started task ${taskId} for user ${userId}: ${expression}`);
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n4\n' : '1\n' + expression + '\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  // Execute the C program
  const child = exec(calculatorPath, { timeout: 10000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Execution error:', error);
      taskMonitor.failTask(taskId, 'Erro na execução do cálculo');
      console.log(`[TASK MONITOR] Failed task ${taskId}: Execution error`);
      return res.json({ success: false, error: 'Erro na execução do cálculo', taskId });
    }
    
    if (stderr) {
      console.error('Stderr:', stderr);
      taskMonitor.failTask(taskId, stderr);
      console.log(`[TASK MONITOR] Failed task ${taskId}: ${stderr}`);
      return res.json({ success: false, error: stderr, taskId });
    }
    
    // Parse the output to extract the result
    const output = stdout.toString();
    
    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      const errorMsg = errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo';
      taskMonitor.failTask(taskId, errorMsg);
      console.log(`[TASK MONITOR] Failed task ${taskId}: ${errorMsg}`);
      return res.json({ 
        success: false, 
        error: errorMsg,
        taskId
      });
    }
    
    // Task completed successfully
    taskMonitor.completeTask(taskId, output.trim());
    console.log(`[TASK MONITOR] Completed task ${taskId} successfully`);
    
    res.json({ success: true, output: output, taskId });
  });
  
  // Send input to the C program
  child.stdin.write(inputData);
  child.stdin.end();
});

// API endpoint to get task status
app.get('/api/task/:taskId', requiresAuth(), (req, res) => {
  const taskId = req.params.taskId;
  const task = taskMonitor.getTask(taskId);
  
  if (!task) {
    return res.json({ success: false, error: 'Task not found' });
  }
  
  // Only allow users to see their own tasks
  const userId = req.oidc.user.sub || req.oidc.user.email;
  if (task.userId !== userId) {
    return res.json({ success: false, error: 'Access denied' });
  }
  
  res.json({ success: true, task });
});

// API endpoint to get user's task history
app.get('/api/tasks', requiresAuth(), (req, res) => {
  const userId = req.oidc.user.sub || req.oidc.user.email;
  const userTasks = taskMonitor.getUserTasks(userId);
  
  res.json({ success: true, tasks: userTasks });
});

// API endpoint to get task statistics (admin-like view)
app.get('/api/task-stats', requiresAuth(), (req, res) => {
  const stats = taskMonitor.getTaskStats();
  res.json({ success: true, stats });
});

// API endpoint to run individual worker tests
app.post('/api/run-worker-tests', requiresAuth(), (req, res) => {
  const userId = req.oidc.user.sub || req.oidc.user.email;
  
  // Create monitored task for worker tests
  const taskId = taskMonitor.createTask('WORKER_TESTS', userId);
  console.log(`[TASK MONITOR] Started worker tests task ${taskId} for user ${userId}`);
  
  const workerTestsPath = path.join(__dirname, 'worker_tests');
  
  // Execute the worker tests
  exec(workerTestsPath, { timeout: 30000 }, (error, stdout, stderr) => {
    if (error) {
      console.error('Worker tests execution error:', error);
      taskMonitor.failTask(taskId, 'Erro na execução dos testes');
      console.log(`[TASK MONITOR] Failed worker tests task ${taskId}: Execution error`);
      return res.json({ success: false, error: 'Erro na execução dos testes', taskId });
    }
    
    if (stderr) {
      console.error('Worker tests stderr:', stderr);
      taskMonitor.failTask(taskId, stderr);
      console.log(`[TASK MONITOR] Failed worker tests task ${taskId}: ${stderr}`);
      return res.json({ success: false, error: stderr, taskId });
    }
    
    // Tests completed successfully
    const output = stdout.toString();
    taskMonitor.completeTask(taskId, output.trim());
    console.log(`[TASK MONITOR] Completed worker tests task ${taskId} successfully`);
    
    res.json({ success: true, output: output, taskId });
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
  console.log(`   - Base URL: ${config.baseURL}`);
  console.log(`   - Client ID: ${config.clientID ? '✅ Configured' : '❌ Missing'}`);
  console.log(`   - Issuer: ${config.issuerBaseURL ? '✅ Configured' : '❌ Missing'}`);
  
  if (!config.clientID || !config.issuerBaseURL) {
    console.log('⚠️  Please configure Auth0 credentials in .env file');
  }
});

module.exports = app;