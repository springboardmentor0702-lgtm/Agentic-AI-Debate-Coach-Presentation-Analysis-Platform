# Cloud & Container Deployment Guide
## Agentic AI Debate Coach & Presentation Analysis Platform (LOGOS.AI)

This guide documents the deployment architectures for Docker Compose, AWS (ECS / App Runner), Azure (Container Apps), and Google Cloud Run.

---

## 1. Local & On-Premises Deployment via Docker Compose

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) (v24+)
- [Docker Compose](https://docs.docker.com/compose/) (v2.20+)

### Quick Start
```bash
# 1. Clone the repository (Local)
git clone https://github.com/springboardmentor0702-lgtm/Agentic-AI-Debate-Coach-Presentation-Analysis-Platform.git
cd Agentic-AI-Debate-Coach-Presentation-Analysis-Platform

# 2. Build and launch all 4 microservices
docker-compose up --build -d

# 3. Check service health
docker-compose ps
```

### Endpoints
- **Frontend Web UI**: `http://localhost:3000`
- **Backend API & Swagger Docs**: `http://localhost:8000/docs`
- **PostgreSQL Database**: `localhost:5432` (`logos_ai_db`)
- **MongoDB Transcripts Store**: `localhost:27017` (`logos_ai_transcripts`)

---

## 2. Cloud Deployment on AWS (Amazon Web Services)

### Architecture
- **Compute**: Amazon Elastic Container Service (ECS) with AWS Fargate (Serverless Containers).
- **Databases**:
  - Relational: Amazon RDS for PostgreSQL 16.
  - Document Store: Amazon DocumentDB (MongoDB-compatible) or MongoDB Atlas on AWS.
- **Networking**: AWS Application Load Balancer (ALB) with SSL/TLS terminating via ACM.

### Step-by-Step Deployment
```bash
# 1. Login to Amazon Elastic Container Registry (ECR)
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com

# 2. Build & Tag Docker Images
docker build -t logos-backend -f Dockerfile.backend .
docker tag logos-backend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/logos-backend:latest
docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/logos-backend:latest

docker build -t logos-frontend -f Dockerfile.frontend .
docker tag logos-frontend:latest <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/logos-frontend:latest
docker push <aws_account_id>.dkr.ecr.us-east-1.amazonaws.com/logos-frontend:latest

# 3. Register ECS Task Definition
aws ecs register-task-definition --cli-input-json file://deploy/aws-ecs-task-definition.json

# 4. Create / Update ECS Service
aws ecs create-service \
    --cluster logos-production-cluster \
    --service-name logos-platform-service \
    --task-definition logos-ai-platform \
    --desired-count 2 \
    --launch-type FARGATE \
    --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-logos-ecs],assignPublicIp=ENABLED}"
```

---

## 3. Cloud Deployment on Microsoft Azure

### Architecture
- **Compute**: Azure Container Apps (managed serverless Kubernetes environment).
- **Databases**:
  - Azure Database for PostgreSQL (Flexible Server).
  - Azure Cosmos DB for MongoDB (vCore or Request Units).
- **Container Registry**: Azure Container Registry (ACR).

### Deployment Commands
```bash
# 1. Login to Azure
az login

# 2. Create Resource Group & ACR
az group create --name rg-logos-ai-prod --location eastus
az acr create --resource-group rg-logos-ai-prod --name acrlogosai --sku Basic --admin-enabled true

# 3. Build in ACR
az acr build --registry acrlogosai --image logos-backend:latest -f Dockerfile.backend .
az acr build --registry acrlogosai --image logos-frontend:latest -f Dockerfile.frontend .

# 4. Deploy Azure Container App
az containerapp env create --name env-logos-ai --resource-group rg-logos-ai-prod --location eastus
az containerapp create \
    --name app-logos-backend \
    --resource-group rg-logos-ai-prod \
    --environment env-logos-ai \
    --image acrlogosai.azurecr.io/logos-backend:latest \
    --target-port 8000 \
    --ingress external \
    --query properties.configuration.ingress.fqdn
```

---

## 4. Security & Compliance Checklist

- [x] **JWT Token Encryption**: Cryptographically signed tokens with SHA-256 and configurable TTL expiration.
- [x] **Role-Based Access Control (RBAC)**: Strict permission boundaries for `Learner`, `Debate Coach`, `Educator`, and `Administrator`.
- [x] **Password Protection**: Passwords hashed using bcrypt.
- [x] **Data Isolation**: Structured metadata in PostgreSQL, freeform debate transcripts & audit logs in MongoDB.
- [x] **Zero-Leak Environment**: API keys managed securely via environment variables (`GROQ_API_KEY`, `GEMINI_API_KEY`, `SECRET_KEY`).
