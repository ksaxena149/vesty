# Vesty App - AWS EC2 Deployment Guide

Complete guide for deploying your Vesty Next.js application on AWS EC2 using Docker containers.

## 🎯 Overview

This deployment method gives you:
- **Full Control**: Complete server access like DigitalOcean droplets
- **Docker Containers**: Isolated, scalable application deployment
- **Production Ready**: SSL, monitoring, backups, and auto-restart
- **Cost Effective**: Pay only for the resources you use

## 📋 Prerequisites

### 1. AWS Account & EC2 Instance
- AWS account with EC2 access
- EC2 instance (recommended: t3.medium or larger)
- Ubuntu 20.04 LTS or Ubuntu 22.04 LTS
- Security group allowing ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

### 2. Domain Setup
- Domain name pointed to your EC2 instance IP
- DNS A record: `yourdomain.com` → `YOUR_EC2_IP`
- Optional: `www.yourdomain.com` → `YOUR_EC2_IP`

### 3. Required Service Accounts
- **Clerk**: Production keys (pk_live_... and sk_live_...)
- **ConvexDB**: Production deployment URL
- **Google AI Studio**: API key
- **AWS S3**: Production bucket with credentials

---

## 🚀 Step 1: Launch AWS EC2 Instance

### 1.1 Create EC2 Instance
1. Go to AWS EC2 Console
2. Click "Launch Instance"
3. **AMI**: Ubuntu Server 22.04 LTS
4. **Instance Type**: t3.medium (minimum) or t3.large (recommended)
5. **Storage**: 20 GB GP3 (minimum)
6. **Security Group**: Create new with these rules:
   ```
   SSH (22)     - Your IP
   HTTP (80)    - 0.0.0.0/0
   HTTPS (443)  - 0.0.0.0/0
   ```

### 1.2 Connect to Your Instance
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@YOUR_EC2_IP

# Update system and create user (if needed)
sudo apt update
sudo adduser vesty
sudo usermod -aG sudo vesty
sudo su - vesty
```

---

## 🔧 Step 2: Initial Server Setup

### 2.1 Run Initial Setup Script
```bash
# Download and run the setup script
curl -fsSL https://raw.githubusercontent.com/yourusername/vesty-app/main/scripts/aws/ec2-setup.sh | bash

# Or if you have the code locally:
chmod +x scripts/aws/ec2-setup.sh
./scripts/aws/ec2-setup.sh
```

### 2.2 Reboot System
```bash
sudo reboot
```

**Wait 2-3 minutes, then reconnect:**
```bash
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
sudo su - vesty
```

---

## 📂 Step 3: Deploy Application Code

### 3.1 Upload Your Code
Choose one of these methods:

**Method A: Git Clone (Recommended)**
```bash
cd /home/vesty
git clone https://github.com/yourusername/vesty-app.git
cd vesty-app
```

**Method B: SCP Upload**
```bash
# From your local machine
scp -i your-key.pem -r /path/to/vesty-app ubuntu@YOUR_EC2_IP:/home/ubuntu/
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
sudo cp -r /home/ubuntu/vesty-app /home/vesty/
sudo chown -R vesty:vesty /home/vesty/vesty-app
```

### 3.2 Configure Environment Variables

You have **3 options** to create your `.env.production` file on the EC2 server:

#### **Option A: Interactive Setup Script (Recommended)**
```bash
cd /home/vesty/vesty-app

# Run interactive environment setup
chmod +x scripts/aws/create-env.sh
./scripts/aws/create-env.sh
```
This script will guide you through setting up all environment variables with validation.

#### **Option B: Manual Creation**
```bash
cd /home/vesty/vesty-app

# Create production environment file (this file is NOT in git for security)
nano .env.production
```

**Fill in your production values:**
```env
# ===========================================
# CLERK AUTHENTICATION (PRODUCTION KEYS!)
# ===========================================
# Get production keys from: https://dashboard.clerk.com
# NOTE: Use pk_live_* and sk_live_* for production
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_your_live_key_here
CLERK_SECRET_KEY=sk_live_your_live_secret_here

# ===========================================
# CONVEX DATABASE (PRODUCTION DEPLOYMENT)
# ===========================================
# Create production deployment at: https://dashboard.convex.dev
NEXT_PUBLIC_CONVEX_URL=https://your-prod-project.convex.cloud

# ===========================================
# GOOGLE AI (GEMINI)
# ===========================================  
GOOGLE_AI_API_KEY=your_google_ai_api_key_here

# ===========================================
# AWS S3 STORAGE (PRODUCTION BUCKET)
# ===========================================
# Create separate production S3 bucket for production
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_production_aws_access_key
AWS_SECRET_ACCESS_KEY=your_production_aws_secret_key
AWS_S3_BUCKET_NAME=vesty-production-bucket

# ===========================================
# APPLICATION CONFIGURATION
# ===========================================
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://yourdomain.com
PORT=3000
HOSTNAME=0.0.0.0
```

#### **Option C: Upload from Local Machine**
```bash
# From your local machine (if you have .env.production locally)
scp -i your-key.pem .env.production ubuntu@YOUR_EC2_IP:/home/ubuntu/
ssh -i your-key.pem ubuntu@YOUR_EC2_IP
sudo cp /home/ubuntu/.env.production /home/vesty/vesty-app/
sudo chown vesty:vesty /home/vesty/vesty-app/.env.production
```

**Important: Secure the environment file**
```bash
# Make sure only you can read the environment file
chmod 600 .env.production

# Verify the file was created correctly
ls -la .env.production
head .env.production
```

### 3.3 Update Domain Configuration
```bash
# Update nginx configuration with your domain
sed -i 's/your-domain.com/yourdomain.com/g' nginx/prod.conf
```

---

## 🚢 Step 4: Deploy Application

### 4.1 Run Deployment Script
```bash
chmod +x scripts/aws/deploy-ec2.sh
./scripts/aws/deploy-ec2.sh
```

This script will:
- Validate all required files
- Build Docker containers  
- Start the application
- Run health checks
- Configure firewall and security

### 4.2 Verify Deployment
```bash
# Check container status
docker-compose -f docker-compose.prod.yml ps

# Test health endpoint
curl http://localhost:3000/api/health

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

Your app should now be running at `http://YOUR_EC2_IP`

---

## 🔒 Step 5: Configure SSL Certificate

### 5.1 Set Up Let's Encrypt SSL
```bash
chmod +x scripts/aws/setup-ssl.sh
./scripts/aws/setup-ssl.sh
```

Follow the prompts:
- Enter your domain name: `yourdomain.com`
- Enter your email address for SSL notifications

### 5.2 Verify HTTPS
```bash
# Test HTTPS
curl -I https://yourdomain.com

# Check certificate
openssl s_client -connect yourdomain.com:443 -servername yourdomain.com < /dev/null
```

Your app is now available at `https://yourdomain.com` 🎉

---

## 🔧 Step 6: Post-Deployment Configuration

### 6.1 Update Service Configurations

**Update Clerk Settings:**
1. Go to Clerk Dashboard → Configure → Domains
2. Add production domain: `https://yourdomain.com`
3. Update redirect URLs

**Update ConvexDB CORS:**
1. Go to ConvexDB Dashboard → Settings
2. Add domain to CORS: `https://yourdomain.com`

**Update S3 CORS:**
```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedOrigins": ["https://yourdomain.com"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

### 6.2 Test All Features
- [ ] User authentication (sign in/sign up)
- [ ] Image upload to S3
- [ ] AI outfit swap functionality  
- [ ] Database operations
- [ ] API endpoints

---

## 📊 Management & Monitoring

### Daily Management Commands
```bash
cd /home/vesty/vesty-app

# View application status
./monitor.sh

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Restart application
docker-compose -f docker-compose.prod.yml restart

# Stop application
docker-compose -f docker-compose.prod.yml down

# Start application
docker-compose -f docker-compose.prod.yml up -d
```

### Updates & Maintenance
```bash
# Update application (pulls latest code)
./update.sh

# Manual backup
./backup.sh

# Renew SSL certificate (runs automatically)
./renew-ssl.sh
```

### Monitoring Resources
```bash
# System resources
htop

# Disk usage
df -h

# Docker stats
docker stats

# Nginx access logs
docker-compose -f docker-compose.prod.yml logs nginx

# Application logs
docker-compose -f docker-compose.prod.yml logs app
```

---

## 🔍 Troubleshooting

### Common Issues

**1. Application Not Starting**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Rebuild containers
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

**2. SSL Certificate Issues**
```bash
# Check certificate status
docker-compose -f docker-compose.prod.yml logs certbot

# Manual certificate renewal
./renew-ssl.sh

# Check domain DNS
dig yourdomain.com
nslookup yourdomain.com
```

**3. Database Connection Issues**
```bash
# Check ConvexDB URL
curl -I https://your-project.convex.cloud

# Verify environment variables
docker-compose -f docker-compose.prod.yml exec app env | grep CONVEX
```

**4. S3 Upload Issues**
```bash
# Test AWS credentials
aws s3 ls s3://your-bucket-name

# Check S3 permissions in AWS Console
# Verify CORS configuration
```

### Log Locations
- Application logs: `docker-compose logs app`
- Nginx logs: `docker-compose logs nginx`
- System logs: `/var/log/syslog`
- Fail2ban logs: `/var/log/fail2ban.log`

---

## 📈 Scaling & Performance

### Vertical Scaling (Upgrade Instance)
1. Stop application: `docker-compose -f docker-compose.prod.yml down`
2. Create AMI snapshot in AWS Console
3. Change instance type (t3.medium → t3.large)
4. Start application: `docker-compose -f docker-compose.prod.yml up -d`

### Horizontal Scaling (Load Balancer)
For high traffic, consider:
- Application Load Balancer (ALB)
- Multiple EC2 instances
- RDS for database (instead of ConvexDB)
- CloudFront CDN

### Performance Optimization
```bash
# Enable Docker buildx cache
export DOCKER_BUILDKIT=1

# Optimize container resources in docker-compose.prod.yml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '0.5'
          memory: 512M
```

---

## 💾 Backup & Recovery

### Automated Backups
- **Daily backups**: Automatically created at 2 AM
- **Retention**: Last 7 backups kept
- **Location**: `/home/vesty/vesty-app/backups/`

### Manual Backup
```bash
./backup.sh
```

### Disaster Recovery
```bash
# Restore from backup
cd /home/vesty/vesty-app/backups
tar -xzf vesty-backup-YYYYMMDD_HHMMSS.tar.gz -C /home/vesty/

# Restart application
cd /home/vesty/vesty-app  
docker-compose -f docker-compose.prod.yml up -d
```

---

## 💰 Cost Optimization

### EC2 Cost Tips
- Use **Reserved Instances** for predictable workloads (up to 75% savings)
- Monitor with **AWS Cost Explorer**
- Set up **billing alerts**
- Stop instance during development (start/stop as needed)

### Storage Optimization
- Use **GP3** volumes (cheaper than GP2)
- Enable **S3 Intelligent Tiering**
- Set up **S3 lifecycle policies** for old images

### Monitoring Costs
```bash
# Check instance costs
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity MONTHLY --metrics BlendedCost
```

---

## 🛡️ Security Checklist

- [x] Firewall configured (UFW)
- [x] Fail2ban enabled  
- [x] SSL/TLS certificate active
- [x] Security headers configured
- [x] Regular security updates
- [x] Private keys secured
- [x] Database access restricted
- [x] API rate limiting enabled

### Security Best Practices
1. **Regular Updates**: `apt update && apt upgrade`
2. **Monitor Logs**: Check fail2ban and access logs
3. **Backup Keys**: Store SSH keys and certificates securely
4. **Environment Variables**: Keep secrets in .env.production only
5. **Access Control**: Use IAM roles instead of root keys where possible

---

## 📞 Support

### Quick Reference
- **Application Directory**: `/home/vesty/vesty-app`
- **Create Environment**: `./scripts/aws/create-env.sh`
- **Deploy App**: `./scripts/aws/deploy-ec2.sh`
- **Setup SSL**: `./scripts/aws/setup-ssl.sh`
- **Logs**: `docker-compose -f docker-compose.prod.yml logs -f`
- **Status**: `./monitor.sh`
- **Update**: `./update.sh`
- **Backup**: `./backup.sh`

### Get Help
- Check application logs first
- Review this documentation  
- Verify service configurations (Clerk, ConvexDB, S3)
- Test network connectivity
- Check AWS Console for resource status

---

**🎉 Congratulations! Your Vesty app is now running on AWS EC2 with Docker!**

Your application is production-ready with:
✅ SSL certificate  
✅ Automatic backups  
✅ Security hardening  
✅ Performance optimization  
✅ Monitoring tools  
✅ Update scripts
