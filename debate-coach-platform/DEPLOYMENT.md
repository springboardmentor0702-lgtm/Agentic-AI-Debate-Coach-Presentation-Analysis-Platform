# 🚀 Production Deployment Guide

This guide covers deploying the Debate Coach Platform to production environments.

## Table of Contents
1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Docker Deployment](#docker-deployment)
3. [Kubernetes Deployment](#kubernetes-deployment)
4. [AWS Deployment](#aws-deployment)
5. [GCP Deployment](#gcp-deployment)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Best Practices](#security-best-practices)

---

## Pre-Deployment Checklist

- [ ] Environment variables configured for production
- [ ] Database backups enabled
- [ ] HTTPS/SSL certificates configured
- [ ] Secrets stored in a secure vault (AWS Secrets Manager, Google Secret Manager, etc.)
- [ ] Firewall rules configured
- [ ] CDN configured for static assets
- [ ] Log aggregation service configured
- [ ] Monitoring and alerting configured
- [ ] Disaster recovery plan documented
- [ ] Database migrations tested

---

## Docker Deployment

### Step 1: Build Production Images

```bash
# From project root
docker build -f backend/Dockerfile -t debate-coach-api:latest ./backend
docker build -f frontend/Dockerfile -t debate-coach-web:latest ./frontend
```

### Step 2: Push to Container Registry

```bash
# AWS ECR
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com
docker tag debate-coach-api:latest 123456789.dkr.ecr.us-east-1.amazonaws.com/debate-coach-api:latest
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/debate-coach-api:latest

# Google Container Registry
docker tag debate-coach-api:latest gcr.io/PROJECT_ID/debate-coach-api:latest
docker push gcr.io/PROJECT_ID/debate-coach-api:latest

# Docker Hub
docker tag debate-coach-api:latest YOUR_USERNAME/debate-coach-api:latest
docker push YOUR_USERNAME/debate-coach-api:latest
```

### Step 3: Deploy with Docker Compose (Non-Production Use Case)

```bash
# Copy production env file
cp .env.production .env

# Deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Step 4: Verify Deployment

```bash
# Check service health
curl http://localhost:8000/api/v1/health

# Check frontend
curl http://localhost:3000

# View logs
docker compose logs -f backend
docker compose logs -f frontend
```

---

## Kubernetes Deployment

### Prerequisites
- `kubectl` configured for your cluster
- Container images pushed to a registry
- `helm` installed (optional, for easier management)

### Step 1: Create Kubernetes Manifests

```bash
# Create namespace
kubectl create namespace debate-coach

# Create secrets
kubectl create secret generic database-credentials \
  --from-literal=username=debate_user \
  --from-literal=password=YOUR_SECURE_PASSWORD \
  -n debate-coach

kubectl create secret generic app-secrets \
  --from-literal=secret_key=YOUR_JWT_SECRET \
  --from-literal=openai_api_key=YOUR_OPENAI_KEY \
  -n debate-coach

# Create config maps
kubectl create configmap app-config \
  --from-literal=database_url=postgresql://debate_user@postgres:5432/debate_coach \
  --from-literal=api_base_url=https://api.yourdomain.com/api/v1 \
  --from-literal=ai_mock_mode=false \
  -n debate-coach
```

### Step 2: Create Deployment Manifests

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debate-coach-api
  namespace: debate-coach
spec:
  replicas: 3
  selector:
    matchLabels:
      app: debate-coach-api
  template:
    metadata:
      labels:
        app: debate-coach-api
    spec:
      containers:
      - name: api
        image: YOUR_REGISTRY/debate-coach-api:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: database_url
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: secret_key
        - name: OPENAI_API_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: openai_api_key
        - name: AI_MOCK_MODE
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: ai_mock_mode
        livenessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /api/v1/health
            port: 8000
          initialDelaySeconds: 10
          periodSeconds: 5
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: debate-coach-api-service
  namespace: debate-coach
spec:
  selector:
    app: debate-coach-api
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 8000
    targetPort: 8000
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: debate-coach-web
  namespace: debate-coach
spec:
  replicas: 2
  selector:
    matchLabels:
      app: debate-coach-web
  template:
    metadata:
      labels:
        app: debate-coach-web
    spec:
      containers:
      - name: web
        image: YOUR_REGISTRY/debate-coach-web:latest
        ports:
        - containerPort: 3000
        env:
        - name: NEXT_PUBLIC_API_BASE_URL
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: api_base_url
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "250m"
---
apiVersion: v1
kind: Service
metadata:
  name: debate-coach-web-service
  namespace: debate-coach
spec:
  selector:
    app: debate-coach-web
  type: LoadBalancer
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
```

### Step 3: Deploy

```bash
# Apply manifests
kubectl apply -f k8s/deployment.yaml

# Verify deployment
kubectl get deployments -n debate-coach
kubectl get services -n debate-coach
kubectl get pods -n debate-coach

# View logs
kubectl logs -f deployment/debate-coach-api -n debate-coach
```

---

## AWS Deployment

### Using ECS (Elastic Container Service)

```bash
# Create ECR repositories
aws ecr create-repository --repository-name debate-coach-api --region us-east-1
aws ecr create-repository --repository-name debate-coach-web --region us-east-1

# Build and push images
docker build -f backend/Dockerfile -t 123456789.dkr.ecr.us-east-1.amazonaws.com/debate-coach-api:latest ./backend
docker push 123456789.dkr.ecr.us-east-1.amazonaws.com/debate-coach-api:latest

# Create RDS instance for PostgreSQL
aws rds create-db-instance \
  --db-instance-identifier debate-coach-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username debate_user \
  --master-user-password YOUR_SECURE_PASSWORD \
  --allocated-storage 20

# Create ECS cluster
aws ecs create-cluster --cluster-name debate-coach

# Create task definitions and services (use AWS Console or CLI)
```

### Using Elastic Beanstalk

```bash
# Initialize Elastic Beanstalk application
eb init -p "Node.js 18 running on 64bit Amazon Linux 2" debate-coach-web

# Create environment
eb create debate-coach-prod

# Deploy
eb deploy

# View logs
eb logs
```

---

## GCP Deployment

### Using Cloud Run

```bash
# Build image for Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/debate-coach-api ./backend

# Deploy backend
gcloud run deploy debate-coach-api \
  --image gcr.io/PROJECT_ID/debate-coach-api \
  --platform managed \
  --region us-central1 \
  --set-env-vars DATABASE_URL=postgresql://... \
  --set-env-vars JWT_SECRET_KEY=... \
  --memory 512Mi \
  --cpu 2

# Deploy frontend
gcloud builds submit --tag gcr.io/PROJECT_ID/debate-coach-web ./frontend
gcloud run deploy debate-coach-web \
  --image gcr.io/PROJECT_ID/debate-coach-web \
  --platform managed \
  --region us-central1 \
  --set-env-vars NEXT_PUBLIC_API_BASE_URL=... \
  --memory 256Mi \
  --cpu 1
```

### Using GKE (Google Kubernetes Engine)

```bash
# Create cluster
gcloud container clusters create debate-coach \
  --num-nodes=3 \
  --machine-type=n1-standard-1 \
  --region=us-central1

# Get credentials
gcloud container clusters get-credentials debate-coach --region=us-central1

# Deploy using kubectl (see Kubernetes section above)
```

---

## Monitoring & Logging

### Structured Logging

```python
# backend/app/core/logging.py should include:
import logging
import json

class StructuredFormatter(logging.Formatter):
    def format(self, record):
        log_data = {
            'timestamp': self.formatTime(record),
            'level': record.levelname,
            'message': record.getMessage(),
            'logger': record.name,
        }
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)
        return json.dumps(log_data)
```

### Log Aggregation

**Using ELK Stack (Elasticsearch, Logstash, Kibana):**

```bash
# Configure Logstash to collect logs
# backend/logstash.conf
input {
  tcp {
    port => 5000
    codec => json
  }
}

output {
  elasticsearch {
    hosts => ["elasticsearch:9200"]
    index => "debate-coach-%{+YYYY.MM.dd}"
  }
}
```

**Using CloudWatch (AWS):**

```python
# Configure CloudWatch logging
import boto3
import watchtower

logger = logging.getLogger(__name__)
handler = watchtower.CloudWatchLogHandler(
    log_group='debate-coach-platform'
)
logger.addHandler(handler)
```

**Using Stackdriver Logging (GCP):**

```python
# Configure Google Cloud Logging
from google.cloud import logging as cloud_logging

client = cloud_logging.Client()
handler = client.get_default_handler()
logging.root.addHandler(handler)
```

### Application Performance Monitoring

**Using New Relic:**

```python
# backend/app/main.py
import newrelic.agent
newrelic.agent.initialize('newrelic.ini')

@app.middleware("http")
async def add_newrelic_middleware(request, call_next):
    # Middleware configuration
    pass
```

---

## Security Best Practices

### 1. Environment Variables

✅ **DO:**
- Use environment variables for all secrets
- Store secrets in AWS Secrets Manager / Google Secret Manager / HashiCorp Vault
- Rotate secrets regularly

❌ **DON'T:**
- Commit `.env` files to version control
- Hardcode API keys or passwords
- Use the same secrets for dev and prod

### 2. Database Security

```sql
-- Create secure PostgreSQL user
CREATE USER debate_user WITH PASSWORD 'strong_random_password';
GRANT CONNECT ON DATABASE debate_coach TO debate_user;
GRANT USAGE ON SCHEMA public TO debate_user;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO debate_user;

-- Enable SSL connections
ssl = on
```

### 3. API Security

```python
# backend/app/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,  # Explicitly list allowed domains
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
    max_age=3600,
)

# Add rate limiting
from slowapi import Limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter

# Add security headers
@app.middleware("http")
async def add_security_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    return response
```

### 4. Password Security

```python
# Use bcrypt with proper salt rounds (default: 12)
from app.core.security import hash_password, verify_password

password_hash = hash_password(password)  # Bcrypt with 12 rounds
is_valid = verify_password(password, password_hash)
```

### 5. HTTPS/TLS

```bash
# Using Let's Encrypt with Certbot
sudo certbot certonly --standalone -d api.yourdomain.com
sudo certbot certonly --standalone -d yourdomain.com

# Auto-renewal
sudo certbot renew --dry-run
```

### 6. JWT Token Security

```python
# backend/app/core/security.py
# Use short-lived access tokens (15-30 minutes)
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Use longer refresh tokens (7 days), but require re-authentication
REFRESH_TOKEN_EXPIRE_DAYS = 7

# Store refresh tokens in secure HTTP-only cookies
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    max_age=604800,  # 7 days
    secure=True,  # HTTPS only
    httponly=True,  # Not accessible via JavaScript
    samesite="strict"
)
```

### 7. Database Backups

```bash
# Automated PostgreSQL backups
#!/bin/bash
BACKUP_DIR="/backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)
pg_dump -U debate_user -h localhost debate_coach | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Retain last 30 days of backups
find $BACKUP_DIR -mtime +30 -delete

# Upload to S3
aws s3 cp $BACKUP_DIR/backup_$DATE.sql.gz s3://your-backup-bucket/debate-coach/
```

### 8. Dependency Updates

```bash
# Regular security updates
pip install --upgrade -r requirements.txt

# Check for vulnerabilities
pip install safety
safety check

# Similar for Node.js
npm audit
npm update
```

---

## Disaster Recovery Plan

### RTO (Recovery Time Objective): 1 hour
### RPO (Recovery Point Objective): 15 minutes

### Recovery Procedures

1. **Database Corruption**
   - Restore from latest backup
   - Verify data integrity
   - Run migration scripts

2. **Service Outage**
   - Check logs for errors
   - Scale up replicas
   - Route traffic to healthy instances

3. **Security Breach**
   - Rotate all API keys and secrets
   - Review access logs
   - Patch vulnerabilities immediately
   - Notify affected users

---

**Last Updated**: 2026-08-31  
**Status**: Production-Ready
