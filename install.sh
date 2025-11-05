#!/bin/bash

echo "🚀 Installing Property Dashboard..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo ""

# Navigate to project directory
cd "$(dirname "$0")"

# Install dependencies
echo "📦 Installing dependencies..."
npm install express cors node-fetch@2

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Installation complete!"
    echo ""
    echo "To start the server, run:"
    echo "  npm start"
    echo ""
    echo "Then open your browser to:"
    echo "  http://localhost:3000"
else
    echo ""
    echo "⚠️  npm install failed. Trying alternative method..."
    echo ""

    # Try with --legacy-peer-deps
    npm install --legacy-peer-deps express cors node-fetch@2

    if [ $? -eq 0 ]; then
        echo "✅ Installation complete (with legacy peer deps)!"
    else
        echo "❌ Installation failed."
        echo ""
        echo "Please try manually:"
        echo "  cd property-dashboard"
        echo "  sudo chown -R $(whoami) ~/.npm"
        echo "  npm install"
    fi
fi
