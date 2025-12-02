# Production Deployment Guide

This guide covers best practices for deploying Family Tracker in a production environment.

## Prerequisites

- A server with Docker and Docker Compose
- A domain name (recommended)
- SSL/TLS certificate (Let's Encrypt recommended)
- Basic knowledge of Linux server administration

## Deployment Options

### Option 1: Docker Compose (Recommended)

This is the easiest way to deploy Family Tracker.

#### Step 1: Server Setup

1. Update your server:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Docker and Docker Compose:
   ```bash
   curl -fsSL https://get.docker.com -o get-docker.sh
   sudo sh get-docker.sh
   sudo apt install docker-compose -y
   ```

3. Create a user for the application:
   ```bash
   sudo adduser familytracker
   sudo usermod -aG docker familytracker
   ```

#### Step 2: Application Setup

1. Clone the repository:
   ```bash
   su - familytracker
   git clone <your-repo-url>
   cd Family-Tracker
   ```

2. Create production environment file:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Configure environment variables:
   ```env
   PORT=8080
   POSTGRES_DB=family_tracker
   POSTGRES_USER=familytracker
   POSTGRES_PASSWORD=<generate-strong-password>
   JWT_SECRET=<generate-random-string>
   ADMIN_EMAIL=admin@yourdomain.com
   ADMIN_PASSWORD=<generate-strong-password>
   ADMIN_NAME=Administrator
   CORS_ORIGINS=https://yourdomain.com
   ```

4. Generate secure secrets:
   ```bash
   # Generate JWT secret
   openssl rand -base64 32

   # Generate strong password
   openssl rand -base64 24
   ```

#### Step 3: Start Services

```bash
docker-compose up -d
```

Verify services are running:
```bash
docker-compose ps
```

View logs:
```bash
docker-compose logs -f
```

### Option 2: Reverse Proxy with Nginx

For production, use Nginx as a reverse proxy with SSL.

#### Step 1: Install Nginx

```bash
sudo apt install nginx certbot python3-certbot-nginx -y
```

#### Step 2: Configure Nginx

Create configuration file:
```bash
sudo nano /etc/nginx/sites-available/familytracker
```

Add configuration:
```nginx
# HTTP - redirect to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL configuration (will be added by certbot)

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
    }

    # Increase max body size for location updates
    client_max_body_size 10M;
}
```

#### Step 3: Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/familytracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### Step 4: Setup SSL with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts to:
- Enter email address
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended)

Auto-renewal is configured automatically. Test it:
```bash
sudo certbot renew --dry-run
```

## Security Hardening

### 1. Firewall Configuration

```bash
# Install UFW
sudo apt install ufw

# Default policies
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH (important!)
sudo ufw allow ssh

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### 2. Database Security

The database is only accessible from within the Docker network by default. Keep it that way.

### 3. Environment Variables

Never commit `.env` files to version control.

### 4. Regular Updates

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd Family-Tracker
docker-compose pull
docker-compose up -d
```

### 5. Backup Strategy

Create automated backups:

```bash
# Create backup script
nano ~/backup-familytracker.sh
```

Add:
```bash
#!/bin/bash
BACKUP_DIR="/home/familytracker/backups"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup database
docker exec family-tracker-db pg_dump -U familytracker family_tracker > $BACKUP_DIR/db_$DATE.sql

# Backup environment file
cp /home/familytracker/Family-Tracker/.env $BACKUP_DIR/env_$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "db_*.sql" -mtime +7 -delete
find $BACKUP_DIR -name "env_*" -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable and schedule:
```bash
chmod +x ~/backup-familytracker.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /home/familytracker/backup-familytracker.sh
```

## Monitoring

### 1. Health Checks

The application includes health check endpoints:
- Backend: `http://localhost:8080/api/health`
- Docker health checks are configured automatically

### 2. Log Management

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

Configure log rotation in Docker Compose:
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

### 3. Resource Monitoring

Monitor resource usage:
```bash
# System resources
htop

# Docker stats
docker stats

# Disk usage
docker system df
```

## Performance Optimization

### 1. Database Optimization

Regular maintenance:
```bash
# Vacuum database
docker exec family-tracker-db psql -U familytracker -d family_tracker -c "VACUUM ANALYZE;"
```

### 2. Frontend Caching

The Nginx configuration includes caching headers for static assets.

### 3. Connection Pooling

PostgreSQL connection pooling is configured in the backend (max: 20 connections).

## Updating

### Update Application

```bash
cd Family-Tracker

# Pull latest changes
git pull

# Rebuild containers
docker-compose down
docker-compose build
docker-compose up -d

# Verify
docker-compose ps
docker-compose logs -f
```

### Rollback

If something goes wrong:
```bash
# Stop containers
docker-compose down

# Checkout previous version
git checkout <previous-commit-hash>

# Rebuild
docker-compose build
docker-compose up -d
```

## Troubleshooting

### Services won't start

```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart

# Full restart
docker-compose down
docker-compose up -d
```

### Database connection errors

```bash
# Check database status
docker-compose ps postgres

# Check database logs
docker-compose logs postgres

# Verify environment variables
cat .env
```

### WebSocket connection issues

- Ensure Nginx WebSocket configuration is correct
- Check firewall allows connections
- Verify SSL certificate is valid

### High memory usage

```bash
# Restart services
docker-compose restart

# Check Docker stats
docker stats

# Clean up Docker
docker system prune -a
```

## Best Practices

1. **Always use HTTPS** in production
2. **Strong passwords** for all accounts
3. **Regular backups** (automated daily)
4. **Monitor logs** regularly
5. **Keep system updated** (OS, Docker, application)
6. **Use firewall** to restrict access
7. **Monitor resource usage** to prevent issues
8. **Test backups** regularly
9. **Document changes** you make
10. **Have a rollback plan**

## Support

For deployment issues:
1. Check application logs
2. Review this guide
3. Check GitHub issues
4. Open a new issue with details

## Additional Resources

- [Docker documentation](https://docs.docker.com/)
- [Nginx documentation](https://nginx.org/en/docs/)
- [Let's Encrypt documentation](https://letsencrypt.org/docs/)
- [PostgreSQL documentation](https://www.postgresql.org/docs/)
