const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Task monitoring system
class TaskMonitor {
  constructor() {
    this.tasks = new Map();
    this.metrics = {
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageExecutionTime: 0,
      workerHealth: 'healthy'
    };
  }

  startTask(taskId, expression) {
    const task = {
      id: taskId,
      expression,
      startTime: Date.now(),
      status: 'running',
      pid: null
    };
    this.tasks.set(taskId, task);
    this.metrics.totalTasks++;
    return task;
  }

  completeTask(taskId, success, result = null, error = null) {
    const task = this.tasks.get(taskId);
    if (!task) return null;

    const endTime = Date.now();
    const executionTime = endTime - task.startTime;
    
    task.endTime = endTime;
    task.executionTime = executionTime;
    task.status = success ? 'completed' : 'failed';
    task.result = result;
    task.error = error;

    // Update metrics
    if (success) {
      this.metrics.successfulTasks++;
    } else {
      this.metrics.failedTasks++;
    }

    // Update average execution time
    const completedTasks = this.metrics.successfulTasks + this.metrics.failedTasks;
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime * (completedTasks - 1) + executionTime) / completedTasks;

    // Update worker health based on success rate
    const successRate = this.metrics.successfulTasks / completedTasks;
    if (successRate < 0.8) {
      this.metrics.workerHealth = 'degraded';
    } else if (successRate < 0.5) {
      this.metrics.workerHealth = 'unhealthy';
    } else {
      this.metrics.workerHealth = 'healthy';
    }

    return task;
  }

  getTask(taskId) {
    return this.tasks.get(taskId);
  }

  getAllTasks() {
    return Array.from(this.tasks.values());
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getRecentTasks(limit = 10) {
    return Array.from(this.tasks.values())
      .sort((a, b) => b.startTime - a.startTime)
      .slice(0, limit);
  }
}

const taskMonitor = new TaskMonitor();

// Auth0 configuration
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || 'a-long-random-secret',
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
};

// Conditional auth setup - skip Auth0 if credentials are not properly configured
const useAuth = config.clientID && config.issuerBaseURL && 
                config.clientID !== 'your-auth0-client-id' && 
                config.issuerBaseURL !== 'https://your-domain.auth0.com';

if (useAuth) {
  // Auth router attaches /login, /logout, and /callback routes to the baseURL
  app.use(auth(config));
} else {
  console.log('⚠️  Auth0 not configured, running in development mode without authentication');
  // Mock authentication middleware for development
  app.use((req, res, next) => {
    req.oidc = {
      isAuthenticated: () => true,
      user: { name: 'Development User', email: 'dev@localhost' }
    };
    next();
  });
}

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
        .test-btn {
          background: #28a745;
        }
        .test-btn:hover {
          background: #218838;
        }
        .monitor-btn {
          background: #ffc107;
          color: #333;
        }
        .monitor-btn:hover {
          background: #e0a800;
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
          <button onclick="testWorker()" class="test-btn">Testar Worker</button>
          <button onclick="viewMonitoring()" class="monitor-btn">Monitoramento</button>
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
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Resultado:</span>\\n\${data.output}\${data.taskId ? '\\n\\nTask ID: ' + data.taskId : ''}\`;
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
          resultDiv.innerHTML = '<span style="color: #17a2b8;">🔍 Executando testes individuais do worker...</span>';
          
          try {
            const response = await fetch('/api/worker-test', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            const data = await response.json();
            loadingDiv.style.display = 'none';
            
            if (data.success) {
              let resultHtml = '<span style="color: #28a745;">✅ Todos os testes passaram!</span>\\n\\n';
              resultHtml += \`📊 Resumo: \${data.summary.passed}/\${data.summary.total} testes passaram (Taxa: \${(data.summary.successRate * 100).toFixed(1)}%)\\n\\n\`;
              resultHtml += '📋 Detalhes dos testes:\\n';
              
              data.testResults.forEach((test, index) => {
                const status = test.success ? '✅' : '❌';
                resultHtml += \`\${index + 1}. \${status} \${test.description}\\n\`;
                resultHtml += \`   Expressão: \${test.expression}\\n\`;
                if (test.success) {
                  resultHtml += \`   Resultado: \${test.actual} (esperado: \${test.expected})\\n\`;
                } else {
                  resultHtml += \`   Erro: \${test.error}\\n\`;
                }
                resultHtml += '\\n';
              });
              
              resultDiv.innerHTML = resultHtml;
            } else {
              let resultHtml = '<span style="color: #dc3545;">❌ Alguns testes falharam!</span>\\n\\n';
              resultHtml += \`📊 Resumo: \${data.summary.passed}/\${data.summary.total} testes passaram (Taxa: \${(data.summary.successRate * 100).toFixed(1)}%)\\n\\n\`;
              resultHtml += '📋 Detalhes dos testes:\\n';
              
              data.testResults.forEach((test, index) => {
                const status = test.success ? '✅' : '❌';
                resultHtml += \`\${index + 1}. \${status} \${test.description}\\n\`;
                resultHtml += \`   Expressão: \${test.expression}\\n\`;
                if (test.success) {
                  resultHtml += \`   Resultado: \${test.actual} (esperado: \${test.expected})\\n\`;
                } else {
                  resultHtml += \`   Erro: \${test.error}\\n\`;
                }
                resultHtml += '\\n';
              });
              
              resultDiv.innerHTML = resultHtml;
            }
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro ao executar testes:</span>\\n\${error.message}\`;
          }
        }
        
        async function viewMonitoring() {
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          
          try {
            const [healthResponse, tasksResponse] = await Promise.all([
              fetch('/api/health'),
              fetch('/api/tasks?limit=10')
            ]);
            
            const healthData = await healthResponse.json();
            const tasksData = await tasksResponse.json();
            
            loadingDiv.style.display = 'none';
            
            let resultHtml = '<span style="color: #17a2b8;">📊 Monitoramento do Sistema</span>\\n\\n';
            
            // Health status
            const healthIcon = healthData.status === 'healthy' ? '💚' : 
                              healthData.status === 'degraded' ? '💛' : '❤️';
            resultHtml += \`\${healthIcon} Status: \${healthData.status}\\n\`;
            resultHtml += \`🕐 Timestamp: \${new Date(healthData.timestamp).toLocaleString()}\\n\\n\`;
            
            // Metrics
            resultHtml += '📈 Métricas:\\n';
            resultHtml += \`   Total de tasks: \${healthData.metrics.totalTasks}\\n\`;
            resultHtml += \`   Sucessos: \${healthData.metrics.successfulTasks}\\n\`;
            resultHtml += \`   Falhas: \${healthData.metrics.failedTasks}\\n\`;
            resultHtml += \`   Tempo médio: \${healthData.metrics.averageExecutionTime.toFixed(2)}ms\\n\\n\`;
            
            // System info
            resultHtml += '🖥️ Sistema:\\n';
            resultHtml += \`   Executável RPN: \${healthData.system.calculatorExecutableExists ? '✅' : '❌'}\\n\`;
            resultHtml += \`   Uptime: \${(healthData.system.uptime / 3600).toFixed(2)}h\\n\`;
            resultHtml += \`   Memória: \${(healthData.system.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB\\n\\n\`;
            
            // Recent tasks
            if (tasksData.success && tasksData.tasks.length > 0) {
              resultHtml += '📋 Tasks Recentes:\\n';
              tasksData.tasks.forEach((task, index) => {
                const statusIcon = task.status === 'completed' ? '✅' : 
                                  task.status === 'failed' ? '❌' : '⏳';
                resultHtml += \`\${index + 1}. \${statusIcon} \${task.expression} (\${task.executionTime || 'N/A'}ms)\\n\`;
              });
            }
            
            resultDiv.innerHTML = resultHtml;
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro ao obter dados de monitoramento:</span>\\n\${error.message}\`;
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
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }

  // Start task monitoring
  const taskId = `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const task = taskMonitor.startTask(taskId, expression);
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n\n4\n' : '1\n' + expression + '\n\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  console.log(`[${taskId}] Starting calculation: "${expression}" (verbose: ${verbose})`);
  
  // Execute the C program
  const child = exec(calculatorPath, { timeout: 10000 }, (error, stdout, stderr) => {
    if (error) {
      console.error(`[${taskId}] Execution error:`, error);
      taskMonitor.completeTask(taskId, false, null, error.message);
      return res.json({ success: false, error: 'Erro na execução do cálculo' });
    }
    
    if (stderr) {
      console.error(`[${taskId}] Stderr:`, stderr);
      taskMonitor.completeTask(taskId, false, null, stderr);
      return res.json({ success: false, error: stderr });
    }
    
    // Parse the output to extract the result
    const output = stdout.toString();
    
    // Check for error messages in the output
    if (output.includes('Erro:') || output.includes('Error:')) {
      const errorMatch = output.match(/Erro:.*|Error:.*/);
      const errorMsg = errorMatch ? errorMatch[0] : 'Erro desconhecido no cálculo';
      console.log(`[${taskId}] Calculation failed: ${errorMsg}`);
      taskMonitor.completeTask(taskId, false, null, errorMsg);
      return res.json({ 
        success: false, 
        error: errorMsg
      });
    }
    
    console.log(`[${taskId}] Calculation completed successfully`);
    taskMonitor.completeTask(taskId, true, output);
    res.json({ success: true, output: output, taskId: taskId });
  });
  
  // Store the child process PID for monitoring
  task.pid = child.pid;
  
  // Send input to the C program
  child.stdin.write(inputData);
  child.stdin.end();
});

// Individual Worker Testing endpoint
app.post('/api/worker-test', requiresAuth(), (req, res) => {
  const testExpressions = [
    { expr: '3 4 +', expected: 7, description: 'Simple addition' },
    { expr: '5 2 *', expected: 10, description: 'Simple multiplication' },
    { expr: '10 3 /', expected: 3.333333, description: 'Division with precision' },
    { expr: '2 3 ^', expected: 8, description: 'Exponentiation' },
    { expr: '5 1 2 + 4 * + 3 -', expected: 14, description: 'Complex expression' }
  ];

  const testResults = [];
  let completedTests = 0;
  
  console.log('[WORKER-TEST] Starting individual worker testing...');
  
  testExpressions.forEach((test, index) => {
    const taskId = `worker_test_${Date.now()}_${index}`;
    const task = taskMonitor.startTask(taskId, test.expr);
    
    const inputData = '1\n' + test.expr + '\n\n4\n';
    const calculatorPath = path.join(__dirname, 'rpn_calculator');
    
    const child = exec(calculatorPath, { timeout: 5000 }, (error, stdout, stderr) => {
      const testResult = {
        expression: test.expr,
        description: test.description,
        expected: test.expected,
        taskId: taskId
      };
      
      if (error || stderr) {
        testResult.success = false;
        testResult.error = error ? error.message : stderr;
        taskMonitor.completeTask(taskId, false, null, testResult.error);
      } else {
        // Extract result from output
        const resultMatch = stdout.match(/Resultado:\s*([\d.-]+)/);
        if (resultMatch) {
          const actualResult = parseFloat(resultMatch[1]);
          const tolerance = 0.001;
          const passed = Math.abs(actualResult - test.expected) < tolerance;
          
          testResult.success = passed;
          testResult.actual = actualResult;
          testResult.passed = passed;
          
          if (!passed) {
            testResult.error = `Expected ${test.expected}, got ${actualResult}`;
          }
          
          taskMonitor.completeTask(taskId, passed, actualResult);
        } else {
          testResult.success = false;
          testResult.error = 'Could not parse result from output';
          taskMonitor.completeTask(taskId, false, null, testResult.error);
        }
      }
      
      testResults.push(testResult);
      completedTests++;
      
      if (completedTests === testExpressions.length) {
        const passedTests = testResults.filter(r => r.success).length;
        const overallSuccess = passedTests === testExpressions.length;
        
        console.log(`[WORKER-TEST] Completed: ${passedTests}/${testExpressions.length} tests passed`);
        
        res.json({
          success: overallSuccess,
          testResults: testResults,
          summary: {
            total: testExpressions.length,
            passed: passedTests,
            failed: testExpressions.length - passedTests,
            successRate: passedTests / testExpressions.length
          }
        });
      }
    });
    
    child.stdin.write(inputData);
    child.stdin.end();
  });
});

// Health monitoring endpoint
app.get('/api/health', (req, res) => {
  const metrics = taskMonitor.getMetrics();
  const recentTasks = taskMonitor.getRecentTasks(5);
  
  // Additional health checks
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  const fs = require('fs');
  
  const healthData = {
    status: metrics.workerHealth,
    timestamp: new Date().toISOString(),
    metrics: metrics,
    recentTasks: recentTasks.map(task => ({
      id: task.id,
      expression: task.expression,
      status: task.status,
      executionTime: task.executionTime,
      timestamp: new Date(task.startTime).toISOString()
    })),
    system: {
      calculatorExecutableExists: fs.existsSync(calculatorPath),
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version
    }
  };
  
  res.json(healthData);
});

// Task monitoring endpoint
app.get('/api/tasks', requiresAuth(), (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const tasks = taskMonitor.getRecentTasks(limit);
  
  res.json({
    success: true,
    tasks: tasks,
    metrics: taskMonitor.getMetrics()
  });
});

// Get specific task details
app.get('/api/tasks/:taskId', requiresAuth(), (req, res) => {
  const task = taskMonitor.getTask(req.params.taskId);
  
  if (!task) {
    return res.status(404).json({
      success: false,
      error: 'Task not found'
    });
  }
  
  res.json({
    success: true,
    task: task
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