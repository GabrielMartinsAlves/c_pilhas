const express = require('express');
const { exec } = require('child_process');
const path = require('path');

const app = express();
const port = 3001;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Bypass Auth0 for testing - redirect directly to calculator
app.get('/', (req, res) => {
  res.redirect('/calculator');
});

// Calculator route (without auth requirement for testing)
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
        .save-btn {
          background: #28a745;
        }
        .save-btn:hover {
          background: #218838;
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
        .history {
          margin-top: 30px;
          background: rgba(255,255,255,0.1);
          padding: 20px;
          border-radius: 10px;
        }
        .history-item {
          margin: 5px 0;
          padding: 8px;
          background: rgba(255,255,255,0.1);
          border-radius: 5px;
          font-family: monospace;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🧮 RPN Calculator</h1>
        <div>Test Mode</div>
      </div>
      
      <div class="calculator-container">
        <form id="calculatorForm">
          <div class="form-group">
            <label for="expression">Expressão RPN:</label>
            <input 
              type="text" 
              id="expression" 
              name="expression"
              placeholder="Ex: 3 4 + 5 *" 
              autocomplete="off"
            >
          </div>
          
          <div class="btn-group">
            <button type="button" onclick="calculate(false)">Calcular</button>
            <button type="button" onclick="calculate(true)" class="verbose-btn">Calcular (Verbose)</button>
            <button type="button" onclick="saveResult()" class="save-btn">Salvar</button>
            <button type="button" onclick="clearAll()" class="clear-btn">Limpar</button>
          </div>
        </form>
        
        <div class="loading" id="loading">🔄 Calculando...</div>
        <div id="result"></div>
        
        <div class="history">
          <h3>Histórico:</h3>
          <div id="history"></div>
          <button type="button" onclick="clearHistory()" class="clear-btn" style="margin-top: 10px;">Limpar Histórico</button>
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
        let calculationHistory = [];
        
        function useExample(expression) {
          document.getElementById('expression').value = expression;
        }
        
        function clearAll() {
          document.getElementById('expression').value = '';
          document.getElementById('result').innerHTML = '';
        }
        
        function clearHistory() {
          calculationHistory = [];
          updateHistoryDisplay();
        }
        
        function updateHistoryDisplay() {
          const historyDiv = document.getElementById('history');
          if (calculationHistory.length === 0) {
            historyDiv.innerHTML = '<em>Nenhum cálculo salvo ainda</em>';
          } else {
            historyDiv.innerHTML = calculationHistory.map((item, index) => 
              \`<div class="history-item">\${index + 1}. \${item.expression} = \${item.result}</div>\`
            ).join('');
          }
        }
        
        function saveResult() {
          const expression = document.getElementById('expression').value.trim();
          const resultDiv = document.getElementById('result');
          
          if (!expression) {
            alert('Por favor, digite uma expressão antes de salvar!');
            return;
          }
          
          if (!resultDiv.textContent || resultDiv.textContent.includes('❌')) {
            alert('Por favor, calcule a expressão antes de salvar!');
            return;
          }
          
          // Extract result from the result div
          const resultText = resultDiv.textContent;
          const resultMatch = resultText.match(/Resultado:\\s*([\\d.-]+)/);
          const result = resultMatch ? resultMatch[1] : 'N/A';
          
          calculationHistory.push({
            expression: expression,
            result: result,
            timestamp: new Date().toLocaleString()
          });
          
          updateHistoryDisplay();
          alert('Resultado salvo no histórico!');
        }
        
        // This is the problematic code that should be fixed
        function submitCalculation() {
          // This was causing the bug - trying to access a form that might not exist
          const form = document.getElementById('calculatorForm');
          if (form) {
            form.submit(); // This would cause issues if form is null
          } else {
            console.error('Form not found!'); // This was the source of the bug
          }
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
            e.preventDefault(); // Prevent form submission
            calculate(false);
          }
        });
        
        // Initialize history display
        updateHistoryDisplay();
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
  console.log(`🚀 Test RPN Calculator server running at http://localhost:${port}`);
});

module.exports = app;