#!/bin/bash

# Pokémon SaaS Shopping Bot Setup Script
echo "🚀 Setting up Pokémon SaaS Shopping Bot..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js version: $(node -v)"

# Check if Redis is installed
if ! command -v redis-server &> /dev/null; then
    echo "⚠️  Redis is not installed. Installing Redis..."
    
    # Detect OS and install Redis
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            brew install redis
        else
            echo "❌ Homebrew is not installed. Please install Redis manually."
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        sudo apt-get update
        sudo apt-get install redis-server -y
    else
        echo "❌ Unsupported OS. Please install Redis manually."
        exit 1
    fi
fi

echo "✅ Redis is available"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating environment file..."
    cp env.example .env.local
    echo "⚠️  Please update .env.local with your actual configuration values"
fi

# Create logs directory
mkdir -p logs

# Install Playwright browsers
echo "🎭 Installing Playwright browsers..."
npx playwright install --with-deps

# Type check
echo "🔍 Running type check..."
npm run type-check

# Lint check
echo "🧹 Running linter..."
npm run lint

echo "✅ Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Update .env.local with your configuration"
echo "2. Set up your Supabase project"
echo "3. Configure your Stripe account"
echo "4. Start Redis: redis-server"
echo "5. Start the development server: npm run dev"
echo "6. Start the worker service: npm run worker"
echo ""
echo "📚 For detailed setup instructions, see the README.md file"
