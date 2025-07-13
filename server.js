const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Task monitoring system
const taskMonitor = {
  tasks: new Map(),
  maxHistory: 100,
  
  createTask(expression, verbose, userId) {
    const taskId = crypto.randomUUID();
    const task = {
      id: taskId,
      expression,
      verbose,
      userId,
      status: 'pending',
      createdAt: new Date(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null,
      processId: null,
      duration: null
    };
    
    this.tasks.set(taskId, task);
    this.cleanupOldTasks();
    console.log(`📝 Task created: ${taskId} - Expression: "${expression}" - User: ${userId}`);
    return task;
  },
  
  updateTask(taskId, updates) {
    const task = this.tasks.get(taskId);
    if (task) {
      Object.assign(task, updates);
      console.log(`🔄 Task updated: ${taskId} - Status: ${task.status}`);
    }
  },
  
  getTask(taskId) {
    return this.tasks.get(taskId);
  },
  
  getAllTasks(userId = null) {
    const tasks = Array.from(this.tasks.values());
    if (userId) {
      return tasks.filter(task => task.userId === userId);
    }
    return tasks;
  },
  
  getTasksByStatus(status, userId = null) {
    return this.getAllTasks(userId).filter(task => task.status === status);
  },
  
  cleanupOldTasks() {
    if (this.tasks.size > this.maxHistory) {
      const sortedTasks = Array.from(this.tasks.entries())
        .sort((a, b) => new Date(a[1].createdAt) - new Date(b[1].createdAt));
      
      const tasksToRemove = sortedTasks.slice(0, this.tasks.size - this.maxHistory);
      tasksToRemove.forEach(([taskId]) => {
        this.tasks.delete(taskId);
        console.log(`🗑️ Cleaned up old task: ${taskId}`);
      });
    }
  },
  
  getStats() {
    const tasks = this.getAllTasks();
    const stats = {
      total: tasks.length,
      pending: tasks.filter(t => t.status === 'pending').length,
      running: tasks.filter(t => t.status === 'running').length,
      completed: tasks.filter(t => t.status === 'completed').length,
      failed: tasks.filter(t => t.status === 'failed').length,
      avgDuration: 0
    };
    
    const completedTasks = tasks.filter(t => t.status === 'completed' && t.duration);
    if (completedTasks.length > 0) {
      stats.avgDuration = completedTasks.reduce((sum, t) => sum + t.duration, 0) / completedTasks.length;
    }
    
    return stats;
  }
};

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
        .clear-btn {
          background: #6c757d;
        }
        .clear-btn:hover {
          background: #545b62;
        }
        .monitor-btn {
          background: #6f42c1;
        }
        .monitor-btn:hover {
          background: #5a359a;
        }
        .test-btn {
          background: #fd7e14;
        }
        .test-btn:hover {
          background: #e8590c;
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
        .task-monitor {
          display: none;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
          margin-top: 20px;
        }
        .task-item {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          border-left: 4px solid #007bff;
        }
        .task-item.completed {
          border-left-color: #28a745;
        }
        .task-item.failed {
          border-left-color: #dc3545;
        }
        .task-item.running {
          border-left-color: #ffc107;
        }
        .task-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 15px;
          margin: 20px 0;
        }
        .stat-card {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-value {
          font-size: 1.5em;
          font-weight: bold;
          color: #28a745;
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
          <button onclick="showTaskMonitor()" class="monitor-btn">Monitor de Tasks</button>
          <button onclick="testWorker()" class="test-btn">Testar Worker</button>
        </div>
        
        <div class="loading" id="loading">🔄 Calculando...</div>
        <div id="result"></div>
        
        <!-- Task Monitor Section -->
        <div class="task-monitor" id="taskMonitor">
          <h3>📊 Monitor de Tasks</h3>
          <div class="task-stats" id="taskStats"></div>
          <div id="taskList"></div>
          <button onclick="hideTaskMonitor()" class="clear-btn" style="margin-top: 20px;">Fechar Monitor</button>
        </div>
        
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
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Resultado (Task ID: \${data.taskId}):</span>\\n\${data.output}\\n<small style="color: #6c757d;">Duração: \${data.duration}ms</small>\`;
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro (Task ID: \${data.taskId || 'N/A'}):</span>\\n\${data.error}\`;
            }
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro de conexão:</span>\\n\${error.message}\`;
          }
        }
        
        async function showTaskMonitor() {
          const monitorDiv = document.getElementById('taskMonitor');
          const statsDiv = document.getElementById('taskStats');
          const listDiv = document.getElementById('taskList');
          
          try {
            // Get stats
            const statsResponse = await fetch('/api/monitor/stats');
            const statsData = await statsResponse.json();
            
            if (statsData.success) {
              const stats = statsData.userStats;
              statsDiv.innerHTML = \`
                <div class="stat-card">
                  <div class="stat-value">\${stats.total}</div>
                  <div>Total Tasks</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #28a745;">\${stats.completed}</div>
                  <div>Concluídas</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #dc3545;">\${stats.failed}</div>
                  <div>Falharam</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value" style="color: #ffc107;">\${stats.running}</div>
                  <div>Executando</div>
                </div>
                <div class="stat-card">
                  <div class="stat-value">\${Math.round(stats.avgDuration)}ms</div>
                  <div>Duração Média</div>
                </div>
              \`;
            }
            
            // Get tasks
            const tasksResponse = await fetch('/api/tasks');
            const tasksData = await tasksResponse.json();
            
            if (tasksData.success) {
              const tasks = tasksData.tasks.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
              
              listDiv.innerHTML = tasks.map(task => \`
                <div class="task-item \${task.status}">
                  <strong>Task ID:</strong> \${task.id}<br>
                  <strong>Expressão:</strong> \${task.expression}<br>
                  <strong>Status:</strong> \${task.status}<br>
                  <strong>Criada em:</strong> \${new Date(task.createdAt).toLocaleString()}<br>
                  \${task.duration ? \`<strong>Duração:</strong> \${task.duration}ms<br>\` : ''}
                  \${task.error ? \`<strong>Erro:</strong> \${task.error}\` : ''}
                </div>
              \`).join('');
            }
            
            monitorDiv.style.display = 'block';
          } catch (error) {
            listDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro ao carregar monitor: \${error.message}</span>\`;
            monitorDiv.style.display = 'block';
          }
        }
        
        function hideTaskMonitor() {
          document.getElementById('taskMonitor').style.display = 'none';
        }
        
        async function testWorker() {
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          
          try {
            const response = await fetch('/api/test/worker', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ testExpression: '2 3 +' })
            });
            
            const data = await response.json();
            loadingDiv.style.display = 'none';
            
            if (data.success) {
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Teste de Worker Concluído (Task ID: \${data.taskId}):</span>\\n\${data.output}\\n<small style="color: #6c757d;">Duração: \${data.duration}ms | PID: \${data.processId}</small>\`;
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Teste de Worker Falhou (Task ID: \${data.taskId}):</span>\\n\${data.error}\\n<small style="color: #6c757d;">Duração: \${data.duration}ms</small>\`;
            }
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro no teste de worker:</span>\\n\${error.message}\`;
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

// API endpoint to execute RPN calculator with task monitoring
app.post('/api/calculate', requiresAuth(), (req, res) => {
  const { expression, verbose } = req.body;
  const userId = req.oidc.user.sub || req.oidc.user.email;
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }
  
  // Create monitored task
  const task = taskMonitor.createTask(expression, verbose, userId);
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n4\n' : '1\n' + expression + '\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  // Update task status to running
  taskMonitor.updateTask(task.id, { 
    status: 'running', 
    startedAt: new Date() 
  });
  
  // Execute the C program with monitoring
  const child = exec(calculatorPath, { timeout: 10000 }, (error, stdout, stderr) => {
    const completedAt = new Date();
    const duration = completedAt - task.startedAt;
    
    if (error) {
      console.error(`❌ Task ${task.id} failed:`, error);
      taskMonitor.updateTask(task.id, {
        status: 'failed',
        error: error.message,
        completedAt,
        duration
      });
      return res.json({ 
        success: false, 
        error: 'Erro na execução do cálculo',
        taskId: task.id
      });
    }
    
    if (stderr) {
      console.error(`❌ Task ${task.id} stderr:`, stderr);
      taskMonitor.updateTask(task.id, {
        status: 'failed',
        error: stderr,
        completedAt,
        duration
      });
      return res.json({ 
        success: false, 
        error: stderr,
        taskId: task.id
      });
    }
    
    // Parse the output to extract the result
    const output = stdout.toString();
    
    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      const errorMsg = errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo';
      
      console.error(`❌ Task ${task.id} calculation error:`, errorMsg);
      taskMonitor.updateTask(task.id, {
        status: 'failed',
        error: errorMsg,
        completedAt,
        duration
      });
      
      return res.json({ 
        success: false, 
        error: errorMsg,
        taskId: task.id
      });
    }
    
    // Success
    console.log(`✅ Task ${task.id} completed successfully in ${duration}ms`);
    taskMonitor.updateTask(task.id, {
      status: 'completed',
      result: output,
      completedAt,
      duration
    });
    
    res.json({ 
      success: true, 
      output: output,
      taskId: task.id,
      duration
    });
  });
  
  // Store process ID for monitoring
  taskMonitor.updateTask(task.id, { processId: child.pid });
  console.log(`🚀 Task ${task.id} started with PID: ${child.pid}`);
  
  // Send input to the C program
  child.stdin.write(inputData);
  child.stdin.end();
});

// Task monitoring API endpoints
app.get('/api/tasks', requiresAuth(), (req, res) => {
  const userId = req.oidc.user.sub || req.oidc.user.email;
  const tasks = taskMonitor.getAllTasks(userId);
  
  res.json({
    success: true,
    tasks: tasks.map(task => ({
      id: task.id,
      expression: task.expression,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      duration: task.duration,
      error: task.error
    }))
  });
});

app.get('/api/tasks/:taskId', requiresAuth(), (req, res) => {
  const { taskId } = req.params;
  const userId = req.oidc.user.sub || req.oidc.user.email;
  const task = taskMonitor.getTask(taskId);
  
  if (!task || task.userId !== userId) {
    return res.status(404).json({ success: false, error: 'Task not found' });
  }
  
  res.json({
    success: true,
    task: {
      id: task.id,
      expression: task.expression,
      verbose: task.verbose,
      status: task.status,
      createdAt: task.createdAt,
      startedAt: task.startedAt,
      completedAt: task.completedAt,
      duration: task.duration,
      result: task.result,
      error: task.error,
      processId: task.processId
    }
  });
});

app.get('/api/tasks/status/:status', requiresAuth(), (req, res) => {
  const { status } = req.params;
  const userId = req.oidc.user.sub || req.oidc.user.email;
  const tasks = taskMonitor.getTasksByStatus(status, userId);
  
  res.json({
    success: true,
    tasks: tasks.map(task => ({
      id: task.id,
      expression: task.expression,
      status: task.status,
      createdAt: task.createdAt,
      duration: task.duration
    }))
  });
});

app.get('/api/monitor/stats', requiresAuth(), (req, res) => {
  const userId = req.oidc.user.sub || req.oidc.user.email;
  const userTasks = taskMonitor.getAllTasks(userId);
  const globalStats = taskMonitor.getStats();
  
  const userStats = {
    total: userTasks.length,
    pending: userTasks.filter(t => t.status === 'pending').length,
    running: userTasks.filter(t => t.status === 'running').length,
    completed: userTasks.filter(t => t.status === 'completed').length,
    failed: userTasks.filter(t => t.status === 'failed').length,
    avgDuration: 0
  };
  
  const completedUserTasks = userTasks.filter(t => t.status === 'completed' && t.duration);
  if (completedUserTasks.length > 0) {
    userStats.avgDuration = completedUserTasks.reduce((sum, t) => sum + t.duration, 0) / completedUserTasks.length;
  }
  
  res.json({
    success: true,
    userStats,
    globalStats
  });
});

// Individual worker test endpoint
app.post('/api/test/worker', requiresAuth(), (req, res) => {
  const { testExpression = '2 3 +' } = req.body;
  const userId = req.oidc.user.sub || req.oidc.user.email;
  
  console.log(`🧪 Starting individual worker test for user: ${userId}`);
  
  // Create test task
  const task = taskMonitor.createTask(`TEST: ${testExpression}`, false, userId);
  
  const inputData = `1\n${testExpression}\n4\n`;
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  taskMonitor.updateTask(task.id, { 
    status: 'running', 
    startedAt: new Date() 
  });
  
  const child = exec(calculatorPath, { timeout: 5000 }, (error, stdout, stderr) => {
    const completedAt = new Date();
    const duration = completedAt - task.startedAt;
    
    const testResult = {
      taskId: task.id,
      expression: testExpression,
      duration,
      processId: child.pid,
      success: false,
      output: null,
      error: null
    };
    
    if (error) {
      console.error(`❌ Worker test ${task.id} failed:`, error);
      taskMonitor.updateTask(task.id, {
        status: 'failed',
        error: error.message,
        completedAt,
        duration
      });
      testResult.error = error.message;
      return res.json(testResult);
    }
    
    if (stderr) {
      console.error(`❌ Worker test ${task.id} stderr:`, stderr);
      taskMonitor.updateTask(task.id, {
        status: 'failed',
        error: stderr,
        completedAt,
        duration
      });
      testResult.error = stderr;
      return res.json(testResult);
    }
    
    const output = stdout.toString();
    
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      const errorMsg = errorMatch ? errorMatch[0] : 'Erro desconhecido';
      
      taskMonitor.updateTask(task.id, {
        status: 'failed',
        error: errorMsg,
        completedAt,
        duration
      });
      testResult.error = errorMsg;
      return res.json(testResult);
    }
    
    // Test passed
    console.log(`✅ Worker test ${task.id} completed successfully in ${duration}ms`);
    taskMonitor.updateTask(task.id, {
      status: 'completed',
      result: output,
      completedAt,
      duration
    });
    
    testResult.success = true;
    testResult.output = output;
    res.json(testResult);
  });
  
  taskMonitor.updateTask(task.id, { processId: child.pid });
  console.log(`🚀 Worker test ${task.id} started with PID: ${child.pid}`);
  
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