const express = require('express');
const { auth, requiresAuth } = require('express-openid-connect');
const { exec } = require('child_process');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Auth0 configuration - temporarily bypass for testing
const config = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.AUTH0_SECRET || 'a-long-random-secret',
  baseURL: process.env.AUTH0_BASE_URL || 'http://localhost:3000',
  clientID: process.env.AUTH0_CLIENT_ID,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
};

// Temporarily disable auth middleware for testing
// app.use(auth(config));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Check if user is authenticated - temporarily bypass for testing
app.get('/', (req, res) => {
  // Always redirect to calculator for testing
  res.redirect('/calculator');
});

// Protected calculator route - temporarily remove auth for testing
app.get('/calculator', (req, res) => {
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
        .save-btn {
          background: #28a745;
        }
        .save-btn:hover {
          background: #218838;
        }
        .save-btn:disabled {
          background: #6c757d;
          cursor: not-allowed;
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
        .saved-calculations {
          margin-top: 30px;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
        }
        .saved-controls {
          display: flex;
          gap: 10px;
          margin-bottom: 15px;
        }
        .toggle-btn {
          background: #007bff;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }
        .toggle-btn:hover {
          background: #0056b3;
        }
        .delete-btn {
          background: #dc3545;
          color: white;
          padding: 8px 16px;
          border: none;
          border-radius: 5px;
          cursor: pointer;
          font-size: 14px;
        }
        .delete-btn:hover {
          background: #c82333;
        }
        .saved-item {
          background: rgba(255,255,255,0.1);
          padding: 15px;
          margin: 10px 0;
          border-radius: 8px;
          border-left: 4px solid #28a745;
        }
        .saved-expression {
          font-family: 'Courier New', monospace;
          font-weight: bold;
          color: #ffc107;
        }
        .saved-result {
          font-family: 'Courier New', monospace;
          color: #28a745;
          margin: 5px 0;
        }
        .saved-date {
          font-size: 12px;
          color: #adb5bd;
        }
        .saved-actions {
          margin-top: 10px;
        }
        .reuse-btn, .remove-btn {
          background: #6c757d;
          color: white;
          padding: 4px 8px;
          border: none;
          border-radius: 3px;
          cursor: pointer;
          font-size: 12px;
          margin-right: 5px;
        }
        .reuse-btn:hover {
          background: #545b62;
        }
        .remove-btn:hover {
          background: #dc3545;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧮 RPN Calculator</h1>
        <div class="user-info">
          <span>Bem-vindo, Usuário de Teste!</span>
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
          <button onclick="saveResult()" class="save-btn" id="saveBtn" disabled>Salvar Resultado</button>
          <button onclick="clearAll()" class="clear-btn">Limpar</button>
        </div>
        
        <div class="loading" id="loading">🔄 Calculando...</div>
        <div id="result"></div>
        
        <div class="saved-calculations" id="savedSection" style="display: none;">
          <h3>📋 Cálculos Salvos</h3>
          <div class="saved-controls">
            <button onclick="toggleSavedCalculations()" class="toggle-btn">Ver Salvos</button>
            <button onclick="clearSavedCalculations()" class="delete-btn">Limpar Todos</button>
          </div>
          <div id="savedList"></div>
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
        let lastCalculation = null;
        
        function useExample(expression) {
          document.getElementById('expression').value = expression;
        }
        
        function clearAll() {
          document.getElementById('expression').value = '';
          document.getElementById('result').innerHTML = '';
          document.getElementById('saveBtn').disabled = true;
          lastCalculation = null;
        }
        
        function saveResult() {
          if (!lastCalculation) {
            alert('Nenhum resultado para salvar!');
            return;
          }
          
          const savedCalculations = getSavedCalculations();
          const newCalculation = {
            id: Date.now(),
            expression: lastCalculation.expression,
            result: lastCalculation.result,
            verbose: lastCalculation.verbose,
            timestamp: new Date().toLocaleString('pt-BR')
          };
          
          savedCalculations.push(newCalculation);
          localStorage.setItem('rpn_calculations', JSON.stringify(savedCalculations));
          
          alert('Resultado salvo com sucesso!');
          updateSavedCalculationsList();
          showSavedSection();
        }
        
        function getSavedCalculations() {
          const saved = localStorage.getItem('rpn_calculations');
          return saved ? JSON.parse(saved) : [];
        }
        
        function showSavedSection() {
          const section = document.getElementById('savedSection');
          section.style.display = 'block';
          updateSavedCalculationsList();
        }
        
        function toggleSavedCalculations() {
          const section = document.getElementById('savedSection');
          const list = document.getElementById('savedList');
          
          if (list.style.display === 'none' || list.style.display === '') {
            list.style.display = 'block';
            updateSavedCalculationsList();
            document.querySelector('.toggle-btn').textContent = 'Ocultar Salvos';
          } else {
            list.style.display = 'none';
            document.querySelector('.toggle-btn').textContent = 'Ver Salvos';
          }
        }
        
        function updateSavedCalculationsList() {
          const savedCalculations = getSavedCalculations();
          const listDiv = document.getElementById('savedList');
          
          if (savedCalculations.length === 0) {
            listDiv.innerHTML = '<p style="color: #adb5bd; font-style: italic;">Nenhum cálculo salvo ainda.</p>';
            return;
          }
          
          listDiv.innerHTML = savedCalculations
            .sort((a, b) => b.id - a.id)
            .map(calc => 
              \`<div class="saved-item">
                <div class="saved-expression">Expressão: \${calc.expression}</div>
                <div class="saved-result">Resultado: \${calc.result}</div>
                <div class="saved-date">Salvo em: \${calc.timestamp}</div>
                <div class="saved-actions">
                  <button class="reuse-btn" onclick="reuseCalculation('\${calc.expression}')">Reutilizar</button>
                  <button class="remove-btn" onclick="removeCalculation(\${calc.id})">Remover</button>
                </div>
              </div>\`
            ).join('');
        }
        
        function reuseCalculation(expression) {
          document.getElementById('expression').value = expression;
        }
        
        function removeCalculation(id) {
          if (confirm('Deseja realmente remover este cálculo salvo?')) {
            let savedCalculations = getSavedCalculations();
            savedCalculations = savedCalculations.filter(calc => calc.id !== id);
            localStorage.setItem('rpn_calculations', JSON.stringify(savedCalculations));
            updateSavedCalculationsList();
          }
        }
        
        function clearSavedCalculations() {
          if (confirm('Deseja realmente apagar todos os cálculos salvos?')) {
            localStorage.removeItem('rpn_calculations');
            updateSavedCalculationsList();
          }
        }
        
        async function calculate(verbose) {
          const expression = document.getElementById('expression').value.trim();
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          const saveBtn = document.getElementById('saveBtn');
          
          if (!expression) {
            resultDiv.innerHTML = '<span style="color: #dc3545;">❌ Por favor, digite uma expressão!</span>';
            saveBtn.disabled = true;
            lastCalculation = null;
            return;
          }
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          saveBtn.disabled = true;
          
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
              
              // Extract the numerical result for saving - try multiple patterns
              let resultMatch = data.output.match(/Resultado:\s*(-?\d+(?:\.\d+)?)/);
              if (!resultMatch) {
                // Try without colon
                resultMatch = data.output.match(/Resultado\s+(-?\d+(?:\.\d+)?)/);
              }
              if (!resultMatch) {
                // Try with any whitespace
                resultMatch = data.output.match(/Resultado[:\s]+(-?\d+(?:\.\d+)?)/);
              }
              const numericalResult = resultMatch ? resultMatch[1] : 'N/A';
              
              // Debug: log to console
              console.log('Output length:', data.output.length);
              console.log('Contains Resultado:', data.output.includes('Resultado'));
              console.log('Match:', resultMatch);
              console.log('Numerical result:', numericalResult);
              
              lastCalculation = {
                expression: expression,
                result: numericalResult,
                verbose: verbose,
                fullOutput: data.output
              };
              
              saveBtn.disabled = false;
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro:</span>\\n\${data.error}\`;
              saveBtn.disabled = true;
              lastCalculation = null;
            }
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro de conexão:</span>\\n\${error.message}\`;
            saveBtn.disabled = true;
            lastCalculation = null;
          }
        }
        
        // Allow Enter key to calculate
        document.getElementById('expression').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            calculate(false);
          }
        });
        
        // Initialize saved calculations on page load
        window.addEventListener('load', function() {
          const savedCalculations = getSavedCalculations();
          if (savedCalculations.length > 0) {
            showSavedSection();
          }
        });
      </script>
    </body>
    </html>
  `);
});

// API endpoint to execute RPN calculator - temporarily remove auth for testing
app.post('/api/calculate', (req, res) => {
  const { expression, verbose } = req.body;
  
  if (!expression || typeof expression !== 'string') {
    return res.json({ success: false, error: 'Expressão inválida' });
  }
  
  // Create a temporary input file for the C program
  const inputData = verbose ? '2\n' + expression + '\n\n4\n' : '1\n' + expression + '\n\n4\n';
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