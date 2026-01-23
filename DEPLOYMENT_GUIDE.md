# Mood Melodies - Deployment Guide

## 📋 Prerequisites

### Required Tools
- **Node.js**: 18+ (for signaling server)
- **Python**: 3.11+ (for translation service)
- **Docker**: 20.10+ (for containerization)
- **Redis**: 7+ (for caching)
- **React Native CLI**: Latest (for mobile app)

### Cloud Requirements
- **Compute**: 
  - Signaling: 2x t3.small (AWS) or equivalent
  - Translation: 1x g4dn.xlarge (AWS) with GPU or 2x CPU instances
- **Storage**: Minimal (models cached on instance)
- **Network**: Load balancer, public IPs

## 🚀 Deployment Options

### Option 1: Local Development

#### 1. Clone Repository
```bash
git clone https://github.com/yourorg/MoodMelodies.git
cd MoodMelodies
```

#### 2. Start Backend Services with Docker Compose
```bash
cd infrastructure
docker-compose up -d
```

This starts:
- Redis (port 6379)
- Translation Service (port 7777)
- Signaling Server (port 3000)
- TURN Server (optional, port 3478)

#### 3. Verify Services
```bash
# Check health
curl http://localhost:3000/health
curl http://localhost:7777/health

# Check logs
docker-compose logs -f signaling
docker-compose logs -f translation
```

#### 4. Run Mobile App

**Android:**
```bash
cd MoodMelodies
npm install
npx react-native run-android
```

**iOS:**
```bash
cd MoodMelodies
npm install
cd ios && pod install && cd ..
npx react-native run-ios
```

#### 5. Configure API URLs
Edit `MoodMelodies/src/constants/config.ts`:
```typescript
export const API_CONFIG = {
  SIGNALING_URL: 'http://10.0.2.2:3000', // Android emulator
  // SIGNALING_URL: 'http://localhost:3000', // iOS simulator
  TRANSLATION_URL: 'http://10.0.2.2:7777',
};
```

---

### Option 2: Production Deployment (AWS)

#### Architecture Overview
```
Internet
   │
   ├─► Application Load Balancer (ALB)
   │      ├─► Target Group: Signaling (Port 3000)
   │      └─► Target Group: Translation (Port 7777)
   │
   ├─► EC2 Auto Scaling Group (Signaling)
   │      └─► 2-4 instances (t3.small)
   │
   ├─► EC2 Instances (Translation)
   │      └─► 1-2 instances (g4dn.xlarge with GPU)
   │
   ├─► ElastiCache (Redis)
   │      └─► Single node or cluster
   │
   └─► EC2 Instance (TURN Server)
          └─► 1 instance (t3.small)
```

#### Step 1: Setup VPC and Security Groups

```bash
# Create VPC
aws ec2 create-vpc --cidr-block 10.0.0.0/16

# Create subnets
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.1.0/24 # Public
aws ec2 create-subnet --vpc-id vpc-xxx --cidr-block 10.0.2.0/24 # Private

# Security Group for Signaling
aws ec2 create-security-group \
  --group-name moodmelodies-signaling \
  --description "Signaling server security group" \
  --vpc-id vpc-xxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-xxx \
  --protocol tcp \
  --port 3000 \
  --cidr 0.0.0.0/0

# Security Group for Translation
aws ec2 create-security-group \
  --group-name moodmelodies-translation \
  --description "Translation service security group" \
  --vpc-id vpc-xxx

aws ec2 authorize-security-group-ingress \
  --group-id sg-yyy \
  --protocol tcp \
  --port 7777 \
  --source-group sg-xxx # Only from ALB
```

#### Step 2: Deploy Redis (ElastiCache)

```bash
aws elasticache create-cache-cluster \
  --cache-cluster-id moodmelodies-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --engine-version 7.0
```

#### Step 3: Build and Push Docker Images

```bash
# Build images
cd signaling-server
docker build -t moodmelodies/signaling:latest .

cd ../translation-service
docker build -t moodmelodies/translation:latest .

# Push to ECR (or Docker Hub)
aws ecr create-repository --repository-name moodmelodies/signaling
aws ecr create-repository --repository-name moodmelodies/translation

docker tag moodmelodies/signaling:latest xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/signaling:latest
docker push xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/signaling:latest

docker tag moodmelodies/translation:latest xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/translation:latest
docker push xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/translation:latest
```

#### Step 4: Launch EC2 Instances

**User Data Script for Signaling:**
```bash
#!/bin/bash
yum update -y
yum install -y docker
service docker start
usermod -a -G docker ec2-user

# Pull and run signaling server
docker pull xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/signaling:latest
docker run -d \
  --name signaling \
  --restart unless-stopped \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e REDIS_HOST=<elasticache-endpoint> \
  -e REDIS_PORT=6379 \
  xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/signaling:latest
```

**User Data Script for Translation (GPU):**
```bash
#!/bin/bash
# Install NVIDIA drivers and Docker
amazon-linux-extras install -y docker nvidia-driver
service docker start

# Install nvidia-docker
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.repo | tee /etc/yum.repos.d/nvidia-docker.repo
yum install -y nvidia-docker2
systemctl restart docker

# Pull and run translation service
docker pull xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/translation:latest
docker run -d \
  --name translation \
  --restart unless-stopped \
  --runtime=nvidia \
  -p 7777:7777 \
  -e FLASK_ENV=production \
  -e USE_GPU=true \
  -e REDIS_HOST=<elasticache-endpoint> \
  xxxx.dkr.ecr.us-east-1.amazonaws.com/moodmelodies/translation:latest
```

#### Step 5: Setup Load Balancer

```bash
# Create ALB
aws elbv2 create-load-balancer \
  --name moodmelodies-alb \
  --subnets subnet-xxx subnet-yyy \
  --security-groups sg-zzz

# Create target groups
aws elbv2 create-target-group \
  --name moodmelodies-signaling \
  --protocol HTTP \
  --port 3000 \
  --vpc-id vpc-xxx \
  --health-check-path /health

aws elbv2 create-target-group \
  --name moodmelodies-translation \
  --protocol HTTP \
  --port 7777 \
  --vpc-id vpc-xxx \
  --health-check-path /health

# Register instances
aws elbv2 register-targets \
  --target-group-arn arn:aws:elasticloadbalancing:... \
  --targets Id=i-xxx Id=i-yyy

# Create listeners
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTP \
  --port 80 \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...
```

#### Step 6: Configure Domain and SSL

```bash
# Get ACM certificate
aws acm request-certificate \
  --domain-name moodmelodies.app \
  --subject-alternative-names *.moodmelodies.app \
  --validation-method DNS

# Add HTTPS listener
aws elbv2 create-listener \
  --load-balancer-arn arn:aws:elasticloadbalancing:... \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=arn:aws:acm:... \
  --default-actions Type=forward,TargetGroupArn=arn:aws:elasticloadbalancing:...

# Route53 DNS
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch '{
    "Changes": [{
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "signaling.moodmelodies.app",
        "Type": "A",
        "AliasTarget": {
          "HostedZoneId": "Z...",
          "DNSName": "moodmelodies-alb-xxx.us-east-1.elb.amazonaws.com",
          "EvaluateTargetHealth": true
        }
      }
    }]
  }'
```

#### Step 7: Deploy TURN Server

```bash
# Launch t3.small instance
# Install Coturn
sudo apt-get update
sudo apt-get install -y coturn

# Configure /etc/turnserver.conf
listening-port=3478
fingerprint
lt-cred-mech
use-auth-secret
static-auth-secret=YOUR_SECRET_KEY
realm=moodmelodies.app
total-quota=100
stale-nonce=600
cert=/etc/letsencrypt/live/turn.moodmelodies.app/fullchain.pem
pkey=/etc/letsencrypt/live/turn.moodmelodies.app/privkey.pem

# Start Coturn
sudo systemctl enable coturn
sudo systemctl start coturn
```

---

### Option 3: Kubernetes Deployment

#### Step 1: Create Kubernetes Manifests

See `infrastructure/kubernetes/` for complete manifests:
- `signaling-deployment.yaml`
- `translation-deployment.yaml`
- `redis-deployment.yaml`
- `turn-deployment.yaml`
- `ingress.yaml`
- `configmap.yaml`

#### Step 2: Deploy to Kubernetes

```bash
# Create namespace
kubectl create namespace moodmelodies

# Apply ConfigMap
kubectl apply -f infrastructure/kubernetes/configmap.yaml -n moodmelodies

# Deploy Redis
kubectl apply -f infrastructure/kubernetes/redis-deployment.yaml -n moodmelodies

# Deploy Translation Service
kubectl apply -f infrastructure/kubernetes/translation-deployment.yaml -n moodmelodies

# Deploy Signaling Server
kubectl apply -f infrastructure/kubernetes/signaling-deployment.yaml -n moodmelodies

# Setup Ingress
kubectl apply -f infrastructure/kubernetes/ingress.yaml -n moodmelodies

# Verify
kubectl get pods -n moodmelodies
kubectl get svc -n moodmelodies
```

#### Step 3: Setup Horizontal Pod Autoscaling

```bash
# Signaling Server HPA
kubectl autoscale deployment signaling \
  --cpu-percent=70 \
  --min=2 \
  --max=10 \
  -n moodmelodies

# Translation Service HPA
kubectl autoscale deployment translation \
  --cpu-percent=80 \
  --min=1 \
  --max=5 \
  -n moodmelodies
```

---

## 📱 Mobile App Deployment

### Android

#### 1. Build Release APK
```bash
cd MoodMelodies/android
./gradlew assembleRelease
```

APK location: `android/app/build/outputs/apk/release/app-release.apk`

#### 2. Build AAB (for Play Store)
```bash
./gradlew bundleRelease
```

AAB location: `android/app/build/outputs/bundle/release/app-release.aab`

#### 3. Sign the App
```bash
# Generate keystore
keytool -genkeypair -v -keystore my-release-key.keystore \
  -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Add to android/gradle.properties
MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
MYAPP_RELEASE_KEY_ALIAS=my-key-alias
MYAPP_RELEASE_STORE_PASSWORD=***
MYAPP_RELEASE_KEY_PASSWORD=***
```

#### 4. Upload to Play Store
- Go to Google Play Console
- Create app listing
- Upload AAB
- Complete store listing and privacy policy
- Submit for review

### iOS

#### 1. Configure Xcode Project
```bash
cd MoodMelodies/ios
open MoodMelodies.xcworkspace
```

- Set Bundle Identifier
- Configure Signing & Capabilities
- Set Version and Build number

#### 2. Build for Release
```bash
# Archive
xcodebuild -workspace MoodMelodies.xcworkspace \
  -scheme MoodMelodies \
  -configuration Release \
  -archivePath build/MoodMelodies.xcarchive \
  archive

# Export IPA
xcodebuild -exportArchive \
  -archivePath build/MoodMelodies.xcarchive \
  -exportOptionsPlist exportOptions.plist \
  -exportPath build
```

#### 3. Upload to App Store Connect
```bash
xcrun altool --upload-app \
  -f build/MoodMelodies.ipa \
  -u your@email.com \
  -p your-app-specific-password
```

---

## 🔧 Configuration Management

### Environment Variables

**Signaling Server:**
```bash
NODE_ENV=production
PORT=3000
REDIS_HOST=<redis-host>
REDIS_PORT=6379
JWT_SECRET=<secret>
ALLOWED_ORIGINS=https://app.moodmelodies.com
```

**Translation Service:**
```bash
FLASK_ENV=production
PORT=7777
REDIS_HOST=<redis-host>
USE_GPU=true
MODEL_CACHE_DIR=/app/models
```

**Mobile App:**
Update `src/constants/config.ts` with production URLs.

---

## 📊 Monitoring & Logging

### Logging Setup

**CloudWatch (AWS):**
```bash
# Install CloudWatch agent
sudo yum install -y amazon-cloudwatch-agent

# Configure
sudo /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -s \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/config.json
```

**Application Logs:**
- Signaling: `/app/logs/combined.log`
- Translation: Stdout (captured by Docker)

### Metrics

**Custom Metrics to Track:**
- Active concurrent calls
- Translation latency (p50, p95, p99)
- Cache hit rate
- WebRTC connection success rate
- Server CPU/memory usage

**Prometheus Setup:**
```bash
# Both services expose /metrics endpoint
# Configure Prometheus scrape targets:
scrape_configs:
  - job_name: 'signaling'
    static_configs:
      - targets: ['signaling:3000']
  - job_name: 'translation'
    static_configs:
      - targets: ['translation:7777']
```

---

## 🔐 Security Checklist

- [ ] Enable HTTPS/TLS on all endpoints
- [ ] Set strong JWT secrets
- [ ] Configure CORS properly
- [ ] Use Redis AUTH
- [ ] Enable VPC security groups
- [ ] Implement rate limiting
- [ ] Add DDoS protection (CloudFlare)
- [ ] Regular security updates
- [ ] Audit logs enabled
- [ ] Data encryption at rest

---

## 💰 Cost Optimization

### Estimated Monthly Costs (1000 Active Users)

| Service | Configuration | Monthly Cost |
|---------|--------------|--------------|
| Signaling EC2 | 2x t3.small | $30 |
| Translation EC2 | 1x g4dn.xlarge (50% util) | $150 |
| Redis ElastiCache | 1x cache.t3.micro | $12 |
| TURN Server | 1x t3.small | $15 |
| Load Balancer | ALB | $20 |
| Data Transfer | ~100GB | $10 |
| **Total** | | **$237/month** |

**Per User Cost: $0.24/month**

### Cost Reduction Strategies

1. **Use Spot Instances** for translation (50-70% savings)
2. **Auto-scaling** during off-peak hours
3. **Reserved Instances** for predictable workloads
4. **CloudFlare CDN** for static assets (free tier)
5. **Optimize model size** (use quantized models)

---

## 🚨 Troubleshooting

### Common Issues

**Issue: Translation service slow**
```bash
# Check GPU utilization
nvidia-smi

# Check model loading
docker logs translation | grep "Model loaded"

# Increase workers
docker run -e WORKERS=4 ...
```

**Issue: Signaling connection fails**
```bash
# Check WebSocket connection
curl -i -N \
  -H "Connection: Upgrade" \
  -H "Upgrade: websocket" \
  http://signaling.moodmelodies.app

# Check Redis connection
redis-cli -h <redis-host> ping
```

**Issue: High latency**
```bash
# Check translation latency
curl -X POST http://translation:7777/api/v1/translate \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","source_lang":"en","target_lang":"hi"}' \
  -w "@curl-format.txt"

# Check network latency
ping -c 10 translation.moodmelodies.app
```

---

## 📚 Next Steps

1. Setup monitoring and alerts
2. Configure backup and disaster recovery
3. Implement CI/CD pipeline
4. Add more languages
5. Optimize for scale
6. Conduct load testing

For detailed technical documentation, see `ARCHITECTURE.md`.


