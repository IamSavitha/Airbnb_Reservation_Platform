# Docker & Kubernetes Setup Guide

## Overview

This guide covers the Docker and Kubernetes setup for the Airbnb prototype application.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Kubernetes Cluster                       │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Frontend   │  │   Backend    │  │    MySQL     │     │
│  │   (2 pods)   │  │   (2 pods)   │  │   (1 pod)    │     │
│  │   Port: 80   │  │   Port: 4000 │  │  Port: 3306  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                                │
│         └──────────────────┴───────────┐                   │
│                                         │                   │
│  ┌──────────────┐  ┌──────────────┐   │                   │
│  │  Zookeeper   │  │    Kafka     │   │                   │
│  │   (1 pod)    │  │   (1 pod)    │   │                   │
│  │  Port: 2181  │  │  Port: 9093  │   │                   │
│  └──────────────┘  └──────────────┘   │                   │
│                                         │                   │
│  ┌────────────────────────────────────┐│                   │
│  │     LoadBalancer / Ingress         ││                   │
│  └────────────────────────────────────┘│                   │
└─────────────────────────────────────────────────────────────┘
```

## Prerequisites

### Required Tools

1. **Docker Desktop** (includes Kubernetes)
   ```bash
   # Verify installation
   docker --version
   docker-compose --version
   ```

2. **kubectl** (Kubernetes CLI)
   ```bash
   # Verify installation
   kubectl version --client
   ```

3. **Enable Kubernetes in Docker Desktop**
   - Open Docker Desktop
   - Go to Settings → Kubernetes
   - Check "Enable Kubernetes"
   - Click "Apply & Restart"

## Part 1: Docker Setup

### 1.1 Build Docker Images

```bash
# Build backend image
cd backend
docker build -t airbnb-backend:latest .

# Build frontend image
cd ../frontend
docker build -t airbnb-frontend:latest .
```

### 1.2 Verify Images

```bash
docker images | grep airbnb
```

Expected output:
```
airbnb-backend    latest    ...    ...    ...
airbnb-frontend   latest    ...    ...    ...
```

### 1.3 Run with Docker Compose

```bash
# From project root
docker-compose up -d
```

This will start:
- MySQL (port 3306)
- Zookeeper (port 2181)
- Kafka (port 9092)
- Kafka UI (port 8080)
- Backend (port 4000)
- Frontend (port 3000)

### 1.4 Verify Docker Containers

```bash
docker-compose ps
```

### 1.5 Test Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Kafka UI: http://localhost:8080
- Health Check: http://localhost:4000/health

### 1.6 View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### 1.7 Stop Docker Compose

```bash
docker-compose down

# With volumes
docker-compose down -v
```

## Part 2: Kubernetes Setup

### 2.1 Directory Structure

```
k8s/
├── 00-namespace.yaml          # Namespace definition
├── 01-configmap.yaml          # Configuration
├── 02-secrets.yaml            # Sensitive data
├── 03-mysql-deployment.yaml   # MySQL database
├── 04-kafka-deployment.yaml   # Kafka & Zookeeper
├── 05-backend-deployment.yaml # Backend service
└── 06-frontend-deployment.yaml # Frontend service
```

### 2.2 Deploy to Kubernetes

#### Step 1: Create Namespace

```bash
kubectl apply -f k8s/00-namespace.yaml
```

#### Step 2: Create ConfigMap and Secrets

```bash
kubectl apply -f k8s/01-configmap.yaml
kubectl apply -f k8s/02-secrets.yaml
```

**⚠️ Important**: Update secrets in production!

```bash
# Generate secure secrets
echo -n "your-secure-password" | base64
echo -n "your-session-secret" | base64

# Update k8s/02-secrets.yaml with base64 encoded values
```

#### Step 3: Deploy MySQL

```bash
kubectl apply -f k8s/03-mysql-deployment.yaml
```

Wait for MySQL to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=mysql -n airbnb --timeout=120s
```

#### Step 4: Deploy Kafka

```bash
kubectl apply -f k8s/04-kafka-deployment.yaml
```

Wait for Kafka to be ready:
```bash
kubectl wait --for=condition=ready pod -l app=kafka -n airbnb --timeout=180s
```

#### Step 5: Deploy Backend

```bash
kubectl apply -f k8s/05-backend-deployment.yaml
```

#### Step 6: Deploy Frontend

```bash
kubectl apply -f k8s/06-frontend-deployment.yaml
```

### 2.3 Verify Deployments

```bash
# Check all resources
kubectl get all -n airbnb

# Check pods
kubectl get pods -n airbnb

# Check services
kubectl get services -n airbnb

# Check persistent volume claims
kubectl get pvc -n airbnb

# Check horizontal pod autoscalers
kubectl get hpa -n airbnb
```

### 2.4 View Logs

```bash
# Backend logs
kubectl logs -f deployment/backend -n airbnb

# Frontend logs
kubectl logs -f deployment/frontend -n airbnb

# MySQL logs
kubectl logs -f deployment/mysql -n airbnb

# Kafka logs
kubectl logs -f deployment/kafka -n airbnb
```

### 2.5 Access Services

#### Frontend

```bash
# Get frontend service URL
kubectl get service frontend-service -n airbnb

# For LoadBalancer (Docker Desktop / Minikube)
kubectl port-forward service/frontend-service 3000:80 -n airbnb
```

Then access: http://localhost:3000

#### Backend API

```bash
kubectl port-forward service/backend-service 4000:4000 -n airbnb
```

Then access: http://localhost:4000

#### MySQL (for debugging)

```bash
kubectl port-forward service/mysql-service 3306:3306 -n airbnb
```

#### Kafka UI (deploy separately)

```bash
# Create Kafka UI deployment
kubectl create deployment kafka-ui --image=provectuslabs/kafka-ui:latest -n airbnb

# Expose as service
kubectl expose deployment kafka-ui --port=8080 --target-port=8080 -n airbnb

# Port forward
kubectl port-forward service/kafka-ui 8080:8080 -n airbnb
```

### 2.6 Scaling

#### Manual Scaling

```bash
# Scale backend
kubectl scale deployment backend --replicas=3 -n airbnb

# Scale frontend
kubectl scale deployment frontend --replicas=4 -n airbnb
```

#### Auto-scaling (HPA)

Horizontal Pod Autoscalers are already configured:

- **Backend**: 2-5 replicas (CPU: 70%, Memory: 80%)
- **Frontend**: 2-5 replicas (CPU: 70%, Memory: 80%)

View HPA status:
```bash
kubectl get hpa -n airbnb
```

### 2.7 Update Deployments

```bash
# Update image
kubectl set image deployment/backend backend=airbnb-backend:v2 -n airbnb

# Rollout status
kubectl rollout status deployment/backend -n airbnb

# Rollback if needed
kubectl rollout undo deployment/backend -n airbnb
```

### 2.8 Troubleshooting

#### Pod not starting

```bash
# Describe pod
kubectl describe pod <pod-name> -n airbnb

# Check events
kubectl get events -n airbnb --sort-by='.lastTimestamp'
```

#### Check resource usage

```bash
kubectl top pods -n airbnb
kubectl top nodes
```

#### Execute commands in pod

```bash
# Backend pod
kubectl exec -it deployment/backend -n airbnb -- sh

# MySQL pod
kubectl exec -it deployment/mysql -n airbnb -- mysql -u root -p
```

### 2.9 Clean Up

```bash
# Delete all resources in namespace
kubectl delete namespace airbnb

# Or delete specific resources
kubectl delete -f k8s/
```

## Part 3: Service Communication

### Internal Service URLs

Within the Kubernetes cluster, services communicate using:

- MySQL: `mysql-service:3306`
- Kafka: `kafka-service:9093`
- Backend: `backend-service:4000`
- Frontend: `frontend-service:80`

These are configured in the ConfigMap ([k8s/01-configmap.yaml](../k8s/01-configmap.yaml)).

## Part 4: Resource Allocation

### Backend Service
- Requests: 256Mi RAM, 0.25 CPU
- Limits: 512Mi RAM, 0.5 CPU
- Replicas: 2-5 (auto-scaling)

### Frontend Service
- Requests: 128Mi RAM, 0.1 CPU
- Limits: 256Mi RAM, 0.2 CPU
- Replicas: 2-5 (auto-scaling)

### MySQL
- Requests: 512Mi RAM, 0.25 CPU
- Limits: 1Gi RAM, 0.5 CPU
- Storage: 5Gi PVC

### Kafka
- Requests: 1Gi RAM, 0.5 CPU
- Limits: 2Gi RAM, 1 CPU
- Storage: 5Gi PVC

## Part 5: Health Checks

All services have health checks configured:

### Backend
- **Liveness**: GET /health every 10s (after 60s)
- **Readiness**: GET /health every 5s (after 30s)

### Frontend
- **Liveness**: GET / every 10s (after 30s)
- **Readiness**: GET / every 5s (after 10s)

### MySQL
- **Liveness**: mysqladmin ping every 10s
- **Readiness**: mysqladmin ping every 5s

## Part 6: Testing

### 1. Test Docker Setup

```bash
# Start all services
docker-compose up -d

# Wait for services to be healthy
docker-compose ps

# Test backend health
curl http://localhost:4000/health

# Test frontend
curl http://localhost:3000

# View Kafka UI
open http://localhost:8080
```

### 2. Test Kubernetes Setup

```bash
# Deploy all services
kubectl apply -f k8s/

# Wait for all pods to be ready
kubectl wait --for=condition=ready pod --all -n airbnb --timeout=300s

# Check status
kubectl get pods -n airbnb

# Port forward and test
kubectl port-forward service/backend-service 4000:4000 -n airbnb &
curl http://localhost:4000/health

kubectl port-forward service/frontend-service 3000:80 -n airbnb &
curl http://localhost:3000
```

## Implementation Checklist

- ✅ Dockerized Traveler service (Backend API)
- ✅ Dockerized Owner service (Backend API)
- ✅ Dockerized Property service (Backend API)
- ✅ Dockerized Booking service (Backend API)
- ✅ Dockerized Frontend service
- ✅ Kubernetes deployment for all services
- ✅ Services can communicate with each other
- ✅ Services can scale properly (HPA configured)
- ✅ Persistent storage for MySQL and Kafka
- ✅ Health checks and monitoring
- ✅ ConfigMaps and Secrets for configuration

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

## Next Steps

1. ✅ Docker & Kubernetes - **COMPLETE**
2. ✅ Kafka Integration - **COMPLETE**
3. ⏳ MongoDB Integration - **TODO**
4. ⏳ Redux Frontend - **TODO**
5. ⏳ JMeter Testing - **TODO**

---

**Authors**: Savitha and Jane
**Status**: Docker and Kubernetes setup is complete and ready to deploy. 
