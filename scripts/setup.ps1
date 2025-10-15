# Pokémon SaaS Shopping Bot Setup Script (PowerShell)
Write-Host "🚀 Setting up Pokémon SaaS Shopping Bot..." -ForegroundColor Green

# Check if Node.js is installed
try {
    $nodeVersion = node -v
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed. Please install Node.js 18+ first." -ForegroundColor Red
    exit 1
}

# Check Node.js version
$versionNumber = [int]($nodeVersion -replace 'v(\d+)\..*', '$1')
if ($versionNumber -lt 18) {
    Write-Host "❌ Node.js version 18+ is required. Current version: $nodeVersion" -ForegroundColor Red
    exit 1
}

# Check if Redis is available (try to connect)
try {
    $redisTest = redis-cli ping 2>$null
    if ($redisTest -eq "PONG") {
        Write-Host "✅ Redis is running" -ForegroundColor Green
    } else {
        throw "Redis not responding"
    }
} catch {
    Write-Host "⚠️  Redis is not running. Please start Redis server:" -ForegroundColor Yellow
    Write-Host "   - Using Docker: docker run -d -p 6379:6379 redis:alpine" -ForegroundColor Cyan
    Write-Host "   - Or install Redis for Windows" -ForegroundColor Cyan
}

# Install dependencies
Write-Host "📦 Installing dependencies..." -ForegroundColor Blue
npm install

# Create environment file if it doesn't exist
if (!(Test-Path ".env.local")) {
    Write-Host "📝 Creating environment file..." -ForegroundColor Blue
    Copy-Item "env.example" ".env.local"
    Write-Host "⚠️  Please update .env.local with your actual configuration values" -ForegroundColor Yellow
}

# Create logs directory
if (!(Test-Path "logs")) {
    New-Item -ItemType Directory -Path "logs"
}

# Install Playwright browsers
Write-Host "🎭 Installing Playwright browsers..." -ForegroundColor Blue
npx playwright install --with-deps

# Type check
Write-Host "🔍 Running type check..." -ForegroundColor Blue
npm run type-check

# Lint check
Write-Host "🧹 Running linter..." -ForegroundColor Blue
npm run lint

Write-Host "✅ Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Update .env.local with your configuration" -ForegroundColor White
Write-Host "2. Set up your Supabase project" -ForegroundColor White
Write-Host "3. Configure your Stripe account" -ForegroundColor White
Write-Host "4. Start Redis server" -ForegroundColor White
Write-Host "5. Start the development server: npm run dev" -ForegroundColor White
Write-Host "6. Start the worker service: npm run worker" -ForegroundColor White
Write-Host ""
Write-Host "📚 For detailed setup instructions, see the README.md file" -ForegroundColor Cyan
