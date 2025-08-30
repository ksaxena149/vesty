# Database setup script for Windows PowerShell
Write-Host "🚀 Setting up Vesty Database..." -ForegroundColor Green

# Check if Docker is running
try {
    docker ps | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
}
catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

# Start PostgreSQL container
Write-Host "🐳 Starting PostgreSQL container..." -ForegroundColor Blue
docker-compose up -d postgres

# Wait for database to be ready
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
$maxAttempts = 30
$attempt = 0

do {
    $attempt++
    Start-Sleep -Seconds 2
    $isReady = docker exec vesty-postgres pg_isready -U vesty_user -d vesty_db
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database is ready!" -ForegroundColor Green
        break
    }
    Write-Host "⏳ Attempt $attempt/$maxAttempts..." -ForegroundColor Yellow
} while ($attempt -lt $maxAttempts)

if ($attempt -eq $maxAttempts) {
    Write-Host "❌ Database failed to start after $maxAttempts attempts" -ForegroundColor Red
    exit 1
}

Write-Host "🎉 Database setup complete!" -ForegroundColor Green
Write-Host "📊 PostgreSQL is running on: localhost:5432" -ForegroundColor Cyan
Write-Host "🔧 PgAdmin is available at: http://localhost:5050" -ForegroundColor Cyan
Write-Host "   Email: admin@vesty.dev" -ForegroundColor Gray
Write-Host "   Password: admin123" -ForegroundColor Gray
