#!/bin/bash

# Vesty App - SSL Certificate Setup with Let's Encrypt
# Run this script after your domain is pointing to your server

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

# Get domain from user
read -p "Enter your domain name (e.g., yourdomain.com): " DOMAIN_NAME
read -p "Enter your email address for SSL certificate: " EMAIL_ADDRESS

if [ -z "$DOMAIN_NAME" ] || [ -z "$EMAIL_ADDRESS" ]; then
    print_error "Domain name and email address are required"
    exit 1
fi

print_status "Setting up SSL certificate for $DOMAIN_NAME..."

# Validate domain is pointing to this server
SERVER_IP=$(curl -s ifconfig.me)
DOMAIN_IP=$(dig +short $DOMAIN_NAME)

if [ "$SERVER_IP" != "$DOMAIN_IP" ]; then
    print_warning "Domain $DOMAIN_NAME does not point to this server ($SERVER_IP)"
    print_warning "Current domain IP: $DOMAIN_IP"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Please update your DNS and try again"
        exit 1
    fi
fi

APP_DIR="/home/$USER/vesty-app"
cd $APP_DIR

# Create necessary directories
mkdir -p ssl/live/$DOMAIN_NAME
mkdir -p nginx/www

# Generate DH parameters for better security
print_status "Generating DH parameters (this may take a while)..."
if [ ! -f "ssl/dhparam.pem" ]; then
    openssl dhparam -out ssl/dhparam.pem 2048
fi

# Update nginx configuration with the actual domain
print_status "Updating nginx configuration..."
sed -i "s/your-domain.com/$DOMAIN_NAME/g" nginx/prod.conf
sed -i "s/your-email@example.com/$EMAIL_ADDRESS/g" docker-compose.prod.yml

# Stop nginx temporarily for initial certificate
print_status "Stopping nginx for initial certificate generation..."
docker-compose -f docker-compose.prod.yml stop nginx

# Get initial certificate
print_status "Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    -v $(pwd)/ssl:/etc/letsencrypt \
    -v $(pwd)/nginx/www:/var/www/certbot \
    -p 80:80 \
    certbot/certbot certonly \
    --standalone \
    --email $EMAIL_ADDRESS \
    --agree-tos \
    --no-eff-email \
    -d $DOMAIN_NAME

# Check if certificate was created
if [ ! -f "ssl/live/$DOMAIN_NAME/fullchain.pem" ]; then
    print_error "SSL certificate generation failed"
    exit 1
fi

print_success "SSL certificate generated successfully!"

# Restart services with SSL
print_status "Restarting services with SSL configuration..."
docker-compose -f docker-compose.prod.yml up -d

# Wait for services to start
sleep 10

# Test HTTPS
print_status "Testing HTTPS connection..."
if curl -k -f https://localhost/health &> /dev/null; then
    print_success "HTTPS is working!"
else
    print_warning "HTTPS test failed, but the certificate is installed"
fi

# Create certificate renewal script
print_status "Creating certificate renewal script..."
cat > renew-ssl.sh << 'EOF'
#!/bin/bash
# SSL Certificate Renewal Script

cd /home/$USER/vesty-app

# Renew certificate
docker-compose -f docker-compose.prod.yml run --rm certbot renew

# Reload nginx
docker-compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo "SSL certificate renewal completed"
EOF

chmod +x renew-ssl.sh

# Set up automatic renewal
print_status "Setting up automatic SSL renewal..."
(crontab -l 2>/dev/null; echo "0 3 * * 0 $APP_DIR/renew-ssl.sh") | crontab -

print_success "SSL setup completed successfully!"
echo ""
print_status "Your application is now available at:"
echo "- HTTP:  http://$DOMAIN_NAME (redirects to HTTPS)"
echo "- HTTPS: https://$DOMAIN_NAME"
echo ""
print_status "SSL certificate details:"
echo "- Domain: $DOMAIN_NAME"
echo "- Email: $EMAIL_ADDRESS"
echo "- Auto-renewal: Enabled (runs weekly on Sunday at 3 AM)"
echo ""
print_status "Manual renewal command: $APP_DIR/renew-ssl.sh"
