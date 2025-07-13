const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Mock user for testing
const mockUser = {
  name: 'Test User',
  email: 'test@example.com'
};

// Test route
app.get('/', (req, res) => {
  res.redirect('/calculator');
});

// Calculator route (no auth required for testing)
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
        .saved-item {
          background: rgba(255,255,255,0.1);
          padding: 10px;
          margin: 10px 0;
          border-radius: 5px;
          border-left: 3px solid #007bff;
        }
        .save-message {
          color: #28a745;
          font-weight: bold;
          margin-top: 10px;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧮 RPN Calculator</h1>
        <div class="user-info">
          <span>Bem-vindo, ${mockUser.name}!</span>
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
          <button onclick="saveResult()" class="save-btn">Salvar</button>
          <button onclick="clearAll()" class="clear-btn">Limpar</button>
        </div>
        
        <div class="loading" id="loading">🔄 Calculando...</div>
        <div id="result"></div>
        <div id="save-message"></div>
        
        <div class="saved-calculations">
          <h3>📋 Cálculos Salvos:</h3>
          <div id="saved-list">
            <p>Nenhum cálculo salvo ainda. Execute um cálculo e clique em "Salvar" para salvá-lo.</p>
          </div>
          <button onclick="downloadSaved()" style="margin-top: 15px; background: #6f42c1;">📥 Download Salvos</button>
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
        let lastCalculationResult = null;
        let lastExpression = null;
        let savedCalculations = JSON.parse(localStorage.getItem('rpn_saved_calculations') || '[]');
        
        function updateSavedList() {
          const savedList = document.getElementById('saved-list');
          if (savedCalculations.length === 0) {
            savedList.innerHTML = '<p>Nenhum cálculo salvo ainda. Execute um cálculo e clique em "Salvar" para salvá-lo.</p>';
          } else {
            savedList.innerHTML = savedCalculations.map((item, index) => \`
              <div class="saved-item">
                <strong>\${item.expression}</strong> = \${item.result}<br>
                <small>Salvo em: \${item.timestamp}</small>
                <button onclick="deleteSaved(\${index})" style="float: right; background: #dc3545; padding: 5px 10px; border: none; border-radius: 3px; color: white; cursor: pointer;">🗑️</button>
              </div>
            \`).join('');
          }
        }
        
        function useExample(expression) {
          document.getElementById('expression').value = expression;
        }
        
        function clearAll() {
          document.getElementById('expression').value = '';
          document.getElementById('result').innerHTML = '';
          document.getElementById('save-message').innerHTML = '';
          lastCalculationResult = null;
          lastExpression = null;
        }
        
        function saveResult() {
          if (!lastCalculationResult || !lastExpression) {
            document.getElementById('save-message').innerHTML = '<span style="color: #dc3545;">❌ Nenhum resultado para salvar. Execute um cálculo primeiro!</span>';
            return;
          }
          
          const calculation = {
            expression: lastExpression,
            result: lastCalculationResult,
            timestamp: new Date().toLocaleString('pt-BR')
          };
          
          savedCalculations.push(calculation);
          localStorage.setItem('rpn_saved_calculations', JSON.stringify(savedCalculations));
          
          document.getElementById('save-message').innerHTML = '<span class="save-message">✅ Resultado salvo com sucesso!</span>';
          updateSavedList();
          
          // Clear message after 3 seconds
          setTimeout(() => {
            document.getElementById('save-message').innerHTML = '';
          }, 3000);
        }
        
        function deleteSaved(index) {
          savedCalculations.splice(index, 1);
          localStorage.setItem('rpn_saved_calculations', JSON.stringify(savedCalculations));
          updateSavedList();
        }
        
        function downloadSaved() {
          if (savedCalculations.length === 0) {
            alert('Nenhum cálculo salvo para download.');
            return;
          }
          
          const data = savedCalculations.map(item => \`\${item.timestamp}: \${item.expression} = \${item.result}\`).join('\\n');
          const blob = new Blob([data], { type: 'text/plain' });
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'rpn_calculations.txt';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        }
        
        async function calculate(verbose) {
          const expression = document.getElementById('expression').value.trim();
          const resultDiv = document.getElementById('result');
          const loadingDiv = document.getElementById('loading');
          const saveMessageDiv = document.getElementById('save-message');
          
          if (!expression) {
            resultDiv.innerHTML = '<span style="color: #dc3545;">❌ Por favor, digite uma expressão!</span>';
            return;
          }
          
          loadingDiv.style.display = 'block';
          resultDiv.innerHTML = '';
          saveMessageDiv.innerHTML = '';
          
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
              
              // Extract the numeric result for saving
              const resultMatch = data.output.match(/Resultado: ([\\d.-]+)/);
              if (resultMatch) {
                lastCalculationResult = resultMatch[1];
                lastExpression = expression;
              }
            } else {
              resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro:</span>\\n\${data.error}\`;
              lastCalculationResult = null;
              lastExpression = null;
            }
          } catch (error) {
            loadingDiv.style.display = 'none';
            resultDiv.innerHTML = \`<span style="color: #dc3545;">❌ Erro de conexão:</span>\\n\${error.message}\`;
            lastCalculationResult = null;
            lastExpression = null;
          }
        }
        
        // Allow Enter key to calculate
        document.getElementById('expression').addEventListener('keypress', function(e) {
          if (e.key === 'Enter') {
            calculate(false);
          }
        });
        
        // Initialize saved list on load
        updateSavedList();
      </script>
    </body>
    </html>
  `);
});

// API endpoint to execute RPN calculator
app.post('/api/calculate', (req, res) => {
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

// Start server
app.listen(port, () => {
  console.log(`🚀 RPN Calculator TEST server running at http://localhost:${port}`);
});

module.exports = app;