const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// In-memory storage for saved calculations
const savedCalculations = [];

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

// Temporary test route without auth
app.get('/test-calculator', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>RPN Calculator - Test</title>
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
        .save-btn {
          background: #28a745;
        }
        .save-btn:hover {
          background: #218838;
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
        .saved-calculations {
          margin-top: 30px;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
        }
        .calculation-item {
          background: rgba(255,255,255,0.1);
          padding: 10px;
          margin: 10px 0;
          border-radius: 5px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .delete-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
        }
        .delete-btn:hover {
          background: #c82333;
        }
      </style>
    </head>
    <body>
      <div class="calculator-container">
        <h1>🧮 RPN Calculator - Test Interface</h1>
        
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
          <button onclick="saveCalculation()" class="save-btn">Salvar</button>
          <button onclick="clearAll()" class="clear-btn">Limpar</button>
        </div>
        
        <div id="result"></div>
        
        <div class="saved-calculations">
          <h3>Cálculos Salvos:</h3>
          <div id="saved-list">Nenhum cálculo salvo ainda.</div>
        </div>
      </div>
      
      <script>
        let lastCalculation = null;
        
        function clearAll() {
          document.getElementById('expression').value = '';
          document.getElementById('result').innerHTML = '';
          lastCalculation = null;
        }
        
        async function calculate(verbose) {
          const expression = document.getElementById('expression').value.trim();
          const resultDiv = document.getElementById('result');
          
          if (!expression) {
            resultDiv.innerHTML = '<span style="color: #dc3545;">❌ Por favor, digite uma expressão!</span>';
            return;
          }
          
          resultDiv.innerHTML = 'Calculando...';
          
          try {
            const response = await fetch('/api/test-calculate', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ expression, verbose })
            });
            
            const data = await response.json();
            
            if (data.success) {
              resultDiv.innerHTML = \`<span style="color: #28a745;">✅ Resultado:</span>\\n\${data.output}\`;
              lastCalculation = {
                expression: data.expression || expression,
                result: data.result || 'Calculado',
                verbose: verbose,
                output: data.output
              };
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro:</span>\\n\${data.error}\`;
              lastCalculation = null;
            }
          } catch (error) {
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro de conexão:</span>\\n\${error.message}\`;
            lastCalculation = null;
          }
        }
        
        async function saveCalculation() {
          if (!lastCalculation) {
            document.getElementById('result').innerHTML = '<span style="color: #dc3545;">❌ Nenhum cálculo para salvar! Execute um cálculo primeiro.</span>';
            return;
          }
          
          try {
            const response = await fetch('/api/save-calculation', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(lastCalculation)
            });
            
            const data = await response.json();
            
            if (data.success) {
              document.getElementById('result').innerHTML += '<br><span style="color: #28a745;">💾 Cálculo salvo com sucesso!</span>';
              loadSavedCalculations();
            } else {
              document.getElementById('result').innerHTML += '<br><span style="color: #dc3545;">❌ Erro ao salvar: ' + data.error + '</span>';
            }
          } catch (error) {
            document.getElementById('result').innerHTML += '<br><span style="color: #dc3545;">❌ Erro de conexão ao salvar: ' + error.message + '</span>';
          }
        }
        
        async function loadSavedCalculations() {
          try {
            const response = await fetch('/api/saved-calculations');
            const data = await response.json();
            
            const savedListDiv = document.getElementById('saved-list');
            
            if (data.success && data.calculations.length > 0) {
              savedListDiv.innerHTML = data.calculations.map((calc, index) => \`
                <div class="calculation-item">
                  <div>
                    <strong>\${calc.expression}</strong> = \${calc.result}
                    <small style="display: block; color: #ccc;">Salvo em: \${new Date(calc.timestamp).toLocaleString()}</small>
                  </div>
                  <button class="delete-btn" onclick="deleteCalculation(\${index})">Excluir</button>
                </div>
              \`).join('');
            } else {
              savedListDiv.innerHTML = 'Nenhum cálculo salvo ainda.';
            }
          } catch (error) {
            console.error('Erro ao carregar cálculos salvos:', error);
          }
        }
        
        async function deleteCalculation(index) {
          try {
            const response = await fetch(\`/api/delete-calculation/\${index}\`, {
              method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
              loadSavedCalculations();
            }
          } catch (error) {
            console.error('Erro ao excluir cálculo:', error);
          }
        }
        
        // Load saved calculations on page load
        window.onload = function() {
          loadSavedCalculations();
        };
      </script>
    </body>
    </html>
  `);
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
          <button onclick="saveCalculation()" class="save-btn">Salvar</button>
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

// Test API endpoint without auth
app.post('/api/test-calculate', (req, res) => {
  const { expression, verbose } = req.body;
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n4\n' : '1\n' + expression + '\n4\n';
  const calculatorPath = path.join(__dirname, 'rpn_calculator');
  
  // Execute the C program
  const child = exec(calculatorPath, { timeout: 5000 }, (error, stdout, stderr) => {
    // Handle timeout gracefully - the program was killed due to hanging
    if (error && error.signal === 'SIGTERM') {
      // Parse the output we got before killing
      const output = stdout.toString();
      
      // Extract just the result portion
      const resultMatch = output.match(/Resultado: ([\d\.-]+)/);
      const expressionMatch = output.match(/Expressão: ([^\n]+)/);
      
      if (resultMatch && expressionMatch) {
        const result = resultMatch[1];
        const expression = expressionMatch[1];
        
        let cleanOutput;
        if (verbose) {
          // For verbose mode, include the step-by-step calculation
          cleanOutput = output;
        } else {
          // For normal mode, just show the clean result
          cleanOutput = `Expressão: ${expression}\nResultado: ${result}`;
        }
        
        return res.json({ success: true, output: cleanOutput, result: result, expression: expression });
      } else {
        return res.json({ success: true, output: output });
      }
    }
    
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
    
    // Extract just the result portion
    const resultMatch = output.match(/Resultado: ([\d\.-]+)/);
    const expressionMatch = output.match(/Expressão: ([^\n]+)/);
    
    if (resultMatch && expressionMatch) {
      const result = resultMatch[1];
      const expression = expressionMatch[1];
      
      let cleanOutput = output;
      if (verbose) {
        // For verbose mode, include the step-by-step calculation
        cleanOutput = output;
      } else {
        // For normal mode, just show the clean result
        cleanOutput = `Expressão: ${expression}\nResultado: ${result}`;
      }
      
      res.json({ success: true, output: cleanOutput, result: result, expression: expression });
    } else {
      res.json({ success: true, output: output });
    }
  });
  
  // Send input to the C program
  child.stdin.write(inputData);
  child.stdin.end();
  
  // Kill the process after a short delay to prevent hanging
  setTimeout(() => {
    if (!child.killed) {
      child.kill();
    }
  }, 3000);
});

// API endpoint to save a calculation
app.post('/api/save-calculation', (req, res) => {
  const { expression, result, verbose, output } = req.body;
  
  if (!expression || !result) {
    return res.json({ success: false, error: 'Dados de cálculo inválidos' });
  }
  
  const calculation = {
    expression,
    result,
    verbose,
    output,
    timestamp: new Date().toISOString()
  };
  
  savedCalculations.push(calculation);
  
  res.json({ success: true, message: 'Cálculo salvo com sucesso' });
});

// API endpoint to get saved calculations
app.get('/api/saved-calculations', (req, res) => {
  res.json({ success: true, calculations: savedCalculations });
});

// API endpoint to delete a saved calculation
app.delete('/api/delete-calculation/:index', (req, res) => {
  const index = parseInt(req.params.index);
  
  if (index >= 0 && index < savedCalculations.length) {
    savedCalculations.splice(index, 1);
    res.json({ success: true, message: 'Cálculo excluído com sucesso' });
  } else {
    res.json({ success: false, error: 'Índice inválido' });
  }
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
  const child = exec(calculatorPath, { timeout: 5000 }, (error, stdout, stderr) => {
    // Handle timeout gracefully - the program was killed due to hanging
    if (error && error.signal === 'SIGTERM') {
      // Parse the output we got before killing
      const output = stdout.toString();
      
      // Extract just the result portion
      const resultMatch = output.match(/Resultado: ([\d\.-]+)/);
      const expressionMatch = output.match(/Expressão: ([^\n]+)/);
      
      if (resultMatch && expressionMatch) {
        const result = resultMatch[1];
        const expression = expressionMatch[1];
        
        let cleanOutput;
        if (verbose) {
          // For verbose mode, include the step-by-step calculation
          cleanOutput = output;
        } else {
          // For normal mode, just show the clean result
          cleanOutput = `Expressão: ${expression}\nResultado: ${result}`;
        }
        
        return res.json({ success: true, output: cleanOutput, result: result, expression: expression });
      } else {
        return res.json({ success: true, output: output });
      }
    }
    
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
    
    // Extract just the result portion
    const resultMatch = output.match(/Resultado: ([\d\.-]+)/);
    const expressionMatch = output.match(/Expressão: ([^\n]+)/);
    
    if (resultMatch && expressionMatch) {
      const result = resultMatch[1];
      const expression = expressionMatch[1];
      
      let cleanOutput = output;
      if (verbose) {
        // For verbose mode, include the step-by-step calculation
        cleanOutput = output;
      } else {
        // For normal mode, just show the clean result
        cleanOutput = `Expressão: ${expression}\nResultado: ${result}`;
      }
      
      res.json({ success: true, output: cleanOutput, result: result, expression: expression });
    } else {
      res.json({ success: true, output: output });
    }
  });
  
  // Send input to the C program
  child.stdin.write(inputData);
  child.stdin.end();
  
  // Kill the process after a short delay to prevent hanging
  setTimeout(() => {
    if (!child.killed) {
      child.kill();
    }
  }, 3000);
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