const { spawn } = require('child_process');
const path = require('path');

/**
 * RPN Calculator service that interfaces with the C executable
 */
class RPNCalculatorService {
  constructor() {
    this.calculatorPath = path.join(__dirname, 'rpn_calculator');
  }

  /**
   * Validate RPN expression format
   */
  validateExpression(expression) {
    if (!expression || typeof expression !== 'string') {
      throw new Error('Expression must be a non-empty string');
    }

    // Remove extra whitespace and split tokens
    const tokens = expression.trim().split(/\s+/);
    
    if (tokens.length === 0) {
      throw new Error('Expression cannot be empty');
    }

    // Basic validation - check for valid tokens
    const validOperators = ['+', '-', '*', '/', '^'];
    let operandCount = 0;
    let operatorCount = 0;

    for (const token of tokens) {
      if (validOperators.includes(token)) {
        operatorCount++;
      } else if (!isNaN(parseFloat(token))) {
        operandCount++;
      } else {
        throw new Error(`Invalid token: ${token}`);
      }
    }

    // Basic RPN validation - should have at least one operand and proper balance
    if (operandCount === 0) {
      throw new Error('Expression must contain at least one number');
    }

    if (operatorCount >= operandCount) {
      throw new Error('Invalid RPN expression: too many operators');
    }

    return true;
  }

  /**
   * Evaluate RPN expression using JavaScript implementation
   * This is a fallback/alternative to the C executable
   */
  evaluateRPNInMemory(expression) {
    this.validateExpression(expression);

    const stack = [];
    const tokens = expression.trim().split(/\s+/);

    for (const token of tokens) {
      if (!isNaN(parseFloat(token))) {
        // It's a number
        stack.push(parseFloat(token));
      } else {
        // It's an operator
        if (stack.length < 2) {
          throw new Error(`Insufficient operands for operator '${token}'`);
        }

        const b = stack.pop();
        const a = stack.pop();
        let result;

        switch (token) {
          case '+':
            result = a + b;
            break;
          case '-':
            result = a - b;
            break;
          case '*':
            result = a * b;
            break;
          case '/':
            if (b === 0) {
              throw new Error('Division by zero');
            }
            result = a / b;
            break;
          case '^':
            result = Math.pow(a, b);
            break;
          default:
            throw new Error(`Unknown operator: ${token}`);
        }

        stack.push(result);
      }
    }

    if (stack.length !== 1) {
      throw new Error('Malformed expression: elements remaining in stack');
    }

    return stack[0];
  }

  /**
   * Calculate RPN expression
   * Returns a promise that resolves with the result
   */
  async calculate(expression, verbose = false) {
    try {
      // Validate the expression first
      this.validateExpression(expression);

      // Use in-memory calculation as it's more reliable for a web service
      const result = this.evaluateRPNInMemory(expression);

      return {
        expression: expression.trim(),
        result: result,
        steps: verbose ? this.generateSteps(expression) : null,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Calculation error: ${error.message}`);
    }
  }

  /**
   * Generate step-by-step calculation for verbose mode
   */
  generateSteps(expression) {
    const steps = [];
    const stack = [];
    const tokens = expression.trim().split(/\s+/);

    for (const token of tokens) {
      if (!isNaN(parseFloat(token))) {
        const num = parseFloat(token);
        stack.push(num);
        steps.push({
          action: 'push',
          token: token,
          value: num,
          stack: [...stack]
        });
      } else {
        if (stack.length >= 2) {
          const b = stack.pop();
          const a = stack.pop();
          let result;

          switch (token) {
            case '+': result = a + b; break;
            case '-': result = a - b; break;
            case '*': result = a * b; break;
            case '/': result = a / b; break;
            case '^': result = Math.pow(a, b); break;
          }

          stack.push(result);
          steps.push({
            action: 'operation',
            operator: token,
            operands: [a, b],
            result: result,
            stack: [...stack]
          });
        }
      }
    }

    return steps;
  }

  /**
   * Get calculator information
   */
  getInfo() {
    return {
      name: 'RPN Calculator Service',
      version: '1.0.0',
      supportedOperators: ['+', '-', '*', '/', '^'],
      description: 'Reverse Polish Notation calculator with JWT authentication',
      features: [
        'Basic arithmetic operations',
        'Exponentiation',
        'Step-by-step verbose mode',
        'Input validation',
        'Error handling'
      ]
    };
  }
}

module.exports = RPNCalculatorService;