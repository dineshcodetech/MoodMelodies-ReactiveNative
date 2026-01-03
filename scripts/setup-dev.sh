#!/bin/bash

# Mood Melodies Development Environment Setup Script

set -e

echo "🎵 Mood Melodies - Development Setup"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo "Checking prerequisites..."

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js not found. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js $(node --version)${NC}"

# Check Python
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python not found. Please install Python 3.11+${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Python $(python3 --version)${NC}"

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker $(docker --version)${NC}"

# Check React Native CLI
if ! command -v react-native &> /dev/null; then
    echo -e "${YELLOW}⚠ React Native CLI not found. Installing...${NC}"
    npm install -g react-native-cli
fi
echo -e "${GREEN}✓ React Native CLI installed${NC}"

echo ""
echo "Installing dependencies..."

# Install signaling server dependencies
echo "📦 Installing signaling server dependencies..."
cd signaling-server
npm install
echo -e "${GREEN}✓ Signaling server dependencies installed${NC}"
cd ..

# Install translation service dependencies
echo "📦 Installing translation service dependencies..."
cd translation-service
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
echo -e "${GREEN}✓ Translation service dependencies installed${NC}"
cd ..

# Install mobile app dependencies
echo "📦 Installing mobile app dependencies..."
cd MoodMelodies
npm install
echo -e "${GREEN}✓ Mobile app dependencies installed${NC}"

# Install iOS pods (if on macOS)
if [[ "$OSTYPE" == "darwin"* ]]; then
    echo "📦 Installing iOS dependencies..."
    cd ios
    pod install
    cd ..
    echo -e "${GREEN}✓ iOS dependencies installed${NC}"
fi
cd ..

# Create environment files
echo ""
echo "Creating environment files..."

# Signaling server .env
if [ ! -f signaling-server/.env ]; then
    cp signaling-server/.env.example signaling-server/.env
    echo -e "${GREEN}✓ Created signaling-server/.env${NC}"
else
    echo -e "${YELLOW}⚠ signaling-server/.env already exists${NC}"
fi

# Translation service .env
if [ ! -f translation-service/.env ]; then
    cp translation-service/.env.example translation-service/.env
    echo -e "${GREEN}✓ Created translation-service/.env${NC}"
else
    echo -e "${YELLOW}⚠ translation-service/.env already exists${NC}"
fi

# Download translation models
echo ""
echo "Downloading translation models (this may take a while)..."
cd translation-service
source venv/bin/activate
python -c "
from transformers import MarianMTModel, MarianTokenizer
import os

models = [
    'Helsinki-NLP/opus-mt-en-hi',
    'Helsinki-NLP/opus-mt-hi-en'
]

cache_dir = './models'
os.makedirs(cache_dir, exist_ok=True)

for model_name in models:
    print(f'Downloading {model_name}...')
    MarianTokenizer.from_pretrained(model_name, cache_dir=cache_dir)
    MarianMTModel.from_pretrained(model_name, cache_dir=cache_dir)
    print(f'✓ Downloaded {model_name}')
"
deactivate
cd ..
echo -e "${GREEN}✓ Translation models downloaded${NC}"

# Start backend services
echo ""
echo "Starting backend services with Docker..."
cd infrastructure
docker-compose up -d
cd ..

# Wait for services to be ready
echo "Waiting for services to start..."
sleep 10

# Check service health
echo "Checking service health..."

# Check signaling server
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Signaling server is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Signaling server not responding${NC}"
fi

# Check translation service
if curl -f http://localhost:5000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Translation service is healthy${NC}"
else
    echo -e "${YELLOW}⚠ Translation service not responding${NC}"
fi

echo ""
echo -e "${GREEN}======================================${NC}"
echo -e "${GREEN}✅ Development environment setup complete!${NC}"
echo -e "${GREEN}======================================${NC}"
echo ""
echo "Next steps:"
echo ""
echo "1. Start the mobile app:"
echo "   cd MoodMelodies"
echo "   # For Android:"
echo "   npx react-native run-android"
echo "   # For iOS:"
echo "   npx react-native run-ios"
echo ""
echo "2. View backend logs:"
echo "   cd infrastructure"
echo "   docker-compose logs -f"
echo ""
echo "3. Stop backend services:"
echo "   cd infrastructure"
echo "   docker-compose down"
echo ""
echo "4. Run tests:"
echo "   cd signaling-server && npm test"
echo "   cd translation-service && pytest"
echo "   cd MoodMelodies && npm test"
echo ""
echo -e "${YELLOW}Happy coding! 🎵${NC}"


