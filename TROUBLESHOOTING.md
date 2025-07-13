# Troubleshooting Guide - RPN Calculator

This guide helps resolve common issues users may encounter with the RPN Calculator platform.

## 🔧 Common Problems and Solutions

### 1. Authentication Issues

**Problem**: "Login required" or Auth0 errors  
**Symptoms**: Cannot access calculator, redirected to login page repeatedly  
**Solution**:
- Ensure `.env` file is properly configured with Auth0 credentials
- Check that Auth0 application settings match your configuration
- Verify network connectivity to Auth0 services

### 2. Calculation Errors

**Problem**: "Erro: Divisão por zero"  
**Cause**: Attempting to divide by zero  
**Solution**: Check your expression for division operations with zero as divisor

**Problem**: "Erro: Operandos insuficientes para operador"  
**Cause**: Not enough numbers before an operator  
**Solution**: Ensure each operator has sufficient operands (2 for +, -, *, /, ^)

**Problem**: "Erro: Expressão mal formada"  
**Cause**: Expression leaves multiple values on stack  
**Solution**: Verify your RPN expression is complete and properly formatted

### 3. Input Format Issues

**Problem**: "Expressão contém caracteres inválidos"  
**Cause**: Using unsupported characters in expression  
**Solution**: Use only:
- Numbers (integers and decimals): `1`, `3.14`, `-5`
- Operators: `+`, `-`, `*`, `/`, `^`
- Spaces to separate tokens

**Problem**: "Token inválido"  
**Cause**: Malformed number or unrecognized operator  
**Solution**: Check number format and ensure all operators are supported

### 4. Web Interface Issues

**Problem**: Server won't start  
**Solution**:
```bash
# Check Node.js version (14+ required)
node --version

# Reinstall dependencies
npm install

# Check for compilation errors
gcc -o rpn_calculator RPN_calculator.c -lm
```

**Problem**: Calculator not responding  
**Solution**:
- Check browser console for JavaScript errors
- Verify server is running on correct port
- Clear browser cache and reload page

### 5. Compilation Issues

**Problem**: "gcc command not found"  
**Solution**: Install GCC compiler
```bash
# Ubuntu/Debian
sudo apt update && sudo apt install gcc

# macOS (install Xcode command line tools)
xcode-select --install

# Windows (install MinGW)
# Download from https://mingw-w64.org/
```

**Problem**: "Math library linking error"  
**Solution**: Always include `-lm` flag when compiling
```bash
gcc -o rpn_calculator RPN_calculator.c -lm
```

## 📚 RPN Expression Examples

### Basic Operations
- `3 4 +` → 7 (3 + 4)
- `10 3 -` → 7 (10 - 3)
- `6 2 *` → 12 (6 × 2)
- `8 4 /` → 2 (8 ÷ 4)
- `2 3 ^` → 8 (2³)

### Complex Expressions
- `5 1 2 + 4 * + 3 -` → 14 (5 + ((1 + 2) × 4) - 3)
- `15 7 1 1 + - / 3 * 2 1 1 + + -` → 5

### Common Mistakes
❌ `3 + 4` (infix notation)  
✅ `3 4 +` (RPN notation)

❌ `3 4 + +` (missing operand)  
✅ `3 4 + 5 +` (proper RPN)

## 🔍 Debug Mode

Use verbose mode to see step-by-step evaluation:
- **Web Interface**: Click "Calcular (Verbose)" button
- **Command Line**: Add `--verbose` flag
- **Interactive Mode**: Choose option 2

## 📞 Getting Help

If problems persist:
1. Check this troubleshooting guide
2. Verify your RPN expression format
3. Test with simple expressions first
4. Use verbose mode to debug complex expressions
5. Check browser console for web interface issues

## 🛠️ System Requirements

- **C Compiler**: GCC 4.8+ or Clang 3.4+
- **Node.js**: Version 14+ (for web interface)
- **Operating System**: Linux, macOS, Windows (with MinGW)
- **Memory**: Minimal (< 1MB)
- **Network**: Required for Auth0 authentication