#!/bin/bash
# Setup script for RPN Calculator Web Application

echo "🔧 Setting up RPN Calculator Web Application..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Check if GCC is installed
if ! command -v gcc &> /dev/null; then
    echo "❌ GCC not found. Please install GCC first."
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo "✅ GCC found: $(gcc --version | head -1)"

# Compile C program
echo "🔨 Compiling RPN calculator..."
gcc -o rpn_calculator RPN_calculator.c -lm

if [ $? -eq 0 ]; then
    echo "✅ C program compiled successfully"
else
    echo "❌ Failed to compile C program"
    exit 1
fi

# Install Node.js dependencies
echo "📦 Installing Node.js dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "📝 Please edit .env file with your Auth0 credentials before running the application."
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "Next steps:"
echo "1. Edit .env file with your Auth0 credentials"
echo "2. Run 'npm start' to start the application"
echo "3. Open http://localhost:3000 in your browser"
echo ""
echo "For detailed configuration instructions, see README_WEB.md"