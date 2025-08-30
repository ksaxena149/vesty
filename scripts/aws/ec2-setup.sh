#!/bin/bash

# Vesty App - AWS EC2 Initial Setup Script
# Run this script ONCE on a fresh EC2 instance

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

print_status "========================================="
print_status "  Vesty App - AWS EC2 Initial Setup"
print_status "========================================="

# Check if running as root
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root"
    print_warning "Create a user account and run as that user"
    exit 1
fi

# System information
print_status "System Information:"
echo "- OS: $(lsb_release -d | cut -f2)"
echo "- Kernel: $(uname -r)"
echo "- Architecture: $(uname -m)"
echo "- User: $USER"
echo "- Home: $HOME"
echo ""

# Update system packages
print_status "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install essential packages
print_status "Installing essential packages..."
sudo apt install -y \
    curl \
    wget \
    git \
    unzip \
    htop \
    nano \
    ufw \
    fail2ban \
    software-properties-common \
    apt-transport-https \
    ca-certificates \
    gnupg \
    lsb-release

# Install Docker
print_status "Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker $USER
    print_success "Docker installed successfully"
else
    print_success "Docker is already installed"
fi

# Install Docker Compose (standalone)
print_status "Installing Docker Compose..."
if ! command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
    sudo curl -L "https://github.com/docker/compose/releases/download/${DOCKER_COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed successfully"
else
    print_success "Docker Compose is already installed"
fi

# Configure firewall
print_status "Configuring firewall..."
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
print_success "Firewall configured"

# Configure fail2ban
print_status "Configuring fail2ban..."
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Create fail2ban configuration for nginx
sudo tee /etc/fail2ban/jail.d/nginx.conf > /dev/null << 'EOF'
[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true

[nginx-noproxy]
enabled = true
EOF

sudo systemctl restart fail2ban
print_success "Fail2ban configured"

# Install AWS CLI
print_status "Installing AWS CLI..."
if ! command -v aws &> /dev/null; then
    curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
    unzip awscliv2.zip
    sudo ./aws/install
    rm -rf aws awscliv2.zip
    print_success "AWS CLI installed successfully"
else
    print_success "AWS CLI is already installed"
fi

# Create application directory structure
print_status "Creating application directory structure..."
APP_DIR="$HOME/vesty-app"
mkdir -p $APP_DIR
mkdir -p $APP_DIR/logs
mkdir -p $APP_DIR/backups
mkdir -p $APP_DIR/ssl

# Set up log rotation
print_status "Setting up log rotation..."
sudo tee /etc/logrotate.d/vesty-app > /dev/null << EOF
$APP_DIR/logs/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 644 $USER $USER
    postrotate
        docker-compose -f $APP_DIR/docker-compose.prod.yml restart nginx || true
    endscript
}
EOF

# Create systemd service for auto-start
print_status "Creating systemd service..."
sudo tee /etc/systemd/system/vesty-app.service > /dev/null << EOF
[Unit]
Description=Vesty App Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=$APP_DIR
ExecStart=/usr/local/bin/docker-compose -f docker-compose.prod.yml up -d
ExecStop=/usr/local/bin/docker-compose -f docker-compose.prod.yml down
TimeoutStartSec=0
User=$USER

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable vesty-app.service

# Create backup script
print_status "Creating backup script..."
cat > $APP_DIR/backup.sh << 'EOF'
#!/bin/bash
# Vesty App Backup Script

BACKUP_DIR="$HOME/vesty-app/backups"
DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="vesty-backup-$DATE.tar.gz"

echo "Creating backup: $BACKUP_FILE"

# Create backup
tar -czf "$BACKUP_DIR/$BACKUP_FILE" \
    --exclude='node_modules' \
    --exclude='.next' \
    --exclude='logs/*.log' \
    -C "$HOME" vesty-app/

# Keep only last 7 backups
cd "$BACKUP_DIR"
ls -t vesty-backup-*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup completed: $BACKUP_FILE"
echo "Available backups:"
ls -lah vesty-backup-*.tar.gz
EOF

chmod +x $APP_DIR/backup.sh

# Set up automatic backups
print_status "Setting up automatic backups..."
(crontab -l 2>/dev/null; echo "0 2 * * * $APP_DIR/backup.sh") | crontab -

# Create update script
print_status "Creating update script..."
cat > $APP_DIR/update.sh << 'EOF'
#!/bin/bash
# Vesty App Update Script

cd $HOME/vesty-app

echo "Pulling latest changes..."
git pull

echo "Backing up current deployment..."
$HOME/vesty-app/backup.sh

echo "Rebuilding and restarting containers..."
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

echo "Waiting for application to start..."
sleep 30

echo "Testing application health..."
if curl -f http://localhost:3000/api/health; then
    echo "Update completed successfully!"
else
    echo "Update failed! Check logs:"
    docker-compose -f docker-compose.prod.yml logs
fi
EOF

chmod +x $APP_DIR/update.sh

# System optimization
print_status "Applying system optimizations..."

# Increase file limits
echo "* soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "* hard nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "root soft nofile 65536" | sudo tee -a /etc/security/limits.conf
echo "root hard nofile 65536" | sudo tee -a /etc/security/limits.conf

# Optimize sysctl settings
sudo tee -a /etc/sysctl.conf > /dev/null << 'EOF'
# Network optimizations
net.core.rmem_max = 16777216
net.core.wmem_max = 16777216
net.ipv4.tcp_rmem = 4096 12582912 16777216
net.ipv4.tcp_wmem = 4096 12582912 16777216
net.ipv4.tcp_slow_start_after_idle = 0
net.core.netdev_max_backlog = 5000

# File system optimizations  
fs.file-max = 65536
vm.swappiness = 10
EOF

sudo sysctl -p

# Create monitoring script
print_status "Creating monitoring script..."
cat > $APP_DIR/monitor.sh << 'EOF'
#!/bin/bash
# Vesty App Monitoring Script

echo "========================================="
echo "Vesty App Status - $(date)"
echo "========================================="

echo "System Resources:"
echo "- CPU: $(top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1"%"}')"
echo "- Memory: $(free -h | awk 'NR==2{printf "%.1f%%", $3*100/$2 }')"
echo "- Disk: $(df -h / | awk 'NR==2 {print $5}')"

echo ""
echo "Docker Containers:"
docker-compose -f docker-compose.prod.yml ps

echo ""
echo "Application Health:"
curl -s http://localhost:3000/api/health | jq '.' 2>/dev/null || echo "Health check failed"

echo ""
echo "Recent Logs (last 20 lines):"
docker-compose -f docker-compose.prod.yml logs --tail=20
EOF

chmod +x $APP_DIR/monitor.sh

# Print completion message
print_success "========================================="
print_success "  EC2 Initial Setup Completed!"
print_success "========================================="
echo ""
print_status "Next Steps:"
echo "1. Upload your application code to: $APP_DIR"
echo "2. Configure your .env.production file"
echo "3. Run: ./scripts/aws/deploy-ec2.sh"
echo "4. Set up SSL: ./scripts/aws/setup-ssl.sh"
echo ""
print_status "Useful Commands:"
echo "- Monitor app: $APP_DIR/monitor.sh"
echo "- Update app: $APP_DIR/update.sh"
echo "- Backup app: $APP_DIR/backup.sh"
echo "- View logs: docker-compose -f docker-compose.prod.yml logs -f"
echo ""
print_status "Application Directory: $APP_DIR"
print_status "Automatic backups: Daily at 2 AM"
print_status "Service auto-start: Enabled"
echo ""
print_warning "IMPORTANT: Please reboot the system to apply all changes:"
print_warning "sudo reboot"
