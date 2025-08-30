#!/bin/bash

# Vesty App - Create Production Environment File
# Run this script on your EC2 server to create .env.production

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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
print_status "  Vesty App - Environment Setup"
print_status "========================================="

# Check if running in the correct directory
if [ ! -f "docker-compose.prod.yml" ]; then
    print_error "This script must be run from the vesty-app directory"
    print_error "Expected to find docker-compose.prod.yml in current directory"
    exit 1
fi

# Check if .env.production already exists
if [ -f ".env.production" ]; then
    print_warning ".env.production already exists!"
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_status "Keeping existing .env.production file"
        exit 0
    fi
    cp .env.production .env.production.backup.$(date +%Y%m%d_%H%M%S)
    print_status "Created backup of existing .env.production"
fi

# Interactive environment variable collection
print_status "Setting up production environment variables..."
echo ""
print_status "You'll need the following ready:"
echo "1. Clerk production keys (pk_live_* and sk_live_*)"
echo "2. ConvexDB production URL"
echo "3. Google AI API key"
echo "4. AWS S3 production credentials"
echo "5. Your domain name"
echo ""

read -p "Press Enter to continue or Ctrl+C to cancel..."

# Collect environment variables
echo ""
print_status "Collecting environment variables..."

# Clerk
echo "📧 CLERK AUTHENTICATION"
read -p "Clerk Publishable Key (pk_live_...): " CLERK_PUBLISHABLE_KEY
read -p "Clerk Secret Key (sk_live_...): " CLERK_SECRET_KEY

# ConvexDB
echo ""
print_status "🗃️  CONVEX DATABASE"
read -p "ConvexDB Production URL (https://...convex.cloud): " CONVEX_URL

# Google AI
echo ""
print_status "🤖 GOOGLE AI"
read -p "Google AI API Key: " GOOGLE_AI_KEY

# AWS S3
echo ""
print_status "☁️  AWS S3"
read -p "AWS Region (default: us-east-1): " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}
read -p "AWS Access Key ID: " AWS_ACCESS_KEY
read -p "AWS Secret Access Key: " AWS_SECRET_KEY
read -p "S3 Bucket Name (production): " S3_BUCKET

# Domain
echo ""
print_status "🌐 APPLICATION"
read -p "Your domain (https://yourdomain.com): " APP_URL

# Validate inputs
print_status "Validating inputs..."
if [[ ! $CLERK_PUBLISHABLE_KEY =~ ^pk_live_ ]]; then
    print_warning "Clerk publishable key should start with 'pk_live_' for production"
fi

if [[ ! $CLERK_SECRET_KEY =~ ^sk_live_ ]]; then
    print_warning "Clerk secret key should start with 'sk_live_' for production"
fi

if [[ ! $CONVEX_URL =~ ^https://.*\.convex\.cloud$ ]]; then
    print_warning "ConvexDB URL format should be 'https://project.convex.cloud'"
fi

if [[ ! $APP_URL =~ ^https:// ]]; then
    print_warning "App URL should start with 'https://' for production"
fi

# Create .env.production file
print_status "Creating .env.production file..."

cat > .env.production << EOF
# Vesty App - Production Environment Variables
# Generated on: $(date)

# ===========================================
# CLERK AUTHENTICATION
# ===========================================
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$CLERK_PUBLISHABLE_KEY
CLERK_SECRET_KEY=$CLERK_SECRET_KEY

# ===========================================
# CONVEX DATABASE
# ===========================================
NEXT_PUBLIC_CONVEX_URL=$CONVEX_URL

# ===========================================
# GOOGLE AI (GEMINI)
# ===========================================
GOOGLE_AI_API_KEY=$GOOGLE_AI_KEY

# ===========================================
# AWS S3 STORAGE
# ===========================================
AWS_REGION=$AWS_REGION
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_KEY
AWS_S3_BUCKET_NAME=$S3_BUCKET

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=$APP_URL
PORT=3000
HOSTNAME=0.0.0.0
EOF

# Secure the file
chmod 600 .env.production

print_success ".env.production file created successfully!"
print_status "File permissions set to 600 (readable only by you)"

# Validate the file
echo ""
print_status "Environment file summary:"
echo "- Clerk keys: $(echo $CLERK_PUBLISHABLE_KEY | cut -c1-20)..."
echo "- ConvexDB: $CONVEX_URL"
echo "- AWS Region: $AWS_REGION"
echo "- S3 Bucket: $S3_BUCKET"
echo "- App URL: $APP_URL"

echo ""
print_status "Next steps:"
echo "1. Review .env.production file: nano .env.production"
echo "2. Deploy application: ./scripts/aws/deploy-ec2.sh"
echo "3. Set up SSL: ./scripts/aws/setup-ssl.sh"

print_success "Environment setup completed!"
