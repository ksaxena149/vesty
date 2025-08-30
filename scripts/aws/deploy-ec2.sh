#!/bin/bash

# Vesty App - AWS EC2 Deployment Script
# Run this script on your EC2 instance after initial setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root"
    exit 1
fi

print_status "Starting Vesty App deployment on AWS EC2..."

# Update system
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker if not installed
if ! command -v docker &> /dev/null; then
    print_status "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
    print_success "Docker installed successfully"
else
    print_success "Docker is already installed"
fi

# Install Docker Compose if not installed
if ! command -v docker-compose &> /dev/null; then
    print_status "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose is already installed"
fi

# Install other dependencies
print_status "Installing additional dependencies..."
sudo apt install -y git curl htop ufw fail2ban

# Configure firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw --force enable

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create application directory
APP_DIR="/home/$USER/vesty-app"
if [ ! -d "$APP_DIR" ]; then
    print_status "Creating application directory..."
    mkdir -p $APP_DIR
fi

cd $APP_DIR

# Check if this is the first deployment
if [ ! -f "docker-compose.prod.yml" ]; then
    print_warning "This appears to be the first deployment."
    print_status "Please ensure you have:"
    echo "1. Uploaded your application code to this directory"
    echo "2. Created and configured .env.production file"
    echo "3. Updated nginx/prod.conf with your domain name"
    echo ""
    read -p "Have you completed the above steps? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_warning "Please complete the setup and run this script again."
        exit 1
    fi
fi

# Validate required files
print_status "Validating deployment files..."
REQUIRED_FILES=("Dockerfile" "docker-compose.prod.yml" ".env.production" "nginx/prod.conf")
for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        print_error "Required file missing: $file"
        exit 1
    fi
done

print_success "All required files found"

# Build and start containers
print_status "Building Docker containers..."
docker-compose -f docker-compose.prod.yml build --no-cache

print_status "Starting application..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for application to start
print_status "Waiting for application to start..."
sleep 30

# Health check
print_status "Performing health check..."
if curl -f http://localhost:3000/api/health &> /dev/null; then
    print_success "Application is running successfully!"
else
    print_error "Application health check failed"
    print_status "Checking container logs..."
    docker-compose -f docker-compose.prod.yml logs
    exit 1
fi

# Display status
print_success "Deployment completed successfully!"
echo ""
print_status "Application Status:"
docker-compose -f docker-compose.prod.yml ps

echo ""
print_status "Next steps:"
echo "1. Configure SSL certificates (run scripts/aws/setup-ssl.sh)"
echo "2. Update your DNS to point to this server"
echo "3. Test your application at http://$(curl -s ifconfig.me)"
echo ""
print_status "Useful commands:"
echo "- View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "- Restart app: docker-compose -f docker-compose.prod.yml restart"
echo "- Stop app: docker-compose -f docker-compose.prod.yml down"
echo "- Update app: git pull && docker-compose -f docker-compose.prod.yml up -d --build"

print_success "Vesty App deployment completed!"
